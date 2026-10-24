# Avancement

| Lot | État | Session |
|---|---|---|
| L0 | terminé | L0 |
| L1 | terminé | L1 |
| L2 | terminé | L2 |
| L3 | terminé | L3 |
| L4 | à faire | |
| L5 | à faire | |
| L6 | à faire | |

## Notes par lot

### L0 — Monorepo et squelettes (terminé)

**Fait**
- Monorepo Nx 23.3.1 (npm, mode « intégré » avec alias TS dans `tsconfig.base.json`, pas de workspaces npm).
  Projets : `web`, `api`, `engine`, `shared-types`. Alias `@simulateur/engine`, `@simulateur/shared-types`.
- `apps/web` : Angular 22.1 (standalone, zoneless par défaut, builder esbuild `@angular/build`), Angular CDK 22.1,
  Tailwind CSS 4 (config CSS-first : jetons dans `@theme` de `apps/web/src/styles.css`, PostCSS via `apps/web/.postcssrc.json`).
  Polices IBM Plex Sans / Mono chargées depuis Google Fonts dans `index.html` (à auto-héberger pour le hors-ligne, L5).
  Routes : `/` (HomePage), `/mode`, `/besoins`, `/autonomie`, `/resultat`, `/configurateur`, `/s/:shareToken`
  (toutes en `loadComponent` vers `shared/placeholder-page.ts`), `/admin` en `loadChildren` (`features/admin/admin.routes.ts`).
  Proxy de dev `apps/web/proxy.conf.json` : `/api` → `http://localhost:3000`.
- `apps/api` : NestJS 11 (webpack Nx), préfixe global `api/v1` (`apps/api/src/app/constants.ts`), `GET /api/v1/health` → `{ status: 'ok', timestamp }`.
  Pas de Prisma (L2).
- `libs/shared-types` : `SimulationInput`, `SimulationResult` (copie exacte du TRD), `CableSegment` + `CABLE_SEGMENTS`,
  alias `SimulationMode`, `BatteryTech`, `SystemVoltage`, `AlertLevel` ; données de référence `Country`, `Region`, `DeviceCategory`,
  `Device`, `PanelModel`, `BatteryModel`, `InverterModel`, `ControllerModel`, `CableSection`, `ProtectionRating`,
  `ParameterSet` (+ `EngineParameters` pour `values`) et `Catalog` (agrégat passé au moteur / réponse `/catalog`).
- `libs/engine` : `simulate(input: SimulationInput, catalog: Catalog, params: ParameterSet): SimulationResult` lève
  « simulate : non implémenté » ; `ENGINE_VERSION = '0.0.0'`. Aucune dépendance (ni tslib : `importHelpers: false`),
  imports de types uniquement depuis shared-types.
- Jest 30 partout (cibles `test` inférées par `@nx/jest/plugin`), ESLint 9 flat config (cibles `lint` inférées par `@nx/eslint/plugin`),
  Prettier 3 (`singleQuote`).
- Scripts racine : `lint`, `test`, `build`, `start:web`, `start:api`, `format`, `format:check`.
- CI `.github/workflows/ci.yml` (push + PR) : npm 11, `npm ci`, `nx format:check --all`, lint, test, build.

**Versions** : Node 22, npm 11.6.2, TypeScript 6.0, Nx 23.3.1, Angular 22.1, NestJS 11, Tailwind 4.3, Jest 30.

**Conventions décidées**
- Vérification : `npx nx run-many -t lint test build` (passe intégralement) ; formatage : `npx nx format:write`.
- **npm 11 obligatoire** : npm 10 plante (`edgesOut`) à l'installation et refuse le lockfile en `npm ci`.
- TypeScript 6 : pas de `baseUrl` (déprécié), `moduleResolution: bundler` dans `tsconfig.base.json`.
- Jetons Tailwind (classes) : `bg`, `surface`, `surface-2`, `line`, `line-strong`, `muted`, `ink`, `ink-2`, `solar`, `solar-soft`,
  `solar-ink`, `action`, `ok|warn|crit|info` + `-soft` + `-ink` ; textes `text-key|h1|h2|body|small|mono` ;
  rayons `rounded-sm|md|lg|xl` = 8/10/12/14 px. Ex. `bg-bg text-ink`, `bg-action text-white`, `bg-crit-soft text-crit-ink`.
