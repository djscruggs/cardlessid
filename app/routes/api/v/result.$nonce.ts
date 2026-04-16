/**
 * GET /api/v/result/:nonce
 *
 * Polls the TTL cache for a submitted proof. The integrator snippet calls
 * this every 1-2 seconds until the proof arrives or the nonce expires.
 */

import { getProof } from "~/utils/proof-cache.server";
import { isEEARequest } from "~/utils/geo.server";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { nonce: string };
}) {
  if (isEEARequest(request)) {
    return Response.json(
      { error: "Service not available in your region" },
      { status: 451 }
    );
  }

  const { nonce } = params;
  if (!nonce) {
    return Response.json({ error: "nonce is required" }, { status: 400 });
  }

  const proof = getProof(nonce);
  if (!proof) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({ proof });
}

export async function action() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
