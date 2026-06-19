# BÉBÉ-DÉPÔT — Web storefront (Next.js)

Public shop: catalogue, panier, checkout, demandes de dépôt.

## Vercel deploy

Create a **separate** Vercel project from the mobile PWA (do not reuse mobile settings).

| Setting | Value |
|---------|--------|
| **Root Directory** | `web` |
| **Framework Preset** | Next.js |
| **Build Command** | `pnpm build` (or leave default) |
| **Output Directory** | *(leave empty — do NOT use `dist`)* |
| **Install Command** | `pnpm install` |

### Environment variables

```env
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-API.onrender.com
```

No trailing slash. Redeploy after changing env vars.

### Common error: `output directory "dist" was not found`

Next.js builds to `.next`, not `dist`. `dist` is for the **mobile** Vite app.

**Fix in Vercel → Project → Settings → General:**

1. Root Directory = `web`
2. **Clear** Output Directory (blank) or delete `dist`
3. Framework = Next.js
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
