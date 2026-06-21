/** API origin for JSON requests (RTK Query uses /api proxy in dev). */
export function getApiOrigin(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

/** Base URL for RTK Query — proxied in dev to avoid CORS. */
export function getApiBaseUrl(): string {
  return import.meta.env.DEV ? '/api' : getApiOrigin();
}

/** Full URL for uploaded assets (Cloudinary HTTPS or legacy /uploads/...). */
export function uploadUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getApiOrigin()}${normalized}`;
}
