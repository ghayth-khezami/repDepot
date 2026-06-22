import { getApiOrigin } from './apiBase';

export async function attachProductPhotos(productId: string, photoDocs: string[]): Promise<void> {
  const urls = photoDocs.filter((u) => u.startsWith('http'));
  if (!urls.length) return;
  const token = localStorage.getItem('token');
  const res = await fetch(`${getApiOrigin()}/product-photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ productId, photoDocs: urls }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Attach failed (${res.status})`);
  }
}
