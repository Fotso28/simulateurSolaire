# Déploiement — Vercel + Neon

Procédure pas à pas pour mettre en ligne le simulateur : deux projets Vercel depuis ce
monorepo (`web` = Angular, `api` = NestJS), base PostgreSQL Neon à Francfort, sauvegardes
hebdomadaires par GitHub Actions. Référence : `docs/PRD-TRD.md`, § « Sécurité, déploiement
et tests ».

```
navigateur ──► projet web (CDN Vercel, apps/web/vercel.json)
                 │  /*        → fichiers statiques Angular (repli SPA sur index.html)
                 │  /api/*    → réécriture vers le projet api (même origine : pas de CORS)
                 ▼
               projet api (fonction unique fra1, apps/api/vercel.json)
                 │  api/index.js → dist/apps/api/serverless.js (NestJS)
                 ▼
               Neon PostgreSQL (aws-eu-central-1, Francfort)
```

## Fichiers de configuration

| Fichier | Rôle |
|---|---|
| `apps/web/vercel.json` | Installation (npm 11), build `nx build web` puis `apps/web/scripts/vercel-output.mjs`. |
| `apps/web/scripts/vercel-output.mjs` | Génère au build la sortie Vercel (Build Output API v3, `apps/web/.vercel/output`) : réécriture `/api/*` vers `API_ORIGIN`, repli SPA, en-têtes de sécurité (CSP avec empreintes calculées), cache. |
| `apps/api/vercel.json` | Installation, build par `scripts/vercel-build.sh`, fonction unique `api/index.js` en `fra1`, réécriture de toutes les routes vers elle. |
| `apps/api/api/index.js` | Point d'entrée de la fonction : réexporte le handler NestJS construit (`dist/apps/api/serverless.js`). |
| `apps/api/scripts/vercel-build.sh` | `prisma generate` → `prisma migrate deploy` (→ seed facultatif) → `nx build api`. |
| `apps/api/scripts/firewall-rules.sh` | Règles de limitation de débit du pare-feu Vercel (CLI). |
| `.github/workflows/backup.yml` | `pg_dump` hebdomadaire + déclenchement manuel, artefact 90 jours. |

## 1. Prérequis

- Un compte Vercel (équipe) relié au compte GitHub qui héberge ce dépôt.
- Le dépôt sur GitHub, branche de production `main` (la CI `.github/workflows/ci.yml` y
  lance format, lint, tests, build et e2e API à chaque push).
- En local (facultatif, pour le pare-feu et les vérifications) : Vercel CLI ≥ 50
  (`npm i -g vercel`), `psql`/`pg_restore` 17.

## 2. Projet Vercel « api »

Créer l'API en premier : le projet web a besoin de son URL.

1. Vercel → **Add New… → Project** → importer le dépôt.
2. **Project Name** : `simulateur-solaire-api` (ce nom donne le domaine
   `simulateur-solaire-api.vercel.app`, à reporter dans la variable `API_ORIGIN` du projet
   web, voir § 3).
3. **Root Directory** : `apps/api`. Laisser cochée « Include files outside the root
   directory in the Build Step » (le build lit `package.json`, `node_modules` et `dist` à
   la racine du dépôt).
4. **Framework Preset** : *Other*. Ne rien saisir dans Build/Install/Output :
   `apps/api/vercel.json` les fixe (`installCommand`, `buildCommand`, `outputDirectory`).
5. **Settings → General → Node.js Version** : `22.x` (il n'y a pas de `package.json` dans
   `apps/api` pour le déduire).
6. Ne pas déployer tout de suite : brancher d'abord Neon (§ 4) et les variables (§ 5). Si
   un premier déploiement part quand même, il échouera proprement sur
   « DATABASE_URL_UNPOOLED absente ».

Région : `regions: ["fra1"]` (Francfort) dans `apps/api/vercel.json`, au plus près de
Neon. Vérifier aussi **Settings → Functions → Function Region** = `fra1` (la valeur du
fichier prime).

## 3. Projet Vercel « web »

