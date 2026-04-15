/**
 * Verifies Algorand ed25519 signatures on signed verification proofs.
 * Used by the relying party to confirm a proof was produced by the holder
 * of the stated wallet address.
 */

import algosdk from "algosdk";

export interface SignedProofPayload {
  nonce: string;
  walletAddress: string;
  minAge: number;
  meetsRequirement: boolean;
  timestamp: number;
}

export interface SignedProof {
  payload: SignedProofPayload;
  /** Base64url-encoded ed25519 signature over canonical JSON of payload */
  signature: string;
}

export type VerifyProofResult =
  | { valid: true; payload: SignedProofPayload }
  | { valid: false; error: string };

/**
 * Verify an Algorand ed25519 signature on a signed proof.
 * Checks:
 *   1. walletAddress is a valid Algorand address
 *   2. signature is valid over canonical JSON of payload (via algosdk.verifyBytes)
 *   3. timestamp is within a 5-minute window
 * @param proof The SignedProof object from the wallet
 * @returns Discriminated union with valid flag and payload or error
 */
export function verifyAlgorandProof(proof: SignedProof): VerifyProofResult {
  const { payload, signature } = proof;

  // 1. Validate wallet address format
  if (!algosdk.isValidAddress(payload.walletAddress)) {
    return { valid: false, error: "invalid walletAddress" };
  }

  // 2. Verify signature — algosdk.verifyBytes prepends the Algorand signing prefix
  //    and checks against the public key derived from walletAddress
  let sigBytes: Uint8Array;
  try {
    sigBytes = Buffer.from(signature, "base64url");
  } catch {
    return { valid: false, error: "invalid signature encoding" };
  }

  const message = Buffer.from(JSON.stringify(payload));
  let valid: boolean;
  try {
    valid = algosdk.verifyBytes(message, sigBytes, payload.walletAddress);
  } catch {
    return { valid: false, error: "signature verification failed" };
  }

  if (!valid) {
    return { valid: false, error: "signature verification failed" };
  }

  // 3. Check timestamp freshness (5-minute window)
  const age = Date.now() - payload.timestamp;
  if (age < 0 || age > 5 * 60 * 1000) {
    return { valid: false, error: "proof timestamp out of acceptable window" };
  }

  return { valid: true, payload };
}
