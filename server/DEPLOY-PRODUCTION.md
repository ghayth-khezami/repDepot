# Backend + PostgreSQL — production deployment (5-year plan)

Your stack: **NestJS + Prisma + PostgreSQL + local `uploads/`** (product photos, brands, deposit requests).

## Reality check (read this first)

| Option | Free? | No sleep? | 5 years? | Fits your API? |
|--------|-------|-----------|----------|----------------|
| **Render free** (`repdepot-4.onrender.com`) | Yes | **No** — sleeps ~15 min idle | Yes | Poor — cold start 30–60s |
| **Supabase / Neon DB free** | Yes | DB may pause / scale to zero | Maybe | OK as DB only, not for uploads |
| **Vercel / Netlify** | Yes | Yes | Yes | **No** — static only, not NestJS |
| **Oracle Cloud Always Free VM** | Yes | **Yes** | **Yes** (while program exists) | **Best free option** |
| **Render paid** (~$14/mo) | No | Yes | Yes | Easiest managed option |

**Recommendation for “free + no sleeping + 5 years”:**  
**One Oracle Cloud Always Free ARM VM** running **PostgreSQL + API + uploads on disk**, fronted by **Cloudflare** (free SSL + CDN for `/uploads` if needed).

**Then:** deploy **mobile PWA** on **Vercel** (`mobile/`) pointing to that API URL.

---

## Card verification failed (Bybit / crypto / $0 balance)

**Oracle, AWS, and Google Cloud reject most crypto/virtual cards** (Bybit Card, prepaid with $0, etc.). They need a **normal bank Visa or Mastercard** with:

- International online payments enabled  
- At least **$1–5** available (temporary authorization hold, usually not charged)  
- Billing address matching the bank country  

### If you have ~$1 on a real bank card → use **Google Cloud** (easier than Oracle)

| | Oracle | AWS (new accounts 2025+) | **Google Cloud** |
|---|--------|--------------------------|------------------|
| Verification | Strict | Strict | Often easier |
| Always-on free VM | Yes (ARM, big) | **No** — ~6 months credits only | **Yes** — `e2-micro` 24/7 in `us-central1` |
| Good for 5 years? | Best | **No** (credits end) | **Yes** (Always Free tier) |
| Your NestJS + uploads | Yes | Yes (while credits last) | Yes (tight RAM — upgrade later) |

**Steps (GCP instead of Oracle):**