1. **Add New… → Project** → même dépôt.
2. **Project Name** : `simulateur-solaire` (libre).
3. **Root Directory** : `apps/web`, « Include files outside the root directory » coché.
4. **Framework Preset** : *Other* (le fichier fixe `framework: null`, build Nx et sortie).
5. **Node.js Version** : `22.x`.
6. **Variable `API_ORIGIN`** (Settings → Environment Variables du projet web) : origine de
   l'API vers laquelle `/api/*` est relayé. Rien n'est codé en dur dans le dépôt ; le build
   échoue si elle manque.

   | Environnement | Valeur |
   |---|---|
   | Production | `https://simulateur-solaire-api.vercel.app` (ou `https://api.<votre-domaine>` après le § 7) |
   | Preview | `https://simulateur-solaire-api-git-{branch}-<équipe>.vercel.app` |

   `{branch}` est remplacé au build par la branche Git du déploiement (minuscules, tout
   caractère hors `a-z0-9` → `-`, comme les alias de branche Vercel) : la prévisualisation
   du web d'une branche parle à la prévisualisation de l'API de la **même branche**, elle-même
   reliée à sa branche Neon dédiée (§ 4). Une prévisualisation n'écrit donc jamais dans la
   base de production. Vercel abrège les alias de branche très longs : pour une telle
   branche, mettre une valeur Preview fixe propre à la branche (Environment Variables →
   *Preview* → *Branch*).
7. Aucune autre variable n'est nécessaire côté web (le front appelle `/api/v1` en relatif).
8. **Deploy**. Le build lance `nx build web --configuration=production` puis
   `node apps/web/scripts/vercel-output.mjs`, qui copie `dist/apps/web/browser` dans
   `apps/web/.vercel/output/static` et écrit `apps/web/.vercel/output/config.json`
   (Build Output API v3 : Vercel déploie ce dossier tel quel ; ignoré par Git). Vérification
   locale : `API_ORIGIN=https://exemple.test node apps/web/scripts/vercel-output.mjs`.

Ce que contient la configuration générée (`config.json`) :

- **Réécritures** : `/api/*` → `API_ORIGIN` ; tout le reste → `index.html` si aucun fichier
  statique ne correspond (routes Angular `/mode`, `/s/:token`, `/admin`…).
- **En-têtes de sécurité** (toutes les routes sauf `/api/*`, qui garde ceux de l'API/Helmet) :
  `Content-Security-Policy`, `Strict-Transport-Security` (2 ans), `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy`.
- **CSP** : tout en `'self'` (polices IBM Plex auto-hébergées dans `/fonts`, aucun CDN),
  images `data:`/`blob:` et `https://*.public.blob.vercel-storage.com` (icônes et images
  téléversées par le back-office), `connect-src 'self'` (API via la réécriture),
  `worker-src 'self'` (service worker), `frame-ancestors 'none'`, `object-src 'none'`.
  `style-src` autorise `'unsafe-inline'` (CSS critique incorporé par Angular et styles de
  composants). `script-src` n'autorise que `'self'` plus les empreintes sha256 des scripts
  et gestionnaires en ligne **trouvés dans l'`index.html` construit** (aujourd'hui le seul
  `onload="this.media='all'"` du chargement non bloquant de la feuille de style, d'où
  `'unsafe-hashes'`). Elles sont recalculées à chaque build : une montée d'Angular qui
  change ce code ne casse plus la CSP.
- **Cache** : `main-*.js`, `chunk-*.js`, `polyfills-*.js`, `styles-*.css` (noms hachés) →
  `public, max-age=31536000, immutable` ; `/fonts/*` 30 jours ; `/icons/*` 1 jour ;
  `index.html`, `ngsw-worker.js`, `ngsw.json`, `safety-worker.js`, `worker-basic.min.js`,
  `manifest.webmanifest` et le repli SPA → `no-cache, no-store, must-revalidate` (sinon le
  service worker ne voit pas les nouvelles versions) ; le reste → `no-cache`.

