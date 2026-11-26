import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { timingSafeEqual } from "crypto";

const WINDOW_MS = 60_000;
const LIMIT = 40;

/**
 * Per-IP fixed-window limiter for the public tracking endpoint.
 * The global throttler skips GET requests, so this route gets its own guard.
 * The Next.js server (ISR) may bypass it with `x-internal-key: $INTERNAL_API_KEY`,
 * otherwise every visitor would share the Next server's IP.
 */
@Injectable()
export class SuiviRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ ip?: string; headers: Record<string, string | string[] | undefined> }>();

    const key = process.env.INTERNAL_API_KEY;
    const sent = req.headers["x-internal-key"];
    if (
      key &&
      typeof sent === "string" &&
      sent.length === key.length &&
      timingSafeEqual(Buffer.from(sent), Buffer.from(key))
    ) {
      return true;
    }

    const now = Date.now();
    const ip = req.ip || "unknown";
    const entry = this.hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      if (this.hits.size > 10_000) this.sweep(now);
      return true;
    }
    entry.count++;
    if (entry.count > LIMIT) {
      throw new HttpException("Trop de requêtes, réessayez dans une minute.", HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }

  private sweep(now: number) {
    for (const [ip, e] of this.hits) if (e.resetAt <= now) this.hits.delete(ip);
  }
}
