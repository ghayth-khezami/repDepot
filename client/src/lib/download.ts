import { getApiBaseUrl } from './apiBase';

export class ApiFileError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

/** Fetches a protected file (PDF/CSV) with the admin token. Throws ApiFileError with the JSON body on failure. */
export async function fetchAuthedBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error */
    }
    const message =
      (body && typeof body === 'object' && 'message' in body && typeof (body as any).message === 'string'
        ? (body as any).message
        : null) ?? `Erreur ${res.status}`;
    throw new ApiFileError(message, res.status, body);
  }
  return res.blob();
}

const MIME: Record<string, string> = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv' };

const isAppleMobile = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * Saves a file with its real name and type. On iPhone / iPad and in the installed app, `<a download>`
 * only opens a preview — there the share sheet is used ("Enregistrer dans Fichiers", WhatsApp…).
 */
export async function saveBlob(blob: Blob, filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const typed = MIME[ext] && blob.type !== MIME[ext] ? new Blob([blob], { type: MIME[ext] }) : blob;
  if (isAppleMobile() || isStandalone()) {
    try {
      const file = new File([typed], filename, { type: typed.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // closed the share sheet
    }
  }
  const url = URL.createObjectURL(typed);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadAuthed(path: string, filename: string) {
  await saveBlob(await fetchAuthedBlob(path), filename);
}

/** Opens a protected PDF in a hidden iframe and triggers the print dialog. */
export async function printAuthedPdf(path: string) {
  const blob = await fetchAuthedBlob(path);
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  };
  document.body.appendChild(frame);
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 120_000);
}
