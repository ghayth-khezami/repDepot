import { getApiOrigin } from './apiBase';
import type { CreateProductDto } from '../store/api/productApi';

export async function createProductWithPhotos(
  data: CreateProductDto & { subCategoryId?: string; markId?: string },
  photos: File[],
  marqueFile?: File | null,
): Promise<unknown> {
  const token = localStorage.getItem('token');
  const fd = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      fd.append(key, String(value));
    }
  });
  photos.forEach((f) => fd.append('photos', f));
  if (marqueFile) fd.append('marque', marqueFile);

  const res = await fetch(`${getApiOrigin()}/products/with-photos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Create failed (${res.status})`);
  }
  return res.json();
}
