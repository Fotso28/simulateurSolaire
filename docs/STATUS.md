# Avancement

| Lot | État | Session |
|---|---|---|
| L0 | terminé | L0 |
| L1 | à faire | |
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
