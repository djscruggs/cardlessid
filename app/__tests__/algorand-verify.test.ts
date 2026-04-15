import { describe, it, expect, beforeAll } from "vitest";
import algosdk from "algosdk";
import { verifyAlgorandProof } from "~/utils/algorand-verify";
import type { SignedProof, SignedProofPayload } from "~/utils/algorand-verify";

/**
 * Tests for app/utils/algorand-verify.ts
 * Uses a real Algorand keypair generated locally — no network required.
 */

let account: algosdk.Account;
let walletAddress: string;

beforeAll(() => {
  account = algosdk.generateAccount();
  walletAddress = algosdk.encodeAddress(account.addr.publicKey);
});

/** Build a valid signed proof, with optional payload overrides */
function makeProof(overrides: Partial<SignedProofPayload> = {}): SignedProof {
  const payload: SignedProofPayload = {
    nonce: "test-nonce-abc123",
    walletAddress,
    minAge: 21,
    meetsRequirement: true,
    timestamp: Date.now(),
    ...overrides,
  };
  const message = Buffer.from(JSON.stringify(payload));
  const sigBytes = algosdk.signBytes(message, account.sk);
  return {
    payload,
    signature: Buffer.from(sigBytes).toString("base64url"),
  };
}

describe("verifyAlgorandProof", () => {
  it("verifies a valid proof signed by the correct keypair", () => {
    const proof = makeProof();
    const result = verifyAlgorandProof(proof);
    expect(result.valid).toBe(true);
  });

  it("returns the full payload on success", () => {
    const proof = makeProof({ minAge: 18, meetsRequirement: false });
    const result = verifyAlgorandProof(proof);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.minAge).toBe(18);
      expect(result.payload.meetsRequirement).toBe(false);
    }
  });

  it("verifies meetsRequirement: false (boolean doesn't affect signature validity)", () => {
    const proof = makeProof({ meetsRequirement: false });
    const result = verifyAlgorandProof(proof);
    expect(result.valid).toBe(true);
  });

  it("rejects a tampered payload field", () => {
    const proof = makeProof();
    // Tamper: change minAge in payload after signing
    const tampered: SignedProof = {
      ...proof,
      payload: { ...proof.payload, minAge: 18 },
    };
    const result = verifyAlgorandProof(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("signature verification failed");
  });

  it("rejects a proof signed by a different keypair but claiming another wallet address", () => {
    const otherAccount = algosdk.generateAccount();

    // Sign with otherAccount but claim walletAddress (original account)
    const payload: SignedProofPayload = {
      nonce: "nonce",
      walletAddress, // claims original account's address
      minAge: 21,
      meetsRequirement: true,
      timestamp: Date.now(),
    };
    const message = Buffer.from(JSON.stringify(payload));
    const sigBytes = algosdk.signBytes(message, otherAccount.sk); // signed by wrong key
    const proof: SignedProof = {
      payload,
      signature: Buffer.from(sigBytes).toString("base64url"),
    };
    const result = verifyAlgorandProof(proof);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("signature verification failed");
  });

  it("rejects an invalid Algorand address format", () => {
    const proof = makeProof({ walletAddress: "NOT_A_VALID_ADDRESS" });
    // Re-sign with the bad address in payload
    const message = Buffer.from(JSON.stringify(proof.payload));
    const sigBytes = algosdk.signBytes(message, account.sk);
    const invalidProof: SignedProof = {
      payload: proof.payload,
      signature: Buffer.from(sigBytes).toString("base64url"),
    };
    const result = verifyAlgorandProof(invalidProof);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("invalid walletAddress");
  });

  it("rejects a malformed base64url signature", () => {
    const proof = makeProof();
    const badProof: SignedProof = { ...proof, signature: "!!!not-base64url!!!" };
    // Buffer.from with base64url is lenient — this may not throw; it might produce wrong bytes
    // Either way the signature will be invalid
    const result = verifyAlgorandProof(badProof);
    expect(result.valid).toBe(false);
  });

  it("rejects a timestamp older than 5 minutes", () => {
    const proof = makeProof({ timestamp: Date.now() - 6 * 60 * 1000 });
    // We need to re-sign with the stale timestamp so signature is valid but timestamp fails
    const message = Buffer.from(JSON.stringify(proof.payload));
    const sigBytes = algosdk.signBytes(message, account.sk);
    const staleProof: SignedProof = {
      payload: proof.payload,
      signature: Buffer.from(sigBytes).toString("base64url"),
    };
    const result = verifyAlgorandProof(staleProof);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("proof timestamp out of acceptable window");
  });

  it("rejects a timestamp in the future", () => {
    const futurePayload: SignedProofPayload = {
      nonce: "nonce",
      walletAddress,
      minAge: 21,
      meetsRequirement: true,
      timestamp: Date.now() + 60_000,
    };
    const message = Buffer.from(JSON.stringify(futurePayload));
    const sigBytes = algosdk.signBytes(message, account.sk);
    const futureProof: SignedProof = {
      payload: futurePayload,
      signature: Buffer.from(sigBytes).toString("base64url"),
    };
    const result = verifyAlgorandProof(futureProof);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("proof timestamp out of acceptable window");
  });

  it("accepts a timestamp at the boundary (exactly 5 minutes ago)", () => {
    const boundaryPayload: SignedProofPayload = {
      nonce: "nonce",
      walletAddress,
      minAge: 21,
      meetsRequirement: true,
      timestamp: Date.now() - 5 * 60 * 1000 + 500, // just inside window
    };
    const message = Buffer.from(JSON.stringify(boundaryPayload));
    const sigBytes = algosdk.signBytes(message, account.sk);
    const boundaryProof: SignedProof = {
      payload: boundaryPayload,
      signature: Buffer.from(sigBytes).toString("base64url"),
    };
    const result = verifyAlgorandProof(boundaryProof);
    expect(result.valid).toBe(true);
  });
});
