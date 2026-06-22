import { getApiOrigin } from './apiBase';
import { compressImageForUpload } from './compressImage';

export async function uploadStagingPhoto(file: File): Promise<string> {
  const token = localStorage.getItem('token');
  const optimized = await compressImageForUpload(file);
  const fd = new FormData();
  fd.append('file', optimized);

  const res = await fetch(`${getApiOrigin()}/media/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Upload failed (${res.status})`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}
