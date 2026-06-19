import { getApiOrigin } from './apiBase';

export function getWsOrigin(): string {
  return getApiOrigin();
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function ensureServiceWorkerReady(timeoutMs = 12000): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker non supporté sur cet appareil.');
  }

  const existing = await navigator.serviceWorker.getRegistration('/');
  if (!existing) {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* vite-plugin-pwa may already register under a hashed filename */
    });
  }

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) => {
      window.setTimeout(() => reject(new Error('Service worker indisponible — réessayez après avoir rouvert l’app.')), timeoutMs);
    }),
  ]);
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export type PushRegisterResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'server' | 'error'; message: string };

export async function registerPushSubscription(
  vapidPublicKey: string,
  subscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) => Promise<unknown>,
): Promise<PushRegisterResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported', message: 'Notifications push non supportées sur ce navigateur.' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return {
      ok: false,
      reason: 'denied',
      message: 'Autorisez les notifications dans les réglages du téléphone pour cette app.',
    };
  }

  const reg = await ensureServiceWorkerReady();
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'error', message: 'Abonnement push incomplet — réessayez.' };
  }

  await subscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });

  return { ok: true };
}

export function showSystemNotification(title: string, body: string, linkPath?: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon: '/logo.png',
    tag: 'bebedepot-live',
  });
  n.onclick = () => {
    window.focus();
    if (linkPath) window.location.href = linkPath;
    n.close();
  };
}
