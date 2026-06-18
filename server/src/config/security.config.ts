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

export function getCorsOrigins(): string[] {
  const raw = [
    process.env.WEB_URL,
    process.env.CLIENT_URL,
    process.env.MOBILE_URL,
    process.env.CORS_ORIGIN,
  ]
    .filter(Boolean)
    .flatMap((v) => v!.split(","))
    .map((v) => v.trim())
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
