#!/usr/bin/env bash
# Git pre-push hook for bountystash-console
# Gives an interactive nudge to deploy to Cloudflare Pages preview upon repository push.
# Non-blocking: defaults to No / auto-skips on timeout.

set -e

REPO_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Only run if connected to an interactive terminal
if [ ! -t 0 ] && [ ! -t 1 ]; then
  exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ⚡ Bountystash Console Git Push Nudge"
echo "════════════════════════════════════════════════════════════════"

DEPLOY=false

if command -v gum >/dev/null 2>&1; then
  if gum confirm --timeout=15s --default=false "Deploy updated build to Cloudflare Pages preview (cv-resume)?"; then
    DEPLOY=true
  fi
else
  read -t 10 -p "Deploy updated build to Cloudflare Pages preview? [y/N] (auto-skips in 10s): " answer || true
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    DEPLOY=true
  fi
fi

if [ "$DEPLOY" = true ]; then
  echo ""
  echo "🚀 Building console & deploying to Cloudflare Pages preview..."
  nix-shell -p wrangler nodejs --run "cd '$REPO_DIR' && node scripts/build.js && wrangler pages deploy dist --project-name=cv-resume --branch=preview"
  echo "✅ Cloudflare Pages preview deployed successfully."
  echo ""
else
  echo ""
  echo "⏩ Skipping Cloudflare Pages deployment. Proceeding with git push..."
  echo ""
fi

exit 0
