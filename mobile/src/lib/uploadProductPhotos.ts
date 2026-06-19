import { getApiOrigin } from './apiBase';

export async function uploadProductPhotos(productId: string, files: File[]): Promise<void> {
  if (!files.length) return;
  const token = localStorage.getItem('token');
  const fd = new FormData();
  fd.append('productId', productId);
  files.forEach((f) => fd.append('files', f));

  const res = await fetch(`${getApiOrigin()}/product-photos/upload-multiple`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Upload failed (${res.status})`);
  }
}
