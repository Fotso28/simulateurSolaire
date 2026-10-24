# Recette — Simulateur de dimensionnement solaire (L6c)

Revue de conformité finale du dépôt contre `docs/PRD-TRD.md` (octobre 2026). La revue a été répartie sur
cinq périmètres. Les preuves ont été vérifiées dans le code. Chemins relatifs à la racine, `web/` = `apps/web/src/app/`.

## Synthèse

- **Exigences fonctionnelles : 23 / 23 conformes** après les correctifs L6c. Avant L6c, deux étaient
  partielles : RF-03 (durée d'un « Autre appareil » non modifiable après ajout) et RF-14 (indicateur
  onduleur du mode pro qui ignorait la pointe). Aucune n'est absente.
- **Exigences non fonctionnelles : 10 conformes, 2 partielles, 1 absente** (suivi des erreurs côté navigateur), 1 non mesurable avant production (disponibilité).
- **Moteur** : étapes 1 à 9, fourchette, variantes, configurateur, 5 alertes et 4 cas de référence conformes.
  109 tests, couverture ≈ 96 % des lignes. Un bug a été corrigé en L6c (installation 48 V à forte puissance et
  faible énergie).
- **API, modèle de données, sécurité** : toutes les routes et entités du TRD sont présentes. Il reste deux
  écarts de sécurité mineurs, listés plus bas : verrouillage non atomique et cohérence de l'ensoleillement.
- `npx nx run-many -t lint test build` passe : engine 109, web 85, api 27 tests. `nx format:check --all` passe.
  Les e2e ont été relancés par la session L6b, parallèle : `nx e2e api` 31/31, `nx e2e web-e2e` 14/14, CI verte (run 21).

## Exigences fonctionnelles

