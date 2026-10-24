# Simulateur de dimensionnement solaire

Cameroun et Gabon — mode particulier et mode professionnel, back-office.
Voir `docs/PRD-TRD.md` (spécification), `design/maquettes/` (UI), `docs/ORCHESTRATION.md` (plan) et `docs/STATUS.md` (avancement).

## Démarrage

Node 22+, npm 11+ (`npm i -g npm@11`).

```sh
npm ci
npm run start:api   # http://localhost:3000/api/v1/health
npm run start:web   # http://localhost:4200 (proxy /api → :3000)
npm run lint && npm run test && npm run build
```
