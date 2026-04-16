/**
 * POST /api/v/submit
 *
 * Accepts a signed proof from the wallet, verifies the nonce, and stores
 * the proof in the TTL cache for pickup by the integrator snippet.
 */

import { verifyNonce } from "~/utils/nonce.server";
import { storeProof } from "~/utils/proof-cache.server";
import { verifyAlgorandProof } from "~/utils/algorand-verify";
import { isEEARequest } from "~/utils/geo.server";
import type { SignedProof } from "~/utils/algorand-verify";

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (isEEARequest(request)) {
    return Response.json(
      { error: "Service not available in your region" },
      { status: 451 }
    );
  }

  let body: { nonce?: unknown; signedProof?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { nonce, signedProof } = body;

  if (typeof nonce !== "string") {
    return Response.json({ error: "nonce is required" }, { status: 400 });
  }

  if (!signedProof || typeof signedProof !== "object") {
    return Response.json({ error: "signedProof is required" }, { status: 400 });
  }

  // Verify the nonce is valid and not expired
  const nonceResult = verifyNonce(nonce);
  if (!nonceResult.valid) {
    return Response.json(
      { error: `Invalid nonce: ${nonceResult.error}` },
      { status: 400 }
    );
  }

  // Verify the Algorand signature on the proof
  const proofResult = verifyAlgorandProof(signedProof as SignedProof);
  if (!proofResult.valid) {
    return Response.json(
      { error: `Invalid proof: ${proofResult.error}` },
      { status: 400 }
    );
  }

  // Confirm the proof's nonce matches the submitted nonce
  if (proofResult.payload.nonce !== nonce) {
    return Response.json(
      { error: "Proof nonce does not match submitted nonce" },
      { status: 400 }
    );
  }

  // Confirm minAge in proof matches what was issued in the nonce
  if (proofResult.payload.minAge !== nonceResult.payload.minAge) {
    return Response.json(
      { error: "Proof minAge does not match nonce minAge" },
      { status: 400 }
    );
  }

  // Store in TTL cache — evicts in 60s
  storeProof(nonce, signedProof);

  const origin = request.headers.get("origin") ?? "unknown";
  console.log("[API /v/submit] proof stored", {
    siteId: nonceResult.payload.siteId ?? origin,
    origin,
    walletAddress: proofResult.payload.walletAddress,
    meetsRequirement: proofResult.payload.meetsRequirement,
  });

  return Response.json({ success: true });
}

export async function loader() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
