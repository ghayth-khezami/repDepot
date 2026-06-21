export function getApiOrigin(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined' && !import.meta.env.DEV) {
    console.warn('[depot] VITE_API_URL manquant au build — les photos API ne s’afficheront pas.');
  }
  return 'http://localhost:3000';
}

export function getApiBaseUrl(): string {
  return import.meta.env.DEV ? '/api' : getApiOrigin();
}

export function uploadUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (!normalized.startsWith('/uploads/') && !normalized.startsWith('/uploads')) {
    const bare = path.replace(/^\/+/, '');
    if (bare && !bare.includes('/')) {
      normalized = `/uploads/${bare}`;
    }
  }

  // Legacy /uploads on API — new uploads use full Cloudinary URLs
  if (import.meta.env.DEV) return normalized;
  return `${getApiOrigin()}${normalized}`;
}

/** True when the asset is served from Cloudinary CDN (not local disk). */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com');
}

export function formatTnd(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} TND`;
}
