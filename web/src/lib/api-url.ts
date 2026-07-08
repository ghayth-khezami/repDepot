/** Remote Nest API (from env). Server-side and image URLs always use this. */
export function getRemoteApiUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
}

function isLocalApi(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * URL for browser fetch(). In dev, proxies remote APIs via /api-proxy to avoid CORS.
 */
export function getClientApiUrl(): string {
  const remote = getRemoteApiUrl();
  if (
    typeof window !== "undefined" &&
    process.env.NODE_ENV === "development" &&
    !isLocalApi(remote)
  ) {
    return "/api-proxy";
  }
  return remote;
}

export const getServerApiUrl = getRemoteApiUrl;
