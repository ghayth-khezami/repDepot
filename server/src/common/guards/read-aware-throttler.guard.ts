import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerRequest } from "@nestjs/throttler";

const THROTTLER_LIMIT = "THROTTLER:LIMIT"; // @nestjs/throttler metadata key prefix

/**
 * - Reads (GET/HEAD/OPTIONS) are never throttled.
 * - Named throttlers (auth, checkout, deposit, newsletter) apply ONLY to routes that opt in with
 *   `@Throttle({ <name>: … })`. Without this, every write in the app was limited by the strictest one
 *   (newsletter: 5 / min), so e.g. marking 6 articles as paid failed with 429.
 * - Every other write keeps the "default" limit.
 */
@Injectable()
export class ReadAwareThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (await super.shouldSkip(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ method?: string }>();
    return request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS";
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const name = requestProps.throttler.name ?? "default";
    if (name !== "default") {
      const { context } = requestProps;
      const optedIn = this.reflector.getAllAndOverride(THROTTLER_LIMIT + name, [context.getHandler(), context.getClass()]);
      if (optedIn === undefined) return true;
    }
    return super.handleRequest(requestProps);
  }
}
