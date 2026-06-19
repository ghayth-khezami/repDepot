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
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-API.onrender.com
```

No trailing slash. Redeploy after changing env vars.

### Common error: `output directory "dist" was not found`

This happens when Vercel **Output Directory** is set to `dist` but Next.js builds to `.next` by default.

**Fix (already in this repo):** `web/next.config.ts` sets `distDir: "dist"` on Vercel, and `web/vercel.json` declares `"outputDirectory": "dist"`.

In **Vercel → Project → Settings → General** also confirm:

1. Root Directory = `web`
2. Framework = **Next.js** (not Vite)
3. Output Directory = `dist` (or leave blank if you remove `distDir` from next.config)
4. Redeploy

This repo includes `web/vercel.json` with the correct Next.js settings.

## Render API (CORS)

After deploy, set on Render:

```env
WEB_URL=https://your-web-store.vercel.app
```

## Local dev

```bash
cd web
pnpm install
cp .env.example .env.local   # if present
pnpm dev
```

Default: http://localhost:3000 (Next.js). API: `NEXT_PUBLIC_API_URL=http://localhost:3000` if Nest runs on 3000 — adjust if needed.