- Noms de champs des données de référence : anglais camelCase (`irradiationAvg`, `powerTypW`, `dutyCycle`, `capacityAh`…).
  L1/L2 peuvent les ajuster si besoin, en le notant ici.
- `simulate` prend un `ParameterSet` complet (pour renseigner `paramsVersion`) ; L1 peut changer ce choix.

**Reste à faire / écarts** : aucun pour L0. Les `@nx/...:convert-to-inferred` ont été appliqués (executors dépréciés supprimés).

### L1 — Moteur de calcul et données de référence (terminé)

**Fait**
- `libs/engine` : `simulate(input, catalog, params)` pur (étapes 1 à 9 du TRD), fourchette min/max (mode particulier
  par appareils), variantes d'autonomie (seules les batteries changent), forçages `overrides`, couverture solaire,
  alertes, `engineVersion` (`ENGINE_VERSION = '1.0.0'`) et `paramsVersion` (= `params.version`). ~0,3 ms par simulation.
- Données par défaut exportées (`libs/engine/src/data/`) : `DEFAULT_CATALOG` (= `DEFAULT_COUNTRIES`, `DEFAULT_REGIONS`,
  `DEFAULT_DEVICE_CATEGORIES`, `DEFAULT_DEVICES`, `DEFAULT_PANELS`, `DEFAULT_BATTERIES`, `DEFAULT_INVERTERS`,
  `DEFAULT_CONTROLLERS`, `DEFAULT_CABLE_SECTIONS`, `DEFAULT_PROTECTION_RATINGS`), `DEFAULT_PARAMETER_SET` (v1) et
  `DEFAULT_ENGINE_PARAMETERS`. Identifiants stables en slugs anglais : régions `cm-littoral`…, appareils `led-bulb`,
  `fridge`… (`iconKey` = id ; catégories `lighting`, `cooling`…), matériel `panel-450`, `bat-li-24v-200ah`,
  `inv-sa-24v-1000` (autonome) / `inv-hy-48v-5000` (hybride), `mppt-80a-250v`, `pwm-30a-50v`.
- Tests : 101 tests, couverture 100 % lignes / 95 % branches, seuil 90 % configuré dans `jest.config.cts`
  (`collectCoverage: true`). Cas de Douala ligne à ligne à 1 % (variantes comprises) + 3 cas calculés à la main
  dans `libs/engine/TEST_CASES.md` (48 V avec climatiseur, pro en puissance totale + hybride, plomb/gel avec fourchette).
- `libs/shared-types` (ajouts **facultatifs** uniquement, rien de cassé) : `iconKey?` sur `Device` / `DeviceCategory`,
  `label?` sur `BatteryModel` / `InverterModel` / `ControllerModel`, paramètres facultatifs dans `EngineParameters`
  (`simultaneity`, `totalsSurgeFactor`, `pvVocSafetyFactor`, `pvMinVoltageFactor`, `voltageThresholds`,
  `pvCableMinSectionMm2`, `heavyDeviceThresholdW`, `minAutonomyDays` — complétés par défaut via `resolveParameters`),
  `loadIndex?` sur les alertes (index de la ligne `input.loads` concernée par `HEAVY_DEVICE`).

