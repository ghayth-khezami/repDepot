import { ThrottlerGuard } from "@nestjs/throttler";
import { ReadAwareThrottlerGuard } from "./read-aware-throttler.guard";

function makeGuard(metadata: Record<string, unknown>) {
  const reflector: any = { getAllAndOverride: (key: string) => metadata[key] };
  const guard = new ReadAwareThrottlerGuard({ throttlers: [] } as any, {} as any, reflector);
  const context: any = { getHandler: () => () => undefined, getClass: () => class {} };
  return { guard, context };
}

describe("ReadAwareThrottlerGuard", () => {
  const superSpy = jest.spyOn(ThrottlerGuard.prototype as any, "handleRequest").mockResolvedValue("counted");
  afterAll(() => superSpy.mockRestore());
  beforeEach(() => superSpy.mockClear());

  it("does not apply a named throttler (newsletter) to routes that did not opt in", async () => {
    const { guard, context } = makeGuard({});
    const res = await (guard as any).handleRequest({ context, throttler: { name: "newsletter" } });
    expect(res).toBe(true);
    expect(superSpy).not.toHaveBeenCalled();
  });

  it("applies a named throttler to routes decorated with @Throttle({ name })", async () => {
    const { guard, context } = makeGuard({ "THROTTLER:LIMITnewsletter": 5 });
    expect(await (guard as any).handleRequest({ context, throttler: { name: "newsletter" } })).toBe("counted");
  });

  it("always applies the default throttler", async () => {
    const { guard, context } = makeGuard({});
    expect(await (guard as any).handleRequest({ context, throttler: { name: "default" } })).toBe("counted");
  });
});
