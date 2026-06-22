import { getApiOrigin } from './apiBase';
import { compressImagesForUpload } from './compressImage';
import type { CreateProductDto } from '../store/api/productApi';

export async function createProductWithPhotos(
  data: CreateProductDto,
  photos: File[],
): Promise<unknown> {
  const token = localStorage.getItem('token');
  const optimized = photos.length ? await compressImagesForUpload(photos) : [];
  const fd = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      fd.append(key, String(value));
    }
  });
  optimized.forEach((f) => fd.append('photos', f));

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
