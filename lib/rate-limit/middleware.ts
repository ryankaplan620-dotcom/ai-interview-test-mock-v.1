/**
 * Higher-order route wrapper that applies a rate-limit check before invoking
 * the inner handler. Returns a proper 429 with Retry-After header when the
 * limit is tripped.
 *
 * Usage (inside an API route):
 *
 *   export const POST = withRateLimit(
 *     RATE_LIMITS.tavus_conversation,
 *     async (req, ctx) => {
 *       // ctx.user is already resolved
 *       // ... normal handler body
 *     }
 *   );
 *
 * The wrapper also resolves the user and short-circuits to 401 if unauth'd.
 * That lets route handlers skip the auth dance while still guaranteeing the
 * rate limit is keyed on the authenticated user ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { checkRateLimit, type RateLimitConfig } from "./index";

export interface AuthedContext {
  user: { id: string };
}

export type AuthedHandler = (
  req: NextRequest,
  ctx: AuthedContext,
) => Promise<NextResponse>;

export function withRateLimit(
  config: RateLimitConfig,
  handler: AuthedHandler,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const result = await checkRateLimit({ userId: user.id, config });

    if (!result.allowed) {
      // Structured 429. Client can distinguish which limit tripped via
      // `trippedWindow` and surface a specific UI message.
      return NextResponse.json(
        {
          error: "rate_limited",
          limit: config.name,
          tripped_window: result.trippedWindow,
          retry_after_seconds: result.retryAfterSeconds,
          message: result.message,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSeconds),
            // Advisory headers — not standardized but widely expected
            "X-RateLimit-Limit": String(
              result.trippedWindow === "short" ? config.short.max : config.daily.max,
            ),
            "X-RateLimit-Window-Seconds": String(
              result.trippedWindow === "short"
                ? config.short.windowSeconds
                : config.daily.windowSeconds,
            ),
          },
        },
      );
    }

    return handler(req, { user: { id: user.id } });
  };
}
