# Avancement

| Lot | État | Session |
|---|---|---|
| L0 | terminé | L0 |
| L1 | terminé | L1 |
| L2 | à faire | |
| L3 | à faire | |
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
