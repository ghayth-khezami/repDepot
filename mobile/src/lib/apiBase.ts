export function getApiOrigin(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

export function getApiBaseUrl(): string {
  return import.meta.env.DEV ? '/api' : getApiOrigin();
}

export function uploadUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return import.meta.env.DEV ? normalized : `${getApiOrigin()}${normalized}`;
}

export function formatTnd(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} TND`;
}