**API publique du moteur (`@simulateur/engine`)**
- `simulate(input, catalog, params: ParameterSet): SimulationResult` — lève `EngineError { code, message }`
  (codes : `INVALID_INPUT`, `REGION_NOT_FOUND`, `DEVICE_NOT_FOUND`, `OVERRIDE_NOT_FOUND`, `NO_LOADS`, `ZERO_ENERGY`,
  `NO_PANEL`, `NO_COMPATIBLE_INVERTER`, `NO_COMPATIBLE_CONTROLLER`, `NO_COMPATIBLE_BATTERY`, `NO_CABLE_SECTION`,
  `NO_PROTECTION_RATING` ; message français affichable).
- Configurateur : `inverterNeighbors`, `storageNeighbors`, `panelCountNeighbors(input, catalog, params, current?)`
  → `{ lower?, upper? }` dont le contenu (`{ inverterId }`, `{ batteryModelId, batteryParallel }`, `{ panelCount }`)
  se fusionne dans `input.overrides` avant de rappeler `simulate`.
- Récapitulatif particulier : `computeDailyEnergy(loads, catalog, mode?)` → `{ min, typ, max, perLoad[] }`.
- Divers : `ALERTS` (codes `INVERTER_UNDERSIZED`, `AUTONOMY_BELOW_ONE_NIGHT`, `PV_COVERAGE_LOW`, `HEAVY_DEVICE`,
  `RAINY_SEASON` + messages du TRD), `resolveParameters`, `neighborAutonomySteps`, `selectSystemVoltage`,
  `layoutStrings`, `voltageDropSection`, `protectionRating`, `ENGINE_VERSION`.
- **API (L2)** : seed = `DEFAULT_CATALOG` + `DEFAULT_PARAMETER_SET` ; au rejeu, construire un `Catalog` depuis la base
  (matériel `active` ou non : le moteur filtre lui-même sur `active`, sauf pour les ids forcés) et passer le
  `ParameterSet` de la version stockée ; traduire `EngineError` en 422 avec `code` + `message`.
- **Front (L3+)** : `simulate` tourne localement (catalogue de `/catalog`, ou `DEFAULT_CATALOG` hors-ligne) ;
  `pvCoverage` et `effectiveAutonomyDays` sont des ratios (1,15 = 115 %) ; protections : `type` stable
  (`dc_disconnect`, `dc_surge_arrester`, `string_fuse`, `controller_battery_fuse`, `battery_fuse`, `ac_breaker`,
  `rcd_30ma`, `ac_surge_arrester`, `earthing`, `mounting_structure`), `ratingA = 0` quand sans calibre.

**Écarts et choix (TRD ambigu ou incohérent → interprétation prudente)**
- Protection batterie / disjoncteur de sortie : le TRD écrit « 1,25 × I » mais le cas de référence donne 63 A pour
  57,9 A (marge déjà dans I). La marge 1,25 n'est donc appliquée qu'une fois (dans le courant du tronçon).
- Ajout d'un fusible régulateur → batteries (calibre ≥ I_reg) non listé par le TRD, et coordination câble /
  protection : l'intensité admissible du câble doit couvrir aussi le calibre de sa protection.
- Table d'intensités admissibles : cuivre PR/XLPE, pose C (câbles solaires et batteries) — 10 mm² = 80 A, ce qui
  retrouve les 10 mm² du cas de Douala ; la table reste modifiable par l'administrateur.
- Chaînes : parmi les N_s valides, le moteur retient le moins de panneaux (N_s × N_p), puis le plus grand N_s
  (le TRD littéral, « plus grand N_s puis arrondi », passerait par ex. de 5 à 8 panneaux). Identique au TRD quand
  N_pan ≤ N_s,max. Les contrôles courant d'entrée (N_p × I_sc × 1,25) et I_reg font partie du choix.
- Onduleur hybride : MPPT intégré vérifié (I_reg ≤ courant MPPT, tension), pas de courant d'entrée au catalogue
  (non contrôlé) ; on prend le plus petit hybride qui couvre la puissance **et** accepte le champ. Pas de tronçon
  régulateur → batteries ; le câble batteries → onduleur porte max(I décharge, I_reg).
