#!/usr/bin/env bash
# Build and serve the app on :3200 against LOCAL Supabase with the REAL Claude API
# (ANTHROPIC_API_KEY / ANTHROPIC_MODEL come from .env.local, which Next loads itself).
# Prints `export ...` lines for driver.mjs on the first line so callers can eval them.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH="$HOME/.docker/bin:$PATH"
supabase status >/dev/null 2>&1 || supabase start >/dev/null
S=$(supabase status -o json)
j() { node -e "const s=JSON.parse(process.argv[1]);console.log(s['$1'])" "$S"; }
export NEXT_PUBLIC_SUPABASE_URL=$(j API_URL)
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(j ANON_KEY)
export SUPABASE_SERVICE_ROLE_KEY=$(j SERVICE_ROLE_KEY)
unset CLAUDE_FAKE
export QUOTA_PER_USER=${QUOTA_PER_USER:-20} QUOTA_GLOBAL=${QUOTA_GLOBAL:-500}
export NEXT_DIST_DIR=.next-persona
pnpm exec next build --turbopack >/dev/null
exec pnpm exec next start -p 3200
