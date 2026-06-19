# Deploy backend (Render) + DB (Neon) + mobile PWA (Vercel)

Stack: **NestJS API on Render** · **PostgreSQL on Neon (free, no 30-day expiry)** · **Mobile PWA on Vercel**

## Important limits (read first)

| Piece | Service | Free forever? | Caveat |
|-------|---------|---------------|--------|
| **Database** | **Neon** | **Yes** | 0.5 GB storage; wakes in ~1–2 s after idle |
| **API** | Render free web service | Yes | **Sleeps** after ~15 min idle → first request ~30–60 s |
| **Uploads** (`server/uploads/`) | Render free disk | Ephemeral | **Lost on redeploy/restart** — see §5 |
| **Mobile PWA** | Vercel | Yes | HTTPS required for camera + install |

**Do not use Render free PostgreSQL** — it **expires after 30 days** and data is deleted. Neon is the free long-term DB for this setup.

---

## Part 1 — Neon database (free, permanent)

1. Go to [neon.tech](https://neon.tech) → sign up (GitHub is fine, no card).
2. **New project** → name `depot` → region closest to you (EU OK).
3. Copy the **connection string** (pooled or direct). Example:

   ```text
   postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

4. Keep this as your `DATABASE_URL` for Render.

### Run migrations once (from your PC)

```powershell
cd server
$env:DATABASE_URL="postgresql://..."   # your Neon URL
pnpm prisma migrate deploy
pnpm create:user   # optional: create admin (see create-user script)
```

---

## Part 2 — Render API

### Option A — Blueprint (fastest)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect GitHub repo `ghayth-khezami/repDepot`.
3. Render detects `server/render.yaml` (set **Root Directory** to `server` if asked).
4. Add environment variables (see table below).
5. **Create resources** → wait for first deploy (~5–10 min).

### Option B — Manual web service

1. **New** → **Web Service** → connect repo.
2. Settings:

   | Field | Value |
   |-------|-------|
   | Name | `depot-api` (or `repdepot-4`) |
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm install -g pnpm@10.27.0 && pnpm install --frozen-lockfile && pnpm prisma generate && pnpm build` |
   | Start Command | `npm run prisma:migrate:prod && npm run start:prod` |
   | Plan | **Free** |

3. Environment variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Neon connection string (`?sslmode=require`) |
   | `JWT_SECRET` | 64+ random hex: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
   | `WEB_URL` | Your Vercel web URL (or `https://placeholder.vercel.app` until ready) |
   | `CLIENT_URL` | Your Vercel backoffice URL |
   | `MOBILE_URL` | Your Vercel mobile URL (set after Part 3) |

4. **Create Web Service**.

Your API URL will look like: `https://depot-api.onrender.com`

### Verify API

```bash
curl https://YOUR-SERVICE.onrender.com
```

First request after idle may take 30–60 s (cold start).

---

## Part 3 — Mobile PWA on Vercel (iOS + Android install)

1. [vercel.com](https://vercel.com) → **Add New Project** → import `repDepot`.
2. Settings:

   | Field | Value |
   |-------|-------|
   | Root Directory | `mobile` |
   | Framework | Vite |
   | Build Command | `pnpm build` |
   | Output Directory | `dist` |
   | Install Command | `pnpm install` |

3. Environment variable:

   ```env
   VITE_API_URL=https://YOUR-SERVICE.onrender.com
   ```

4. Deploy → copy URL, e.g. `https://depot-mobile.vercel.app`.

5. Back on **Render**, set `MOBILE_URL=https://depot-mobile.vercel.app` → **Manual Deploy** (or wait for auto-redeploy).

### Install on phone (downloadable PWA)

**iPhone (Safari only)**

1. Open the Vercel HTTPS URL in **Safari**.
2. Tap **Share** (square + arrow).
3. **Add to Home Screen** → Confirm.
4. App icon appears like a native app.

**Android (Chrome)**

1. Open the HTTPS URL in **Chrome**.
2. Menu **⋮** → **Install app** or **Add to Home screen**.
3. App opens full-screen (standalone).

> Camera/scanner requires **HTTPS** — Vercel provides this automatically.

---

## Part 4 — Google OAuth (production)

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Credentials → your OAuth client:

- **Authorized JavaScript origins:** `https://depot-mobile.vercel.app` (and web/client URLs)
- **Authorized redirect URIs:** same origins if used

---

## Part 5 — Uploads on Render free

`server/uploads/` is **not** in git (`.gitignore`). On Render free:

- Disk is **ephemeral** — uploads disappear on redeploy or restart.
- Existing catalog images on your PC are **not** deployed automatically.

**Options:**

1. **Re-upload** product/brand images via backoffice after deploy.
2. **Render persistent disk** (~$0.25/GB/mo) — mount at `/app/uploads`.
3. Later: **Cloudflare R2** (10 GB free tier) for production files.

For admin mobile scanner + orders, DB on Neon is fine; plan for image storage separately.

---

## Part 6 — Reduce API cold starts (optional, free)

Render free sleeps after ~15 min. Ping every 10 min so the scanner feels faster:

- [cron-job.org](https://cron-job.org) (free) → GET `https://YOUR-SERVICE.onrender.com` every 10 minutes.

Uses Render’s 750 free instance hours/month — one ping every 10 min is well within limits.

---

## Checklist

- [ ] Neon project created; `DATABASE_URL` with `sslmode=require`
- [ ] `pnpm prisma migrate deploy` ran against Neon
- [ ] Render web service deployed; `JWT_SECRET` ≥ 32 chars
- [ ] `MOBILE_URL` on Render matches Vercel mobile URL
- [ ] Vercel `VITE_API_URL` points to Render API
- [ ] Admin user exists in Neon DB
- [ ] PWA installed on iPhone (Safari) and/or Android (Chrome)
- [ ] Google OAuth origins updated for production URLs

---

## Quick reference

| App | Folder | Host | URL env |
|-----|--------|------|---------|
| API | `server/` | Render | — |
| Database | — | **Neon** (not Render Postgres) | `DATABASE_URL` on Render |
| Mobile PWA | `mobile/` | Vercel | `VITE_API_URL` |
