import { getApiOrigin } from './apiBase';

export async function downloadAuthenticatedFile(path: string, filename: string): Promise<void> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${getApiOrigin()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadProductLabel(productId: string, productName: string): Promise<void> {
  const safe = productName.replace(/[^a-z0-9-_]/gi, '_').slice(0, 40);
  return downloadAuthenticatedFile(`/products/${productId}/label/pdf`, `etiquette-${safe}.pdf`);
}

export function downloadAllProductLabels(): Promise<void> {
  return downloadAuthenticatedFile('/products/export/labels/pdf', 'etiquettes-code-barres.pdf');
}
