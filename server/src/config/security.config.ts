import * as dotenv from "dotenv";

dotenv.config();

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set and at least 32 characters long before starting the server.",
    );
  }
  if (secret === "your-secret-key-change-in-production") {
    throw new Error("JWT_SECRET must not use the default placeholder value.");
  }
  return secret;
}

export function getGoogleClientId(): string | undefined {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  if (process.env.NODE_ENV === "production" && !id) {
    throw new Error("GOOGLE_CLIENT_ID must be set in production.");
  }
  return id || undefined;
}

export function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Vercel mobile PWA — allow any *.vercel.app over HTTPS in production. */
export function isVercelAppOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export function getCorsOrigins(): string[] {
  const raw = [
    process.env.WEB_URL,
    process.env.CLIENT_URL,
    process.env.MOBILE_URL,
    process.env.CORS_ORIGIN,
  ]
    .filter(Boolean)
    .flatMap((v) => v!.split(","))
    .map((v) => normalizeOrigin(v))
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    raw.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5170",
      "http://localhost:5173",
      "http://localhost:5171",
    );
  }

  return [...new Set(raw)];
}

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  const allowed = getCorsOrigins();
  if (allowed.some((a) => normalizeOrigin(a) === normalized)) return true;
  if (process.env.NODE_ENV === "production" && isVercelAppOrigin(normalized)) {
    return true;
  }
  return false;
}