- Tension automatique : si aucun matériel (onduleur, régulateur, batterie) n'existe à la tension choisie, le moteur
  essaie la tension supérieure ; tension imposée ou onduleur forcé → erreur explicite. Avec un forçage de batterie ou
  de panneaux, la tension reste celle de la proposition automatique (le configurateur ne change jamais la tension).
- Paramètres « par modèle » (`InverterModel.surgeFactor/efficiency`, `BatteryModel.dod`) : le moteur utilise les
  paramètres globaux du TRD (f_s, η, DoD par technologie) ; une batterie forcée prend la DoD de sa technologie.
- Régulateurs : seuls les MPPT sont utilisés (formules du TRD) ; les PWM restent au catalogue.
- Mode particulier : une puissance saisie (`powerW`) remplace la fourchette (min = typ = max) ; en pro sans
  puissance saisie, P_typ. Un appareil est « lourd » si sa puissance typique > 1 500 W (fer, bouilloire,
  chauffe-eau, clim 2 CV). `totals` prime sur `loads` s'il est fourni. Simultanéité appliquée à P_inst (mode appareils).
- Fourchette : bornes min/max dimensionnées sans forçages ; si une borne n'a pas de matériel compatible, elle ne
  contient que `energyWhPerDay`. Variantes : ignorent `batteryParallel` forcé mais gardent `batteryModelId`.
- Plomb/gel : blocs 12 V (100–250 Ah) montés en série pour 24 et 48 V. Ensoleillement du mois le plus faible des
  régions : estimation indicative (moyenne − 0,9 à 1,2), à remplacer avec les données PVGIS / NASA POWER.

**Reste à faire** : aucun pour L1.

### L2 — API NestJS, Prisma, auth, back-office (terminé)

**Fait**
- Prisma 6 + PostgreSQL : `apps/api/prisma/schema.prisma` (`url = DATABASE_URL`, `directUrl = DATABASE_URL_UNPOOLED`,
  `binaryTargets` natif + `rhel-openssl-3.0.x` pour Vercel), migrations dans `apps/api/prisma/migrations`.
  Modèles anglais camelCase, tables/colonnes `@@map` snake_case. Les 14 tables du TRD **+ 2 tables documentées** :
  `lead` (RF-18 : nom, téléphone, e-mail?, ville?, message?, `simulation_id?`, `consent_at`, `ip_hash` HMAC-SHA256)
  et `refresh_token` (jetons de renouvellement hachés SHA-256, rotation). Colonnes ajoutées hors TRD :
  `admin_user.failed_logins/locked_until/created_at`, `parameter_set.created_at`, `cable_section.id` et
  `protection_rating.id` (clé technique), `icon_key` (appareils, catégories) et `label` (batteries, onduleurs,
  régulateurs) pour suivre les ajouts facultatifs de L1. Version de paramètres active = `active_since` le plus récent.
- Seed idempotent (`apps/api/src/seed`) : `DEFAULT_CATALOG` + `DEFAULT_PARAMETER_SET.values` de `@simulateur/engine`,
  n'insère que les lignes absentes (jamais d'écrasement des modifications admin) ; compte ADMIN depuis `SEED_ADMIN_*`.
- Routes publiques `/api/v1` : `GET /health`, `GET /countries` (pays + `regions[]`), `GET /catalog` (ETag + 304),
  `POST /simulations`, `GET /simulations/:shareToken`, `POST /leads`.