| ID | Exigence | Statut | Preuve | Écart / remarque |
|---|---|---|---|---|
| RF-01 | Pays puis région, ensoleillement dans le calcul | Conforme | `web/features/particulier/location-page.ts:36-89` ; `libs/engine/src/lib/sizing.ts:451` | — |
| RF-02 | Appareils par catégorie, icône, quantité | Conforme | `web/features/particulier/needs-page.html` (catégories mobile et desktop) | Icônes au trait (un seul jeu, demandé par le PRD) |
| RF-03 | Heures d'usage pré-remplies et modifiables | Conforme (L6c) | `web/core/simulation.store.ts` (`stepHours`) ; `needs-page.html` (« Autre appareil ») | Réglage par crans, sans saisie libre (assumé, L3). L6c : réglage −/+ ajouté pour les « Autre appareil » |
| RF-04 | Récapitulatif en direct (appareils, kWh/j) | Conforme | `needs-page.html` (barre `aria-live`, colonne desktop) ; `simulation.store.ts:155-181` | — |
| RF-05 | Fourchette min–max, proposition médiane | Conforme | `libs/engine/src/lib/simulate.ts:305-353` ; `web/features/particulier/result-view.ts` | La proposition est calculée sur P_typ |
| RF-06 | « Autre appareil », puissance facultative | Conforme | `needs-page.ts:174-199` ; `simulation.store.ts` (`addCustom`) | Repli à 100 W ; quantité initiale 1 (assumé, L3) |
| RF-07 | Pro : P exacte, quantité, h/j, facteur k | Conforme | `web/features/pro/pro-input-page.ts:27-32, 135-163` | — |
| RF-08 | Pro : puissance totale et Wh/j | Conforme | `pro-input-page.ts:566-588` ; `simulate.ts:216` | — |
| RF-09 | Technologie, tension auto, type d'onduleur, câbles | Conforme | `pro-input-page.ts:345-411, 477-517, 615-627` | Le configurateur ne change jamais la tension (assumé, L1) |
| RF-10 | Coefficient de simultanéité | Conforme | `pro-input-page.ts:413-451` ; `libs/engine/src/lib/energy.ts` | L6c : le moteur refuse désormais c_s > 1, comme l'API |
| RF-11 | Paliers d'autonomie | Conforme | `web/features/particulier/autonomy-page.ts:48-54` ; paramètres `[0,5 ; 1 ; 1,5 ; 2 ; 3]` | — |
| RF-12 | Proposition et variantes inférieure / supérieure | Conforme | `result-page.ts` (`variants`) ; `pro-result-page.ts:300-329` | `batteryParallel` forcé ignoré par les variantes (assumé, L1) |
| RF-13 | Configurateur ‹ › avec recalcul instantané | Conforme | `libs/engine/src/lib/configurator.ts:44+` ; `configurator-panel.ts` | — |
| RF-14 | Alertes onduleur, A_eff < 0,5 j, C_PV < 100 % | Conforme (L6c) | `libs/engine/src/lib/simulate.ts:41-57` ; `web/shared/ui/notices.ts` | L6c : l'indicateur onduleur du mode pro tient compte de f_s × P_nom ≥ P_dem |
| RF-15 | Nomenclature avec câblage série/parallèle | Conforme | `web/features/particulier/recap-data.ts` ; `web/features/pro/pro-view.ts:358-386` | Schéma de l'onduleur hybride simplifié (assumé, L3) |
| RF-16 | Avertissement saison des pluies | Conforme | `result-page.html` ; `pro-result-page.ts` ; `export/pdf-document.ts` | L6c : n'apparaît plus en double en mode pro |
| RF-17 | Export PDF et partage par lien | Conforme | `web/core/share.service.ts` ; `export/pdf-document.ts` ; route `s/:shareToken` | L6c : l'échec du partage est désormais signalé en mode pro |
| RF-18 | Demande de devis | Conforme | `web/features/lead/lead-page.ts` ; `apps/api/src/app/public/simulations.controller.ts:39-70` | Limitation de débit dans le pare-feu Vercel (assumé) |
| RF-19 | Catalogue d'appareils (CRUD, désactivation, illustrations) | Conforme | `apps/api/src/app/admin/catalog-admin.controller.ts` ; `media/media.controller.ts` ; `web/features/admin/devices` | Ordre par champ, sans glisser-déposer (assumé, L4a) |
| RF-20 | Pays, régions, ensoleillement | Conforme | `apps/api/src/app/admin/reference-admin.controller.ts:36-114` | Pas de contrôle `irradiationMinMonth ≤ irradiationAvg` (voir « Écarts à corriger ») |
| RF-21 | Matériel et paramètres versionnés | Conforme | `reference-admin.controller.ts:124-207` ; `governance-admin.controller.ts:39-151` | Unicité de `isDefault` non imposée (assumé, L2) |
| RF-22 | Comptes administrateurs et rôles | Conforme | `governance-admin.controller.ts:190-287` | Une rétrogradation prend effet à l'expiration du jeton d'accès (≤ 15 min) |
| RF-23 | Statistiques | Conforme | `governance-admin.controller.ts` (`StatsController`) ; `web/features/admin/stats` | L6c : une période inversée renvoie 400 `INVALID_PERIOD` |

## Exigences non fonctionnelles