## 4. Base Neon (Francfort) et branches de prévisualisation

1. Vercel → projet **api** → **Storage** (ou Marketplace) → **Neon** → **Create**.
2. Région : **AWS Europe Central 1 (Frankfurt)** — la même zone que `fra1`. Plan selon le
   besoin (la durée de restauration à un instant donné en dépend).
3. **Connect to project** : `simulateur-solaire-api`, environnements **Production**,
   **Preview** et **Development**.
4. Options de l'intégration : activer **Create database branch for deployment → Preview**.
   Chaque déploiement de prévisualisation (une branche Git) reçoit alors sa propre branche
   Neon, copiée de la production, avec ses propres `DATABASE_URL*` injectées au build ;
   `vercel-build.sh` y applique les migrations de la branche, sans toucher à la production.
   Activer aussi la suppression automatique des branches Neon des branches Git supprimées
   (option de l'intégration) pour ne pas accumuler de branches.

   **Règle : aucune prévisualisation n'écrit en production.** Concrètement :
   - les `DATABASE_URL*` de l'environnement *Preview* du projet api sont **uniquement**
     celles injectées par l'intégration (branche Neon de la branche Git) : ne jamais copier
     à la main l'URL de production dans *Preview* ;
   - si l'option de branche par déploiement n'est pas disponible (plan, quota), créer dans
     Neon une branche unique `preview` (Branches → New branch, parent `main`), et mettre ses
     chaînes poolée / directe dans `DATABASE_URL` / `DATABASE_URL_UNPOOLED` en *Preview*
     seulement. La réinitialiser depuis `main` quand nécessaire (Branches → Reset from parent) ;
   - côté web, `API_ORIGIN` *Preview* vise l'API de prévisualisation (§ 3, `{branch}`), jamais
     le domaine de production ;
   - les branches Neon de prévisualisation contiennent une copie des données de production
     (comptes, demandes de devis) : leur accès est aussi sensible que la production.
5. L'intégration crée notamment `DATABASE_URL` (connexion **poolée**, PgBouncer : utilisée
   par l'application via Prisma `url`) et `DATABASE_URL_UNPOOLED` (connexion **directe** :
   utilisée par `prisma migrate deploy` via `directUrl`, et par `pg_dump`). Ce sont
   exactement les noms attendus par `apps/api/prisma/schema.prisma`.

Mise en veille : Neon suspend le calcul après inactivité ; la première requête suivante est
plus lente (quelques centaines de ms). Le calcul de dimensionnement tournant dans le
navigateur, l'utilisateur ne le ressent pas.

## 5. Variables d'environnement du projet api

Vercel → projet **api** → **Settings → Environment Variables**. Liste complète
(`apps/api/.env.example`, validée au démarrage par `apps/api/src/app/config/env.ts`) :

