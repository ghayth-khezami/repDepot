# BÉBÉ-DÉPÔT — Mobile Admin PWA

Application admin installable (PWA) pour iPhone et Android. Connectée à l'API NestJS existante.

## Prérequis

- Node.js 20+
- pnpm
- API backend en marche (`server/`)
- Compte **ADMIN** pour se connecter

## 1. Configuration locale

```bash
cd mobile
cp .env.example .env
```

Éditez `.env` :

```env
VITE_API_URL=http://localhost:3000
```

Sur le **serveur**, ajoutez dans `.env` :

```env
MOBILE_URL=http://localhost:5171
# ou en prod : MOBILE_URL=https://votre-app.vercel.app
```

Appliquez la migration barcode :

```bash
cd ../server
pnpm prisma migrate deploy
pnpm prisma generate
```

## 2. Lancer en développement

Terminal 1 — API :

```bash
cd server
pnpm start:dev
```

Terminal 2 — Mobile :

```bash
cd mobile
pnpm install
pnpm dev
```

Ouvrez **http://localhost:5171** sur votre téléphone (même Wi‑Fi) ou simulateur.

> En dev, les appels API passent par le proxy Vite `/api` → pas de souci CORS.

## 3. Build production

```bash
cd mobile
pnpm build
pnpm preview
```

Les fichiers statiques sont dans `mobile/dist/`.

## 4. Déployer (recommandé : Vercel)

### Option A — Vercel (gratuit, HTTPS obligatoire pour PWA + caméra)

1. Créez un compte sur [vercel.com](https://vercel.com)
2. Importez le repo GitHub
3. **Root Directory** : `mobile`
4. **Framework** : Vite
5. Variable d'environnement :
   - `VITE_API_URL` = `https://repdepot-4.onrender.com` (votre API prod)
6. Deploy

Sur le **serveur Render/Railway**, ajoutez l'URL Vercel à CORS :

```env
MOBILE_URL=https://votre-app.vercel.app
```

### Option B — Netlify

1. [netlify.com](https://netlify.com) → New site from Git
2. Base directory : `mobile`
3. Build : `pnpm build`
4. Publish : `dist`
5. Env : `VITE_API_URL`

### Option C — Hébergement statique (Nginx, Cloudflare Pages)

Uploadez le contenu de `dist/` et configurez le fallback SPA vers `index.html`.

## 5. Installer sur téléphone

### iPhone (Safari obligatoire)

1. Ouvrez l'URL HTTPS de l'app dans **Safari**
2. Bouton **Partager** (carré avec flèche)
3. **Sur l'écran d'accueil**
4. L'icône apparaît comme une app native

> iOS ne propose pas d'install popup automatique — c'est normal.

### Android (Chrome)

1. Ouvrez l'URL HTTPS dans Chrome
2. Menu **⋮** → **Installer l'application** ou bannière « Ajouter à l'écran d'accueil »
3. L'app s'ouvre en plein écran (standalone)

## 6. Scanner code-barres

- Chaque **nouveau produit** reçoit un code-barres auto (13 chiffres)
- Imprimez étiquette : code + **Prix TND**
- Onglet **Scanner** → caméra → bip → fiche produit → **Marquer comme vendu**
- Saisie manuelle possible si la caméra échoue

Endpoint API : `GET /products/by-barcode/:code` (admin JWT)

## 7. Fonctionnalités

| Zone | Écrans |
|------|--------|
| Barre du bas | Accueil, Produits, Scanner, Commandes, Profil |
| Menu latéral | Catégories, Marques, Clients, Déposants, Demandes dépôt, Coups de cœur, Horaires, Avis, Newsletter, Utilisateurs |

Pagination serveur : **10 par page**, recherche et filtres côté API.

## 8. Icônes PWA

Remplacez `public/pwa-192.png` et `public/pwa-512.png` par votre logo carré (PNG).

## 9. Dépannage

| Problème | Solution |
|----------|----------|
| Login échoue | Vérifier `VITE_API_URL`, compte ADMIN |
| CORS en prod | `MOBILE_URL` sur le serveur |
| Caméra ne marche pas | HTTPS obligatoire (pas en HTTP sauf localhost) |
| Scan introuvable | `pnpm prisma migrate deploy` + produit créé après migration |
| Boucle produits | Mettre à jour l'app (dernière version) |
