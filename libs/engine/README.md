# engine

Moteur de dimensionnement solaire, TypeScript pur, sans dépendance d’exécution.
Partagé par `apps/web` (calcul local, hors-ligne) et `apps/api` (rejeu, seed).

```ts
import {
  simulate,
  DEFAULT_CATALOG,
  DEFAULT_PARAMETER_SET,
  EngineError,
} from '@simulateur/engine';

const result = simulate(input, DEFAULT_CATALOG, DEFAULT_PARAMETER_SET);
```

- `simulate(input, catalog, params)` : résultat complet (fourchette, variantes, alertes, versions) ;
  lève `EngineError` (`code` stable, `message` en français) si l’entrée est invalide ou si aucun matériel ne convient.
- Configurateur : `inverterNeighbors`, `storageNeighbors`, `panelCountNeighbors` → forçages à fusionner dans `input.overrides`.
- Récapitulatif : `computeDailyEnergy(loads, catalog, mode)`.
- Données : `DEFAULT_CATALOG` (et chaque liste `DEFAULT_*`), `DEFAULT_PARAMETER_SET`.
- Cas de test calculés à la main : [TEST_CASES.md](./TEST_CASES.md).

`nx test engine` (couverture ≥ 90 % exigée), `nx build engine`.
