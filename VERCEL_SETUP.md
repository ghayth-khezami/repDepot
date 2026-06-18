# Vercel Configuration Instructions

Follow these steps when importing your project on Vercel:

## Step-by-Step Configuration

### 1. Framework Preset
- Select: **Vite** (or "Other" if Vite is not listed)

### 2. Root Directory
- Click "Edit" next to Root Directory
- Set to: **`client`**

### 3. Build and Output Settings

**Build Command:**
```
pnpm run build
```

**Output Directory:**
```
dist
```

**Install Command:**
```
pnpm install --no-frozen-lockfile
```

### 4. Environment Variables

Add the following environment variable:

**Key:** `VITE_API_URL`  
**Value:** `https://repdepot-4.onrender.com`

### 5. Deploy

Click the "Deploy" button to start the deployment.

## Important Notes

- ✅ Use **pnpm** for builds
- ✅ **IMPORTANT:** Set the **Root Directory** to `client` in the Vercel dashboard UI (NOT in vercel.json)
- ✅ The `vercel.json` file will use the build and install commands you specify
- ✅ Environment variables set here will override any `.env` files

## After Deployment

Once deployed, you can update environment variables later in:
**Project Settings → Environment Variables**