| Variable | Production | Preview | Valeur / remarque |
|---|---|---|---|
| `DATABASE_URL` | ✔ | ✔ | Créée par l'intégration Neon (poolée). Ne pas saisir. |
| `DATABASE_URL_UNPOOLED` | ✔ | ✔ | Créée par l'intégration Neon (directe). Ne pas saisir. |
| `JWT_ACCESS_SECRET` | ✔ | ✔ | ≥ 32 caractères aléatoires : `openssl rand -base64 48`. Valeur différente en Preview. |
| `IP_HASH_SECRET` | ✔ | ✔ | ≥ 16 caractères : `openssl rand -base64 32` (HMAC des IP des demandes de devis). |
| `COOKIE_SECURE` | `true` | `true` | Cookie de renouvellement `Secure` (HTTPS partout). |
| `CORS_ORIGINS` | `https://<domaine-web>` | `https://<projet-web>-git-*…` ou vide | Liste séparée par des virgules. Le front passe par la réécriture (même origine) : seul l'accès direct d'une autre origine en a besoin. Mettre le domaine public (ex. `https://simulateur.example.com,https://simulateur-solaire.vercel.app`). |
| `STORAGE_DRIVER` | `vercel-blob` | `vercel-blob` | Téléversements du back-office (icônes, images). |
| `BLOB_READ_WRITE_TOKEN` | ✔ | ✔ | Créée en reliant un **Blob store** au projet api (Storage → Blob → Create → Connect). Région du store : Francfort. |
| `PUBLIC_MEDIA_BASE_URL` | — | — | Utilisée seulement avec `STORAGE_DRIVER=local` ; laisser vide. |
| `SEED_ADMIN_EMAIL` | ✔ | — | E-mail du compte ADMIN initial (créé par le seed s'il n'existe pas). |
| `SEED_ADMIN_PASSWORD` | ✔ | — | Mot de passe initial fort, à changer dès la première connexion (back-office → Comptes). Supprimer la variable ensuite. |
| `SEED_ON_BUILD` | `1` au premier déploiement | — | Lance le seed idempotent dans le build (voir § 6). Retirer ensuite (sans risque si oublié : le seed n'écrase rien). |
| `SKIP_DB_MIGRATIONS` | — | — | `1` uniquement pour un build sans base (dépannage). |
| `NODE_ENV` | — | — | Fixée à `production` par Vercel. |
| `NX_NO_CLOUD` | — | — | Déjà fixée par les commandes de build. |

Conseil : marquer `JWT_ACCESS_SECRET`, `IP_HASH_SECRET`, `SEED_ADMIN_PASSWORD` comme
**Sensitive**.

## 6. Migrations et seed

- **Migrations** : à chaque build du projet api, `apps/api/scripts/vercel-build.sh` lance
  `prisma generate` puis `prisma migrate deploy` (connexion directe
  `DATABASE_URL_UNPOOLED`) sur la base de l'environnement : la production pour `main`, la
  branche Neon dédiée pour une prévisualisation. Une migration en échec fait échouer le
  build : l'ancien déploiement reste en ligne. Les migrations doivent rester compatibles
  avec la version précédente du code (ajouts de colonnes nullables, pas de suppression dans
  la même version) car elles s'appliquent avant la bascule du trafic.
- **Seed (premier déploiement)** : mettre `SEED_ON_BUILD=1` (Production), déployer, vérifier
  la connexion admin, puis retirer `SEED_ON_BUILD` et `SEED_ADMIN_PASSWORD`. Le seed
  (`apps/api/src/seed`) insère pays, régions, catalogue et jeu de paramètres par défaut,
  uniquement les lignes absentes : il n'écrase jamais les modifications faites dans le
  back-office.
- **Alternative locale** (sans redéployer) :

  ```bash
  cd apps/api && vercel link && vercel env pull ../../apps/api/.env.production.local --environment=production
  cd ../.. && set -a && . apps/api/.env.production.local && set +a
  npx prisma migrate deploy && npx nx run api:seed
  rm apps/api/.env.production.local
  ```

- Ne jamais lancer `nx run api:db-reset` / `prisma migrate reset` sur Neon (destructif).

## 7. Domaine

1. Projet **web** → **Settings → Domains** → ajouter `simulateur.<domaine>` (et l'apex si
   besoin, avec redirection de l'un vers l'autre). Suivre les enregistrements DNS indiqués
   (CNAME `cname.vercel-dns.com` ou A pour l'apex). Certificat HTTPS automatique.
2. Facultatif : projet **api** → domaine `api.<domaine>`, puis remplacer l'URL de
   destination dans `apps/web/vercel.json` et commiter.
3. Mettre à jour `CORS_ORIGINS` (projet api) avec le domaine public, puis redéployer l'api.
4. HSTS est envoyé dès le premier déploiement (2 ans, sous-domaines inclus) : vérifier que
   tous les sous-domaines servent bien du HTTPS avant d'ajouter `preload`.

## 8. Pare-feu : limitation de débit

Un compteur en mémoire ne tient pas entre instances serverless : la limitation de débit des
routes publiques d'écriture est portée par le **pare-feu Vercel (WAF)**. `vercel.json` ne
sait exprimer que des actions `deny`/`challenge`, pas `rate_limit` : les règles se créent
donc par la CLI (script fourni) ou le tableau de bord.

| Règle | Conditions | Limite | Dépassement |
|---|---|---|---|
| Limite POST simulations | chemin = `/api/v1/simulations` ET méthode = `POST` | 20 / 60 s par IP (fenêtre fixe) | 429 |
| Limite POST leads | chemin = `/api/v1/leads` ET méthode = `POST` | 5 / 600 s par IP (fenêtre fixe) | refus (403) pendant 15 min |

Les créer sur les **deux** projets : `web` (entrée publique, l'IP client y est connue) et
`api` (accès direct à `*.vercel.app`).

**Par la CLI** (Vercel CLI ≥ 50) :

```bash
vercel login
(cd apps/web && vercel link)   # choisir le projet web
(cd apps/api && vercel link)   # choisir le projet api
apps/api/scripts/firewall-rules.sh apps/web
apps/api/scripts/firewall-rules.sh apps/api
```

Le script crée les deux règles en brouillon, les publie (`vercel firewall publish`) et
affiche la liste.

**Par le tableau de bord** (équivalent) : projet → **Firewall → Configure → New Rule** :

1. Nom `Limite POST simulations`.
2. **If** `Request Path` `Equals` `/api/v1/simulations` **AND** `Method` `Equals` `POST`.
3. **Then** `Rate Limit` → *Fixed Window*, `60` secondes, `20` requêtes, clé `IP Address`,
   action au dépassement `Too Many Requests (429)`.
4. **Save Rule** ; recommencer pour `Limite POST leads` (`/api/v1/leads`, `600` s, `5`
   requêtes, action `Deny`, durée `15 minutes`).
5. **Review Changes → Publish**.

Le nombre de règles de limitation dépend du plan Vercel : si le plan n'en autorise qu'une,
créer une seule règle avec deux groupes (`OR`) — chemin `/api/v1/simulations` ou
`/api/v1/leads`, méthode `POST` — à 10 requêtes / 60 s par IP.

Contrôle : `vercel firewall rules list` ; puis le test du § 10.

## 9. Sauvegardes et restauration

Deux niveaux :

1. **Neon, restauration à un instant donné** (*point-in-time restore*) : console Neon →
   projet → **Branches → main → Restore** (ou **Backup & Restore**), choisir l'horodatage
   (fenêtre selon le plan). Préférer restaurer dans une **nouvelle branche**, vérifier, puis
   basculer : soit en restaurant `main` depuis cette branche, soit en pointant
   temporairement les variables `DATABASE_URL*` du projet api vers elle et en redéployant.
2. **Export hebdomadaire hors de Neon** : `.github/workflows/backup.yml`.
   - Secret à créer : GitHub → **Settings → Secrets and variables → Actions → New
     repository secret** `DATABASE_URL_UNPOOLED` = connexion **directe** de la branche Neon
     de production (console Neon → **Connect** → décocher *Connection pooling*), avec
     `?sslmode=require`. Idéalement un rôle Neon en lecture seule dédié.
   - Déclenchement : chaque lundi à 02:17 UTC, ou manuellement (**Actions → Sauvegarde
     base → Run workflow**).
   - Résultat : artefact `pg-dump-<horodatage>` (format personnalisé `pg_dump -Fc`,
     compressé, vérifié par `pg_restore --list`), conservé **90 jours** (la rétention
     maximale des artefacts du dépôt doit être ≥ 90 : Settings → Actions → General).
   - Client `pg_dump` 17 (dépôt PGDG) : doit être ≥ à la version du serveur Neon. Si Neon
     passe à PostgreSQL 18, remplacer `17` par `18` dans le workflow.
   - Restauration d'un export (de préférence dans une branche Neon vide) :

     ```bash
     # Télécharger l'artefact (Actions → exécution → Artifacts) puis :
     unzip pg-dump-*.zip
     pg_restore --dbname "$DATABASE_URL_UNPOOLED_CIBLE" --clean --if-exists \
       --no-owner --no-privileges simulateur-*.dump
     ```

     Puis vérifier `SELECT count(*) FROM simulation;` et `_prisma_migrations`, et
     redéployer l'api si besoin (`prisma migrate deploy` ne rejoue que les migrations
     manquantes).

Tester une restauration au moins une fois avant le lancement.

## 10. Vérifications après déploiement

Remplacer `$WEB` par l'URL publique (ex. `https://simulateur.example.com`) et `$API` par
celle du projet api.

```bash
# API, directement puis via la réécriture du projet web
curl -fsS "$API/api/v1/health"
curl -fsS "$WEB/api/v1/health"
curl -fsSI "$WEB/api/v1/catalog" | grep -i -E '^(etag|cache-control)'

# En-têtes de sécurité et cache
curl -sSI "$WEB/" | grep -i -E 'content-security-policy|strict-transport|x-frame|cache-control'
curl -sSI "$WEB/ngsw-worker.js" | grep -i cache-control      # no-cache, no-store
curl -sSI "$WEB/$(curl -s $WEB/ | grep -o 'main-[A-Za-z0-9_-]*\.js')" | grep -i cache-control  # immutable

# Repli SPA (200 + index.html)
curl -sS -o /dev/null -w '%{http_code}\n' "$WEB/mode"

# Pare-feu : la 21e requête de la minute doit répondre 429
for i in $(seq 1 25); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST -H 'Content-Type: application/json' -d '{}' "$WEB/api/v1/simulations"
done; echo
```

Dans le navigateur (Chrome, profil vierge, écran 360 px) :

- [ ] Parcours particulier complet, résultat affiché, aucune erreur CSP dans la console.
- [ ] **Application → Service workers** : `ngsw-worker.js` actif ; passer **hors ligne** et
      recharger : l'application et le PDF fonctionnent toujours.
- [ ] Partage : le lien `/s/<jeton>` s'ouvre dans une autre session.
- [ ] Demande de devis : envoi OK, ligne visible dans le back-office.
- [ ] `/admin` : connexion avec le compte initial, changement du mot de passe, téléversement
      d'une icône (Blob) visible dans le parcours.
- [ ] Vercel → projet api → **Logs / Observability** : pas d'erreur au démarrage ;
      **Functions** : région `fra1`.
- [ ] Neon → **Branches** : une branche par prévisualisation ouverte.
- [ ] GitHub → **Actions → Sauvegarde base → Run workflow** : artefact produit.

## Taille de la fonction api

Limite Vercel : 250 Mo (non compressé) par fonction. Mesure du 24/10/2026 avec
`@vercel/nft` (même traceur que Vercel) depuis `apps/api/api/index.js` : **≈ 83 Mo,
2 080 fichiers**, dont moteurs Prisma ≈ 35 Mo (`rhel-openssl-3.0.x` pour Vercel + natif du
poste de build), libvips de sharp ≈ 19 Mo (×2 en local glibc + musl ; une seule variante
sur Vercel), le reste < 1 Mo par paquet. Marge confortable ; à surveiller si l'on ajoute des
dépendances natives (garder svgo seul pour les SVG, pas de jsdom/DOMPurify).

## Dépannage

- **Build api : « DATABASE_URL_UNPOOLED absente »** : intégration Neon non reliée à cet
  environnement (§ 4).
- **Build : erreur de lockfile npm** : l'installation exige npm 11 (`npx npm@11.6.2 ci`,
  déjà dans `installCommand`).
- **`/api/*` en 404 ou 502 depuis le web** : URL de destination de `apps/web/vercel.json`
  erronée (§ 3, point 6) ou projet api non déployé.
- **Page sans style / erreur CSP `script-src`** : l'empreinte du gestionnaire `onload` a
  changé (§ 3) ; recalculer et mettre à jour la CSP.
- **Prisma : « Query engine library … rhel-openssl-3.0.x not found »** : vérifier
  `binaryTargets` dans `schema.prisma` et que `prisma generate` s'exécute bien au build.
