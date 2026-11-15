#!/bin/sh
# Deploy to your own server (docker compose behind a reverse proxy).
# Usage: scripts/deploy.sh. Server, key and directory come from scripts/deploy.local.env (gitignored; see the .example).
# Secrets live only in the server's .env.
set -eu
cd "$(dirname "$0")/.."
[ -f scripts/deploy.local.env ] || { echo "Missing scripts/deploy.local.env (copy scripts/deploy.local.env.example)" >&2; exit 1; }
. ./scripts/deploy.local.env
HOST="$DEPLOY_HOST"
SSH="ssh -i $DEPLOY_KEY -o BatchMode=yes"
rsync -az --delete -e "$SSH" \
  --exclude node_modules --exclude dist --exclude .nuxt --exclude .output --exclude .env \
  --exclude '/*.html' --exclude 'PuntQuiz - *.md' --exclude 'open source alternatives.md' --exclude CLAUDE.md --exclude CLAUDE.local.md --exclude 'scripts/deploy.local.env' \
  --exclude assets/avatars --exclude assets/landing ./ "$HOST":"$DEPLOY_DIR"/
# One-time, idempotent: SSO settings + generated secrets live only in the server .env.
$SSH "$HOST" 'cd ~/'"$DEPLOY_DIR"' && grep -q "^AUTHENTIK_SECRET_KEY=" .env || { umask 077; printf "PUBLIC_URL=https://puntquiz.puntuale.nl\nOIDC_PUBLIC_ISSUER=https://auth-puntquiz.puntuale.nl\nLOCAL_AUTH=false\nAUTHENTIK_SECRET_KEY=%s\nAUTHENTIK_DB_PASSWORD=%s\nAUTHENTIK_BOOTSTRAP_PASSWORD=%s\nOIDC_CLIENT_SECRET=%s\n" "$(openssl rand -hex 32)" "$(openssl rand -hex 24)" "$(openssl rand -base64 18 | tr -d "=+/")" "$(openssl rand -hex 32)" >> .env; }'
$SSH "$HOST" 'cd ~/'"$DEPLOY_DIR"' && docker compose up -d --build && docker compose ps'
# Env-driven social sources don't change the blueprint file, so apply it explicitly (waits for the worker).
$SSH "$HOST" 'cd ~/'"$DEPLOY_DIR"' && for i in 1 2 3 4 5 6 7 8 9 10 11 12; do docker compose exec -T authentik-worker ak apply_blueprint /blueprints/custom/puntquiz.yaml >/dev/null 2>&1 && echo "blueprint applied" && break; sleep 10; done'
curl -fsS https://puntquiz.puntuale.nl/api/health && echo