1. [console.cloud.google.com](https://console.cloud.google.com) → sign up with **bank debit card** (not Bybit).  
2. Create **e2-micro** VM, Ubuntu 22.04, region **`us-central1`** (Always Free).  
3. Same Docker setup as in this doc (`docker-compose.prod.yml`).  
4. Open firewall: TCP **3000** (or 80/443 with Caddy).  
5. Point domain / use VM external IP → set `VITE_API_URL` on mobile.

> **AWS is not a good 5-year free choice anymore:** new accounts get **~$200 credits for ~6 months**, then you pay or the free plan closes. It is **not** “lifetime free” like Oracle/GCP Always Free.

### If you cannot use any card at all → split stack (100% free, with tradeoffs)

| Piece | Service | Card? | Sleep? |
|-------|---------|-------|--------|
| **Database** | [Neon](https://neon.com) — sign up with **GitHub**, no card | **No** | DB scales to zero after ~5 min idle (first query ~1–2 s) |
| **API** | [Render](https://render.com) free web service | Usually no card for free tier | **Yes** — sleeps when idle |
| **Mobile PWA** | Vercel | No | No |

Use your existing `repdepot-4.onrender.com` pattern + Neon `DATABASE_URL`.  
**Not ideal for scanner/mobile** (API cold start 30–60 s). Acceptable only for testing until you get a bank card.

**Uploads on Render free:** disk is ephemeral — use Oracle/GCP VM, or later **Cloudflare R2** (10 GB free, needs card for some accounts).

### Practical recommendation for you

1. **Try Google Cloud** with a **local bank debit card** (Attijari, BIAT, etc.) + $1–5 balance — best Oracle replacement.  
2. **Do not use Bybit card** for cloud signup.  
3. **Avoid AWS** if your goal is **free for 5 years** (only ~6 months free now).  
4. **Temporary:** Neon (no card) + Render API while you sort out a bank card.

---

## Architecture (recommended)

```
[Mobile PWA — Vercel] ──HTTPS──► [api.votredomaine.tn]
[Web storefront]    ──HTTPS──►       │
[Backoffice client] ──HTTPS──►       ▼
                            [Cloudflare — optional]
                                    │
                            [Oracle VM — Always Free]
                              ├── Docker: PostgreSQL 16
                              ├── Docker: NestJS API :3000
                              └── Volume: /data/uploads
```

---

## Part 1 — Oracle Cloud (free, always on)

### 1.1 Create account

1. [cloud.oracle.com](https://www.oracle.com/cloud/free/) → **Always Free** account (credit card for verification, not charged if you stay in free limits).
2. Create an **Ampere A1** VM (ARM):
   - Shape: `VM.Standard.A1.Flex`
   - **2 OCPU, 12 GB RAM** (enough for API + Postgres + uploads for years)
   - Ubuntu 22.04
   - **Boot volume:** 50 GB
   - Add **Block volume 100 GB** (free tier allows 200 GB total) → mount for Postgres + uploads

### 1.2 Open firewall (Oracle + Ubuntu)

- Oracle VCN: allow inbound **22, 80, 443**
- On VM: `ufw allow 22,80,443/tcp`

### 1.3 Install Docker on the VM

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
# re-login
```

### 1.4 Clone & configure

```bash
git clone <your-repo> depot && cd depot/server
cp .env.example .env
nano .env
```

**Production `.env` (minimum):**

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://depot:STRONG_PASSWORD@postgres:5432/depot?schema=public

JWT_SECRET=<64+ random hex — node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">

GOOGLE_CLIENT_ID=<your-google-oauth-client>

WEB_URL=https://votre-boutique.vercel.app
CLIENT_URL=https://votre-backoffice.vercel.app
MOBILE_URL=https://votre-mobile.vercel.app
```

### 1.5 Docker Compose (API + Postgres)

Create `server/docker-compose.prod.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: depot
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: depot
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U depot"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: .
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    env_file: .env
    environment:
      DATABASE_URL: postgresql://depot:${POSTGRES_PASSWORD}@postgres:5432/depot?schema=public
    ports:
      - "3000:3000"
    volumes:
      - uploads:/app/uploads
    command: sh -c "pnpm prisma migrate deploy && node dist/main"

volumes:
  pgdata:
  uploads:
```

Create `server/Dockerfile`:

```dockerfile
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma
RUN pnpm prisma generate
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/main"]
```

Deploy:

```bash
export POSTGRES_PASSWORD='your-strong-password'
docker compose -f docker-compose.prod.yml up -d --build
```

### 1.6 Load the initial product catalog (one time)

The catalog is application data, so it is loaded separately from Prisma schema migrations. Run this once from the server directory after the API dependencies are installed:

```bash
pnpm prisma migrate deploy
pnpm seed:categories
pnpm seed:catalog
```

`seed:catalog` is safe to rerun: existing products with the same category and name are left unchanged. The seed creates products without photos when the local `mock/` images are not present; photos can then be uploaded from the product form or copied to the server separately.

### 1.7 HTTPS (Caddy — simple)

Install Caddy on the VM, `/etc/caddy/Caddyfile`:

```
api.votredomaine.tn {
  reverse_proxy localhost:3000
}
```

Point DNS **A record** → VM public IP (or use Cloudflare proxy).

---

## Part 2 — Backups (mandatory for 5 years)

Free does not mean “no backups”. On the VM, daily cron:

```bash
# /etc/cron.daily/depot-backup
docker exec <postgres_container> pg_dump -U depot depot | gzip > /backup/depot-$(date +%F).sql.gz
tar czf /backup/uploads-$(date +%F).tar.gz /var/lib/docker/volumes/.../uploads
# Copy to Backblaze B2 / Google Drive / second region (free tiers exist)
```

Keep **30 daily + 12 monthly** minimum.

---

## Part 3 — Mobile app (after API is live)

1. Deploy `mobile/` on **Vercel** (Root Directory: `mobile`).
2. Env: `VITE_API_URL=https://api.votredomaine.tn`
3. On server `.env`, set `MOBILE_URL=https://votre-mobile.vercel.app`
4. Restart API container.

Install on phone: Safari / Chrome → “Add to Home Screen” (see `mobile/DEPLOY.md`).

---

## Part 4 — If Oracle is too complex (paid fallback)

| Service | Cost | Sleep? |
|---------|------|--------|
| Render Web Service (Starter) | ~$7/mo | No |
| Render PostgreSQL (Starter) | ~$7/mo | No |
| **Total** | **~$14/mo** (~$840 / 5 yrs) | No |

Use **Render persistent disk** or migrate uploads to **Cloudflare R2** (10 GB free).

Your existing `Procfile` + `pnpm start` works on Render; set env vars like above and run `prisma migrate deploy` in build command.

---

## Checklist before go-live

- [ ] `JWT_SECRET` ≥ 32 chars (not placeholder)
- [ ] `pnpm prisma migrate deploy` on production DB
- [ ] CORS: `WEB_URL`, `CLIENT_URL`, `MOBILE_URL` set
- [ ] HTTPS only in production
- [ ] Admin user created (`pnpm create:user` or seed)
- [ ] Backups scheduled
- [ ] Mobile `VITE_API_URL` points to HTTPS API
- [ ] Google OAuth: add production origins in Google Console

---

## What NOT to use for your mobile + scanner use case

- **Render free tier** — API sleeps; scanner and login feel broken on first request.
- **Serverless-only hosts** for NestJS — file uploads and long-lived connections are painful.
- **Free DB without backups** — one mistake = 5 years of data gone.

---

## Quick reference — your repo

| App | Folder | Host |
|-----|--------|------|
| API | `server/` | Oracle VM or Render paid |
| Database | PostgreSQL | Same VM (Docker) or Render Postgres |
| Mobile PWA | `mobile/` | Vercel (free) |
| Web shop | `web/` | Vercel (free) |
| Backoffice | `client/` | Vercel (free) |
