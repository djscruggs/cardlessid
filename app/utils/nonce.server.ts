/**
 * Nonce generation and verification for the stateless verification protocol.
 * Signs nonces with HMAC-SHA256 so the server can verify them at submit time
 * without any database lookup.
 */

import { createHmac, timingSafeEqual } from "crypto";

/** Nonce expires after 5 minutes */
const NONCE_EXPIRY_MS = 5 * 60 * 1000;

export interface NoncePayload {
  /** Random value for uniqueness */
  jti: string;
  /** Issued-at timestamp (ms) */
  iat: number;
  /** Expiry timestamp (ms) */
  exp: number;
  /** Minimum age requirement embedded at issuance */
  minAge: number;
  /** Optional public site identifier for analytics */
  siteId?: string;
  /** Integrator ID if the request was authenticated with an API key */
  integratorId?: string;
}

function getSecret(): string {
  const secret = process.env.NONCE_SECRET;
  if (!secret) throw new Error("NONCE_SECRET env var is required");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/**
 * Issue a signed nonce JWT-style token.
 * @param minAge Minimum age requirement to embed in the nonce
 * @param siteId Optional public site ID for analytics attribution
 * @param integratorId Optional integrator ID if request was authenticated with an API key
 * @returns Dot-separated base64url string: payload.signature
 */
export function issueNonce(minAge: number, siteId?: string, integratorId?: string): string {
  const payload: NoncePayload = {
    jti: Math.random().toString(36).slice(2) + Date.now().toString(36),
    iat: Date.now(),
    exp: Date.now() + NONCE_EXPIRY_MS,
    minAge,
    ...(siteId ? { siteId } : {}),
    ...(integratorId ? { integratorId } : {}),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export type VerifyNonceResult =
  | { valid: true; payload: NoncePayload }
  | { valid: false; error: string };

/**
 * Verify a nonce token and return its payload.
 * @param token Nonce string previously returned by issueNonce
 * @returns Discriminated union with valid flag and payload or error
 */
export function verifyNonce(token: string): VerifyNonceResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, error: "malformed nonce" };

  const [encoded, sig] = parts;
  const expectedSig = sign(encoded);

  // Timing-safe comparison
  const sigBuf = Buffer.from(sig, "base64url");
  const expectedBuf = Buffer.from(expectedSig, "base64url");
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return { valid: false, error: "invalid signature" };
  }

  let payload: NoncePayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return { valid: false, error: "malformed payload" };
  }

  if (Date.now() > payload.exp) {
    return { valid: false, error: "nonce expired" };
  }

  return { valid: true, payload };
}
