# BÉBÉ-DÉPÔT — Web storefront (Next.js)

Public shop: catalogue, panier, checkout, demandes de dépôt.

## Vercel deploy

Create a **separate** Vercel project from the mobile PWA (do not reuse mobile settings).

| Setting | Value |
|---------|--------|
| **Root Directory** | `web` |
| **Framework Preset** | Next.js |
| **Build Command** | `pnpm build` (or leave default) |
| **Output Directory** | `dist` (aligned with `next.config.ts` when deployed on Vercel) |
| **Install Command** | `pnpm install` |

### Environment variables

```env
NEXT_PUBLIC_API_URL=https://repdepot-qgek.onrender.com
```

No trailing slash. **Do not** add `/api` — Nest routes are `/products`, `/categories`, etc. (`/api` is Swagger docs only in dev).

Redeploy after changing env vars.

## VPS deploy (PM2)

On the server, after `git pull`:

```bash
cd ~/apps/depot/web
chmod +x deploy-vps.sh
./deploy-vps.sh
```

Or manually:

```bash
cd ~/apps/depot/web
pnpm install --frozen-lockfile   # required after every pull (new deps like @phosphor-icons/react)
pnpm build                       # must succeed before starting
pm2 delete bebedepot-web 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
```

**Do not** run `pm2 start node_modules/next/dist/bin/next` without `build` first — PM2 will show "online" but the site will be broken.

Nginx should proxy your domain to `http://127.0.0.1:3001`.

### Render API (CORS)

Set on Render (required if frontend is NOT on `*.vercel.app`):

```env
WEB_URL=https://YOUR-VPS-DOMAIN.com
```

Without this, the browser blocks API calls from your VPS site to Render.

## Local dev

```bash
cd web
pnpm install
cp .env.example .env.local   # if present
pnpm dev
```

Default: http://localhost:3000 (Next.js). API: `NEXT_PUBLIC_API_URL=http://localhost:3000` if Nest runs on 3000 — adjust if needed.
