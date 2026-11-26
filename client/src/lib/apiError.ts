/** Normalizes RTK Query / Nest errors into a readable French message + optional payload. */
export function apiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  const data = (error as { data?: unknown })?.data as { message?: unknown } | undefined;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(' · ');
  if (typeof msg === 'string') return msg;
  if (msg && typeof msg === 'object' && typeof (msg as any).message === 'string') return (msg as any).message;
  const status = (error as { status?: unknown })?.status;
  if (status === 'FETCH_ERROR') return 'Serveur injoignable. Vérifiez votre connexion.';
  return fallback;
}

export function apiErrorCode(error: unknown): string | undefined {
  const data = (error as { data?: any })?.data;
  return data?.code ?? data?.message?.code;
}

export function apiErrorPayload<T = any>(error: unknown): T | undefined {
  const data = (error as { data?: any })?.data;
  return (data?.code ? data : data?.message) as T | undefined;
}
