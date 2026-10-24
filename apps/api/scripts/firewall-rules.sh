#!/usr/bin/env bash
# Règles de limitation de débit du pare-feu Vercel (WAF) pour les routes publiques
# d'écriture. Un compteur en mémoire ne tient pas entre instances serverless : la
# limite est donc portée par le pare-feu, devant la fonction.
#
# Usage (Vercel CLI ≥ 50, connecté : `vercel login`) :
#   apps/api/scripts/firewall-rules.sh apps/web   # projet public (relaie /api/*)
#   apps/api/scripts/firewall-rules.sh apps/api   # accès direct à l'API
# Le dossier doit être lié au projet Vercel (`vercel link` dedans). Les règles sont
# créées en brouillon puis publiées. Voir docs/DEPLOIEMENT.md, § Pare-feu.
set -euo pipefail

dir="${1:?dossier du projet Vercel lié (apps/web ou apps/api)}"
cd "$(dirname "$0")/../../../$dir"

# POST /api/v1/simulations : 20 enregistrements par minute et par adresse IP.
vercel firewall rules add "Limite POST simulations" \
  --description "20 POST /api/v1/simulations par minute et par IP" \
  --condition '{"type":"path","op":"eq","value":"/api/v1/simulations"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 20 \
  --rate-limit-keys ip \
  --rate-limit-algo fixed_window \
  --rate-limit-action rate_limit \
  --yes

# POST /api/v1/leads : 5 demandes de devis par 10 minutes et par adresse IP,
# puis blocage 15 minutes en cas d'abus.
vercel firewall rules add "Limite POST leads" \
  --description "5 POST /api/v1/leads par 10 minutes et par IP" \
  --condition '{"type":"path","op":"eq","value":"/api/v1/leads"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit \
  --rate-limit-window 600 \
  --rate-limit-requests 5 \
  --rate-limit-keys ip \
  --rate-limit-algo fixed_window \
  --rate-limit-action deny \
  --duration 15m \
  --yes

# POST /api/v1/auth/login : 10 tentatives par minute et par adresse IP
# (complète le verrouillage du compte après 5 échecs).
vercel firewall rules add "Limite POST login" \
  --description "10 POST /api/v1/auth/login par minute et par IP" \
  --condition '{"type":"path","op":"eq","value":"/api/v1/auth/login"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 10 \
  --rate-limit-keys ip \
  --rate-limit-algo fixed_window \
  --rate-limit-action rate_limit \
  --yes

# POST /api/v1/client-errors : 10 rapports d'erreurs navigateur par minute et par IP
# (le navigateur échantillonne et dédoublonne déjà ; ceci borne les abus).
vercel firewall rules add "Limite POST client-errors" \
  --description "10 POST /api/v1/client-errors par minute et par IP" \
  --condition '{"type":"path","op":"eq","value":"/api/v1/client-errors"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 10 \
  --rate-limit-keys ip \
  --rate-limit-algo fixed_window \
  --rate-limit-action rate_limit \
  --yes

vercel firewall publish --yes
vercel firewall rules list
