#!/usr/bin/env bash
set -euo pipefail

# ── Guard: must be on main ────────────────────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "ERROR: deploys only allowed from main (currently on '$BRANCH')"
  exit 1
fi

# ── Guard: clean working tree ─────────────────────────────────────────────────
if [[ -n $(git status --porcelain) ]]; then
  echo "ERROR: uncommitted changes — commit or stash before deploying"
  exit 1
fi

# ── Type-check ────────────────────────────────────────────────────────────────
echo "→ type-checking..."
npx tsc --noEmit

# ── Firebase database rules ───────────────────────────────────────────────────
if command -v firebase &>/dev/null; then
  echo "→ deploying Firebase database rules..."
  firebase deploy --only database
else
  echo "WARNING: firebase CLI not found — skipping database rules deploy"
  echo "         install with: npm install -g firebase-tools"
fi

# ── Vercel production deploy ──────────────────────────────────────────────────
echo "→ deploying to Vercel (production)..."
vercel --prod

echo "✓ deploy complete"
