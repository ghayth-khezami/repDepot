#!/usr/bin/env bash
# Deploy Bébé Dépôt storefront on VPS (run from web/ after git pull)
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Installing dependencies..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
else
  npm install -g pnpm
  pnpm install --frozen-lockfile
fi

if [ ! -f .env ]; then
  echo "ERROR: .env missing. Create web/.env with:"
  echo "  NEXT_PUBLIC_API_URL=https://api.bebedepot.tn"
  exit 1
fi

if ! grep -q "NEXT_PUBLIC_API_URL=https://api.bebedepot.tn" .env; then
  echo "WARN: NEXT_PUBLIC_API_URL should be https://api.bebedepot.tn (no /api suffix)"
fi

echo "==> Building Next.js..."
pnpm build

echo "==> Restarting PM2..."
pm2 delete bebedepot-web 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "==> Done. Check: pm2 logs bebedepot-web --lines 30"
echo "    Site should listen on port 3001 (configure nginx to proxy here)."
