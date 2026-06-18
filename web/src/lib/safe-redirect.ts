/** Allow only same-origin relative paths (blocks open redirects). */
export function safeRedirect(raw: string | null | undefined, fallback = "/checkout"): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;
  return value;
}
