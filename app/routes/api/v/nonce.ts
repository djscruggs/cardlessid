/**
 * GET /api/v/nonce
 *
 * Issues a signed, expiring nonce for the stateless verification protocol.
 * No database write. The nonce is a signed token the server can verify later.
 *
 * Authentication: optional X-API-Key header for known integrators.
 * Set REQUIRE_INTEGRATOR_KEY=true to enforce authentication.
 * Unknown (unauthenticated) requests are allowed by default but logged.
 */

import { issueNonce } from "~/utils/nonce.server";
import { isEEARequest } from "~/utils/geo.server";
import { validateApiKey } from "~/utils/api-keys.server";
import { checkRateLimit } from "~/utils/api-auth.server";

const REQUIRE_INTEGRATOR_KEY = process.env.REQUIRE_INTEGRATOR_KEY === "true";
const NONCE_RATE_LIMIT = process.env.NONCE_RATE_LIMIT
  ? parseInt(process.env.NONCE_RATE_LIMIT, 10)
  : 1000;

export async function loader({ request }: { request: Request }) {
  if (isEEARequest(request)) {
    return Response.json(
      { error: "Service not available in your region" },
      { status: 451 }
    );
  }

  const url = new URL(request.url);
  const minAgeParam = url.searchParams.get("minAge");
  const siteId = url.searchParams.get("siteId") ?? undefined;
  const origin = request.headers.get("origin") ?? "unknown";
  const apiKey = request.headers.get("X-API-Key");

  const minAge = minAgeParam ? parseInt(minAgeParam, 10) : 18;
  if (isNaN(minAge) || minAge < 1 || minAge > 150) {
    return Response.json(
      { error: "Invalid minAge parameter (must be between 1 and 150)" },
      { status: 400 }
    );
  }

  // Optional API key authentication
  let integratorId: string | undefined;

  if (apiKey) {
    const integrator = await validateApiKey(apiKey);
    if (!integrator) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }
    integratorId = integrator.id;

    // Rate limit by integrator ID
    const rateLimitExceeded = checkRateLimit(integratorId, NONCE_RATE_LIMIT);
    if (rateLimitExceeded) {
      return Response.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    console.log("[API /v/nonce] authenticated", { integratorId, siteId: siteId ?? origin, minAge });
  } else if (REQUIRE_INTEGRATOR_KEY) {
    return Response.json({ error: "API key required" }, { status: 401 });
  } else {
    // Unauthenticated — allowed in soft-enforcement mode, but logged
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

    // Rate limit by IP for unauthenticated requests
    const rateLimitExceeded = checkRateLimit(`ip:${ip}`, NONCE_RATE_LIMIT);
    if (rateLimitExceeded) {
      return Response.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    console.warn("[API /v/nonce] unauthenticated request", { ip, origin, minAge });
  }

  const nonce = issueNonce(minAge, siteId, integratorId);

  return Response.json({ nonce, expiresIn: 300 });
}

export async function action() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