| Exigence | Statut | Preuve / mesure | Écart |
|---|---|---|---|
| Parcours complet dès 360 px | Conforme | Projet Playwright 360×800 tactile (`apps/web-e2e/playwright.config.ts`), contrôle de l'absence de défilement horizontal | — |
| Première page < 1 Mo, 3G | Conforme | Route `/` : 438 Ko bruts, **154 Ko gzip**, 140 Ko brotli. Préchargement du service worker ensuite : 651 Ko gzip, avec pdfmake (assumé) | — |
| Hors-ligne après la première visite | Conforme | `ngsw-config.json` (prefetch, catalogue en freshness) ; `web/core/offline-queue.ts` ; repli `DEFAULT_CATALOG` | — |
| Recalcul < 100 ms | Conforme | `simulate()` sur Douala : 0,067 ms en moyenne, p99 0,36 ms ; test `< 5 ms` dans `reference-cases.spec.ts` | — |
| Contrastes du texte (WCAG AA 4,5:1) | Conforme | muted/bg 5,53 ; blanc/action 5,02 ; *-ink/*-soft ≥ 6,3 | — |
| Contraste des composants (WCAG 1.4.11, 3:1) | Partiel | Bordure `.field` 1,65:1 (`styles.css:217`) ; `.radio-dot` 2,36:1 | À corriger (changement visuel à valider) |
| Focus visible, libellés, aria | Partiel → amélioré (L6c) | `styles.css` : focus étendu aux `textarea` ; recherche admin : `focus-within` | Reste à vérifier à la main avec un lecteur d'écran |
| Zones tactiles ≥ 44 px | Conforme (L6c) | Bandeau hors-ligne : « × » et « Voir le lien » portés à 44 px (`web/shared/ui/offline-indicator.ts`) | — |
| Langue française, unités, formats | Conforme | `index.html` `lang="fr"` ; `Intl.NumberFormat('fr-FR')` ; messages d'API en français | Anglais prévu en V2 |
| Disponibilité 99,5 % | Non mesurable avant production | Vercel + Neon | À suivre après mise en ligne |
| Polices auto-hébergées | Conforme | `apps/web/public/fonts` (6 woff2, 128 Ko) | — |
| Déploiement Vercel / Neon / migrations / sauvegardes | Conforme (configuration seule) | `apps/web/vercel.json` + `scripts/vercel-output.mjs` ; `apps/api/vercel.json` ; `vercel-build.sh` ; `.github/workflows/backup.yml` | Aucun déploiement réel |
| Tests (unitaires, cas de référence, e2e) | Conforme | Unitaires verts ; e2e API (Supertest) et web (Playwright) présents | Verrouillage fiabilisé et e2e relancés par L6b ; test e2e du 413 à écrire |
| Suivi des erreurs côté navigateur (TRD) | **Absent** | `provideBrowserGlobalErrorListeners()` seulement, sans envoi | À faire |

## Correctifs appliqués en L6c

Tous les correctifs ont un test, sauf les deux derniers (script et constante).

1. Moteur, `libs/engine/src/lib/sizing.ts` : au moins N_s,min panneaux. Avant, `totals {2 500 W, 1 000 Wh/j}`
   levait `NO_COMPATIBLE_CONTROLLER` en 48 V.
2. Moteur, `energy.ts` : repli P_typ = (P_min + P_max) / 2 quand `powerTypW` vaut 0, comme le prévoit le TRD.
3. Moteur, `simulate.ts` : c_s doit être dans ]0 ; 1]. Ajout d'un test de la branche pointe de l'alerte onduleur.
4. Mode pro, `pro-result-page.ts` :
   - le seuil de l'indicateur onduleur vaut max(1,25 × P_inst ; P_dem / f_s) ;
   - la saison des pluies ne s'affiche plus qu'une fois ;
   - le message d'échec du partage est affiché (hors ligne ou erreur).
5. Particulier :
   - accord « 1 appareil » sur le résultat desktop et la catégorie desktop ;
   - « Couvre 2 jours » au lieu de « 2,0 jour » ;
   - quantité d'un « Autre appareil » bornée à 999 ;
   - réglage −/+ de la durée d'un « Autre appareil » (RF-03).
6. API :
   - cookie `Secure` par défaut quand `NODE_ENV=production` ;
   - 400 `INVALID_PERIOD` quand `from > to` sur les statistiques ;
   - limite multer à 2 Mo + 1 octet, pour que le dépassement renvoie bien 413 `FILE_TOO_LARGE` ;
   - constante `ACCESS_TOKEN_TTL_SECONDS` utilisée dans `auth.service.ts`.
7. Pare-feu, `apps/api/scripts/firewall-rules.sh` et `docs/DEPLOIEMENT.md` : nouvelle règle de 10 `POST /api/v1/auth/login` par minute et par IP.
8. Accessibilité : focus visible des `textarea` et de la recherche admin, zones tactiles du bandeau hors-ligne.

## Écarts assumés (déjà listés dans `docs/STATUS.md`)

- Moteur (L1) :
  - marge 1,25 appliquée une seule fois sur les protections ;
  - fusible régulateur → batteries ajouté ;
  - choix des chaînes « moins de panneaux, puis plus grand N_s » ;
  - MPPT intégré des hybrides sans contrôle du courant d'entrée ;
  - DoD globale par technologie ;
  - régulateurs PWM ignorés ;
  - ensoleillement du mois le plus faible estimé.
- API (L2) :
  - limitation de débit dans le pare-feu Vercel ;
  - SVG nettoyés avec svgo seul, sans DOMPurify ;
  - unicité de `isDefault` non imposée ;
  - `package.json#prisma` déprécié pour Prisma 7.
- Front (L3, L4a) :
  - durées réglées par crans ;
  - schéma de câblage de l'onduleur hybride simplifié ;
  - pas de rafraîchissement proactif du jeton ;
  - un pays ajouté n'apparaît qu'après rechargement ;
  - pas de glisser-déposer.
- Déploiement (L5b, L6a) :
  - règles du pare-feu posées par script CLI ;
  - prise en compte de `apps/web/.vercel/output` à vérifier au premier déploiement.

## Écarts à corriger (non traités en L6c)

| # | Écart | Où | Correctif proposé |
|---|---|---|---|
| 1 | Verrouillage après 5 échecs non atomique : des essais simultanés peuvent dépasser 5 | `apps/api/src/app/auth/auth.service.ts:59-76` | `update({ data: { failedLogins: { increment: 1 } } })`, puis verrouiller selon la valeur renvoyée. À coordonner avec L6b (auth) |
| 2 | Ensoleillement minimal pouvant dépasser la moyenne | `apps/api/src/app/admin/reference-admin.controller.ts:90, 96` | Contrôle `checkIrradiation` sur le modèle de `checkPowers`, qui renvoie 400 `field: 'irradiationMinMonth'` |
| 3 | Contraste des composants < 3:1 | `apps/web/src/styles.css:217, 257` | Bordure `.field` et `.radio-dot` en `var(--color-muted)`, après validation visuelle |
| 4 | Suivi des erreurs côté navigateur absent | `apps/web/src/app/app.config.ts` | `ErrorHandler` qui envoie les erreurs (Sentry ou point d'API dédié) |
| 5 | Bouton « Partager » absent de l'en-tête desktop du résultat | `web/shared/layout/step-header.ts` | Le partage existe sur le récapitulatif ; l'ajouter à l'en-tête comme sur la maquette DesktopResultat |
| 6 | Test e2e du 413 `FILE_TOO_LARGE` | `apps/api/src/e2e/` | À écrire après L6b (téléverser 2 Mo + 1 octet) |
| 7 | `@angular/cdk` déclaré mais jamais importé | `package.json` | Le retirer ou l'utiliser |

## Questions ouvertes du PRD

| Question | État |
|---|---|
| Autonomie en jours ou en heures pour le particulier | Tranché de fait : paliers en jours (0,5 à 3) affichés « Une nuit », « Une journée »… **À confirmer** |
| Batterie par défaut : lithium ou plomb/gel | Tranché de fait : lithium par défaut, plomb/gel au choix. Pas d'affichage côte à côte. **À confirmer** |
| Modèle économique | **Non tranché** (seule la demande de devis existe) |
| Matériel générique ou produits d'un fournisseur | Tranché de fait : tailles standard génériques, modifiables dans le back-office |
| Délestages : secours rechargé par le réseau dès le MVP | **Non tranché**, rien d'implémenté (V3 dans la feuille de route) |
| Simultanéité indiquée par le particulier | **Non tranché** : c_s n'est proposé qu'en pro |
| Compte professionnel dès le MVP | Tranché de fait : pas de compte pro (V2) |
| Plateforme | Décidé : web responsive sur Vercel |

## Points à valider par un humain

1. **10 installations réelles de référence** : comparer le simulateur aux installations réelles. Cible du PRD :
   moins de 15 % d'écart sur la puissance crête et le stockage. Ajuster ensuite le catalogue et les paramètres.
2. **Ensoleillement** : remplacer les 19 valeurs régionales et les minima mensuels estimés par des données PVGIS
   ou NASA POWER (`libs/engine/src/data/geography.ts`, ou via le back-office).
3. **Premier déploiement réel** sur Vercel (web et API) et Neon, en suivant `docs/DEPLOIEMENT.md` :
   - variables `API_ORIGIN`, `DATABASE_URL*` et `COOKIE_SECURE` ;
   - vérifier que Vercel prend bien `apps/web/.vercel/output` ;
   - lancer `firewall-rules.sh` sur les deux projets ;
   - tester les sauvegardes.
4. Validation par un installateur du catalogue d'appareils (P_typ L6a) et du matériel de référence.
5. Vérification manuelle de l'accessibilité (lecteur d'écran, navigation au clavier) et parcours sur un vrai
   smartphone d'entrée de gamme en 3G.
