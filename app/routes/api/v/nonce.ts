/**
 * GET /api/v/nonce
 *
 * Issues a signed, expiring nonce for the stateless verification protocol.
 * No database write. The nonce is a signed token the server can verify later.
 */

import { issueNonce } from "~/utils/nonce.server";
import { isEEARequest } from "~/utils/geo.server";

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

  const minAge = minAgeParam ? parseInt(minAgeParam, 10) : 18;
  if (isNaN(minAge) || minAge < 1 || minAge > 150) {
    return Response.json(
      { error: "Invalid minAge parameter (must be between 1 and 150)" },
      { status: 400 }
    );
  }

  const nonce = issueNonce(minAge, siteId);

  console.log("[API /v/nonce] issued", { siteId: siteId ?? origin, origin, minAge });

  return Response.json({ nonce, expiresIn: 300 });
}

export async function action() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
