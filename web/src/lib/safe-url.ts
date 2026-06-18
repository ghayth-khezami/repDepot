const ALLOWED_SOCIAL_HOSTS = [
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "tiktok.com",
  "www.tiktok.com",
];

export function safeExternalUrl(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
