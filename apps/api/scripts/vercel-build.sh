#!/usr/bin/env bash
# Build de la fonction Vercel du projet « api » (Root Directory = apps/api).
# Lancé par `buildCommand` de apps/api/vercel.json, depuis la racine du dépôt.
#   1. prisma generate (client + moteur rhel-openssl-3.0.x pour le runtime Vercel) ;
#   2. prisma migrate deploy sur la base de l'environnement (production ou branche
#      Neon de prévisualisation), via DATABASE_URL_UNPOOLED (directUrl) ;
#   3. build webpack de l'API → dist/apps/api/serverless.js (repris par api/index.js).
# SKIP_DB_MIGRATIONS=1 saute l'étape 2 (ex. : build local sans base).
# SEED_ON_BUILD=1 lance aussi le seed idempotent après les migrations (premier
# déploiement : données de référence + compte ADMIN initial depuis SEED_ADMIN_*).
set -euo pipefail

cd "$(dirname "$0")/../../.."

export NX_NO_CLOUD=true NX_DAEMON=false NODE_ENV=production

echo "› prisma generate"
npx prisma generate

if [[ "${SKIP_DB_MIGRATIONS:-0}" == "1" ]]; then
  echo "› migrations ignorées (SKIP_DB_MIGRATIONS=1)"
elif [[ -z "${DATABASE_URL_UNPOOLED:-}" ]]; then
  echo "✗ DATABASE_URL_UNPOOLED absente : migrations impossibles (intégration Neon ?)" >&2
  exit 1
else
  echo "› prisma migrate deploy (${VERCEL_ENV:-local})"
  npx prisma migrate deploy
  if [[ "${SEED_ON_BUILD:-0}" == "1" ]]; then
    echo "› seed (SEED_ON_BUILD=1)"
    npx tsx --tsconfig apps/api/tsconfig.app.json apps/api/src/seed/main.ts
  fi
fi

echo "› nx build api"
npx nx build api --configuration=production --skip-nx-cache