- `POST /simulations` : corps `{ input: SimulationInput, result: SimulationResult }`. Validation stricte de `input`
  (DTO miroir), région existante, `result.paramsVersion` = version de paramètres existante (active ou non), rejeu
  `simulate()` avec le catalogue de la base (matériel actif **et** inactif, le moteur filtre), comparaison récursive
  à 1 % (nombres) / égalité (le reste), `engineVersion` ignorée. Divergence → 422 `RESULT_MISMATCH` (`field` =
  `result.<chemin>`), `EngineError` → 422 avec le `code` du moteur. Stocke `inputs` (sans `overrides`), `overrides`,
  le résultat **rejoué** (JSONB), versions, `share_token` = 18 octets aléatoires base64url (24 car.). Réponse
  `201 { shareToken }`. `GET /simulations/:shareToken` → `{ shareToken, input (overrides réintégrés), result,
  engineVersion, paramsVersion, createdAt }` (pas d'id interne).
- `POST /leads` : `{ name, phone, email?, city?, message?, shareToken?, consent: true }` → `201 { id, createdAt }` ;
  `consent` ≠ `true` → 400 `VALIDATION_ERROR` (`field: consent`).
- Auth : `POST /auth/login` → `{ accessToken, expiresIn: 900, user: { id, email, role } }` + cookie `refresh_token`
  (httpOnly, SameSite=Strict, Path=`/api/v1/auth`, Secure si `COOKIE_SECURE`, 7 jours) ; `POST /auth/refresh`
  (rotation ; rejouer un jeton déjà utilisé révoque toute la session) ; `POST /auth/logout` (204). JWT HS256 15 min
  (`Authorization: Bearer`), argon2id, verrouillage 15 min au 5e échec (423 `ACCOUNT_LOCKED`), message générique
  sinon (401 `INVALID_CREDENTIALS`). Garde global : seules les routes `@Roles(...)` exigent un jeton.
- Admin (toute écriture → `audit_log` avant/après dans la même transaction, hachages exclus) :
  - ADMIN + EDITEUR : `/admin/device-categories` (GET, GET/:id, POST, PATCH/:id, DELETE/:id si vide → sinon 409
    `CATEGORY_NOT_EMPTY`), `/admin/devices` (GET `?categoryId&includeInactive=true`, GET/:id, POST, PATCH/:id,
    DELETE/:id = désactivation logique), `POST /admin/media` (multipart `file` + `kind` = `icon` | `image`).
  - ADMIN : `/admin/countries`, `/admin/regions` (`?countryId`), `/admin/equipment/{panels,batteries,inverters,
    controllers,cable-sections,protection-ratings}` (GET, GET/:id, POST, PATCH/:id ; désactivation via
    `PATCH { active: false }`), `/admin/parameter-sets` (GET avec `active`, GET/:id, POST `{ values, baseVersion? }`
    = nouvelle version inactive fusionnée sur la base complétée par `resolveParameters`, clés/forme contrôlées),
    `POST /admin/parameter-sets/:id/activate`, `/admin/users` (GET, POST `{ email, role, password }`, PATCH
    `{ role?, active?, password? }` ; pas d'auto-désactivation/rétrogradation ; révocation des sessions),
    `GET /admin/stats/simulations?from&to` (`total, byMode, byRegion[], perDay[], topDevices[]`, 30 j par défaut),
    `GET /admin/audit-log?entity&entityId&adminUserId&action&page&pageSize` (`{ items, total, page, pageSize }`).
- Médias : type réel par signature (PNG/JPEG/WebP/GIF/SVG), > 2 Mo → 413 `FILE_TOO_LARGE` ; icône = SVG nettoyé
  (svgo `preset-default` + `removeScripts` + plugin maison : éléments actifs, `on*`, liens non `#`, `<style>`) ;
  image = WebP 512×512 (`contain`, fond transparent) ≤ 80 Ko via sharp. Réponse `{ url, key, kind, contentType, size }`.
  Stockage abstrait `MediaStorage` : `LocalMediaStorage` (dev/tests, servi sur `/media`) ou `VercelBlobStorage`.
- Transverse : `ValidationPipe` (whitelist, forbidNonWhitelisted, transform), erreurs `{ code, message (FR), field? }`
  partout (filtre global, erreurs Prisma P2002 → 409 `ALREADY_EXISTS`, P2025 → 404, P2003 → 409), Helmet,
  CORS limité à `CORS_ORIGINS` (credentials), cookie-parser, JSON ≤ 256 Ko, `trust proxy`, env validée au démarrage.
- Vercel : `apps/api/src/serverless.ts` → `dist/apps/api/serverless.js` (export par défaut `(req, res)`, app Nest
  créée une fois par instance) ; `nx serve api` inchangé (`main.ts`). Configuration Vercel/`vercel.json` : L5.
- Tests : 25 unitaires (`nx test api` : comparaison 1 %, format d'erreur, env, médias, paramètres, AuthService)
  et 31 e2e Supertest sur vraie base (`nx run api:e2e` : public, ETag/304, rejeu réel + divergence, erreurs moteur,
  leads/IP, CORS, auth/rotation/verrouillage, rôles 401/403, CRUD + audit, médias, versions de paramètres, comptes,
  stats, journal, seed idempotent). CI : service `postgres:16` + étape « Tests e2e API ».

**Variables d'environnement** (`apps/api/.env.example`, chargé automatiquement par Nx depuis `apps/api/.env`) :
`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DATABASE_URL_TEST`, `JWT_ACCESS_SECRET` (≥ 32 car.), `COOKIE_SECURE`,
`CORS_ORIGINS` (liste séparée par des virgules), `IP_HASH_SECRET` (≥ 16), `STORAGE_DRIVER` (`local`|`vercel-blob`),
`LOCAL_MEDIA_DIR`, `PUBLIC_MEDIA_BASE_URL`, `BLOB_READ_WRITE_TOKEN`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `PORT`.

**Commandes DB**
- PostgreSQL local (Ubuntu) : `sudo apt install postgresql` puis `sudo service postgresql start` ;
  `sudo -u postgres psql -c "CREATE USER simulateur WITH PASSWORD 'simulateur' CREATEDB;"` ;
  `sudo -u postgres createdb -O simulateur simulateur_dev && sudo -u postgres createdb -O simulateur simulateur_test` ;
  `cp apps/api/.env.example apps/api/.env`.
- `npx prisma generate` (lancé par `postinstall`), `npx nx run api:migrate` (= `prisma migrate dev`),
  `npx nx run api:migrate-deploy` (production/CI), `npx nx run api:seed` (= `npm run db:seed`),
  `npx nx run api:db-reset` (dev uniquement, destructif), `npx nx run api:e2e` (applique les migrations sur
  `DATABASE_URL_TEST` puis vide les tables à chaque suite).

**Contrat de `GET /catalog` pour le front** : `CatalogResponse = Catalog & { parameterSet: ParameterSet }`
(type exporté par `apps/api/src/app/catalog/catalog.service.ts` ; à recopier ou à déplacer dans shared-types si
besoin). Contient les pays, **toutes** les régions, catégories, appareils **actifs**, matériel **actif**, sections
de câbles, protections et le jeu de paramètres actif. En-têtes `ETag` (empreinte SHA-256 du corps) et
`Cache-Control: no-cache` ; renvoyer `If-None-Match` → `304` sans corps. Passer `parameterSet` tel quel à
`simulate(input, catalog, parameterSet)` puis envoyer `{ input, result }` à `POST /simulations`.

**Écarts / reste à faire**
- Limitation de débit des routes publiques : à configurer dans le pare-feu Vercel (L5), rien en mémoire.
- SVG nettoyé avec svgo seul (pas de DOMPurify : il exige un DOM type jsdom, trop lourd pour la fonction Vercel).
- `@nestjs/jwt` 11 et `@nestjs/mapped-types` 2 (les versions suivantes sont ESM-only et cassent Jest/CommonJS).
- Prisma interdit `migrate reset` lancé par un agent : les e2e utilisent `migrate deploy` + `TRUNCATE`.
- Unicité du panneau `isDefault` non imposée côté API (plusieurs panneaux peuvent être « par défaut »).
- `package.json#prisma` (chemin du schéma) est déprécié pour Prisma 7 : migrer vers `prisma.config.ts` lors d'une montée.

### L3 — Front parcours particulier (terminé)

**Fait**
- Routes (`apps/web/src/app/app.routes.ts`, toutes en `loadComponent`) : `/` localisation, `/mode`, `/besoins`,
  `/autonomie`, `/resultat`, `/configurateur`, `/recapitulatif` (liste du matériel, maquette Recap ; route ajoutée,
  absente du TRD), `/s/:shareToken` (provisoire, L5), `/admin` (L4). `features/home` supprimé.
- Mobile 360 px d'abord, desktop ≥ 1024 px (`core/breakpoint.ts`, signal `isDesktop`) : `/besoins` = catégories à
  gauche + grille + récapitulatif latéral (DesktopBesoins) ; `/resultat` = résultat + configurateur côte à côte
  (DesktopResultat). Les écrans simples (lieu, profil, autonomie, configurateur) sont centrés (`max-w-xl`).
- Résultat : fourchette min–max (barre), proposition médiane en cartes `<details>` (chiffre clé + détail),
  indicateurs, alertes, « comparer sans » pour les appareils > 1 500 W (alerte `HEAVY_DEVICE` → simulation sans la
  ligne, bouton « Retirer cet appareil »), trois colonnes de variantes (choisir une variante = changer de palier),
  saison des pluies. Configurateur : ‹ › via `inverterNeighbors` / `storageNeighbors` / `panelCountNeighbors`
  fusionnés dans `overrides`, badge « Modifié », « Revenir à la proposition ». Récapitulatif : synthèse, schéma de
  câblage en SVG (`features/particulier/wiring-diagram.ts`, réutilisable pour le PDF), nomenclature
  (équipements, câbles en longueur aller + retour, protections), avertissement.
- Accessibilité : vrais `button`/`a`, `aria-pressed` (choix), `aria-expanded` (catégories, durées),
  `aria-current` (étapes), `aria-live` (récapitulatifs, indicateurs), cibles ≥ 44 px, focus visible global
  (`styles.css`), schéma SVG avec `role="img"` + description textuelle complète.
- Icônes : `shared/icons/icon-paths.ts` (grille 24, trait 1,5, `currentColor`) — interface, 8 catégories,
  28 glyphes d'appareils, matériel (`panel`, `battery`, `inverter`, `controller`, `cable`, `protection`, `board`).
  `resolveIcon(iconKey)` mappe les `iconKey` du catalogue (ids d'appareils/catégories), repli `plug`.
- Tests (26) : format, store (dont cas de Douala à 1 %), service catalogue, écrans Besoins / Résultat /
  Configurateur / Récapitulatif, routes. Bundle initial 291 kB (79 kB transférés) ; écrans en chunks de 1 à 25 kB.
- Vérifié avec Playwright à 360 et 1440 px : parcours complet sans erreur console ni défilement horizontal ;
  avec les puissances du cas de référence → 3,3 kWh/j, 3 × 450 Wc, 1 batterie 24 V 200 Ah, onduleur 1 000 W.

**Structure** (`apps/web/src/app`)
- `core/` : `catalog.service.ts` (signals `catalog`, `params`, `source` ; démarre sur `DEFAULT_CATALOG` /
  `DEFAULT_PARAMETER_SET`, puis `fetch('/api/v1/catalog')` une fois au démarrage, repli silencieux ; URL via le
  jeton `CATALOG_URL`), `simulation.store.ts`, `format.ts` (FR : virgule, espace fine U+202F entre milliers,
  insécable avant l'unité), `breakpoint.ts`, `extensions.ts`, `test-helpers.ts`.
- `shared/` : `icons/`, `layout/step-header.ts` (barre d'étapes mobile / étapes numérotées desktop),
  `ui/notices.ts` (`app-rain-notice`, `app-alert-list` avec messages simples par code d'alerte).
  Classes utilitaires dans `styles.css` : `btn-primary`, `btn-secondary`, `action-bar`, `card`, `choice`,
  `radio-dot` ; jetons ajoutés : `track`, `track-soft`, `divider`, `ring`, `highlight`, `text-caption`, `text-lead`.
- `features/particulier/` : un fichier par écran + `configurator-panel.ts` (mobile et `compact` desktop),
  `result-view.ts` (textes des cartes, protections, câbles : fonctions pures), `wiring-diagram.ts`.

**Store (`SimulationStore`, root)**
- Signals saisis : `countryId`, `regionId`, `mode`, `loads: LoadEntry[]` (`key`, `deviceId?`, `label`, `powerW?`,
  `quantity`, `hoursPerDay`), `autonomyDays`, `batteryTech`, `overrides`, `options`, `totals`. Persistés en
  sessionStorage (`simulateur.state.v1`, schéma versionné `v: 1`) par un `effect`.
- Dérivés : `dailyEnergy` (immédiat, `computeDailyEnergy`), `baseInput` / `input` (lisent une copie de `loads`
  temporisée à 150 ms ; `flush()` force), `outcome` (`empty | ok | error` avec message de `EngineError`), `result`,
  `proposal` (sans forçages), `neighbors`. Toute modification des appareils ou de la région efface les forçages ;
  changer d'autonomie ou de technologie efface les forçages de batterie.
- « Autre appareil » sans puissance : envoyé au moteur avec `powerW = 100` (`CUSTOM_DEFAULT_POWER_W`, affiché
  « ≈ 100 W (estimation) ») — le moteur exige une puissance hors catalogue, et un appareil fictif casserait le
  rejeu de l'API.

**Points d'extension**
- L4 : `/besoins` a deux routes ; la première, gardée par `canMatch: [isProMode]`, charge pour l'instant le
  placeholder → la remplacer par `features/pro/…`. Le store accepte déjà `setMode('pro')` (moteur en mode `pro`),
  `setOptions()` (tension, onduleur, simultanéité, longueurs de câbles — reprises par la nomenclature et le schéma)
  et `setTotals()`. `/admin` inchangé (`features/admin/admin.routes.ts`).
- L5 : jeton `RESULT_ACTIONS` (`core/extensions.ts`) : `exportPdf` (repli actuel : `window.print()`), `share` (doit
  renvoyer l'URL `/s/:token` ; repli : partage de l'origine), `requestCallback` (la carte « Besoin d'un devis ? »
  n'apparaît que s'il est fourni). `store.input()` / `store.result()` = charge utile de `POST /simulations` ;
  `store.restore(state)` recharge un état (`/s/:shareToken`). Service worker : mettre en cache l'app et
  `/api/v1/catalog` (le service accepte la réponse en cache, aucune autre condition). Polices Google à auto-héberger.

**Écarts / à signaler**
- `powerTypW` des appareils = milieu de la fourchette min–max (choix L1, le TRD ne donne que min–max) : le cas de
  Douala saisi depuis le catalogue donne 3,7 kWh/j (TV 105 W, frigo 140 W…) et 3 × 100 Ah ; les 3 277 Wh/j du TRD
  supposent les puissances typiques des maquettes (TV 80 W, frigo 120 W). À arbitrer en L6 (ou par l'admin).
- Schéma de câblage d'un onduleur hybride dessiné en chaîne panneaux → onduleur → batterie (simplification).
- Formulaires du « Autre appareil » sans quantité initiale (1, puis − / +) ; durée d'usage modifiable par crans
  (0,1 h → 24 h) comme la maquette, pas de saisie libre pour les appareils du catalogue.
