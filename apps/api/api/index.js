// Fonction Vercel unique du projet « api » : reprend le handler NestJS construit par
// `scripts/vercel-build.sh` (dist/apps/api/serverless.js, export par défaut `(req, res)`).
// Toutes les routes y sont réécrites par apps/api/vercel.json.
// Bundle construit hors du graphe Nx (sortie de build), pas un module source.
// eslint-disable-next-line @nx/enforce-module-boundaries
module.exports = require('../../../dist/apps/api/serverless.js').default;
