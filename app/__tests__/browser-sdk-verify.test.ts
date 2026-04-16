/**
 * Tests for the browser SDK verifyProof function.
 * Uses algosdk to produce real Algorand ed25519 signatures and verifies
 * that our tweetnacl-based browser implementation accepts them.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import algosdk from "algosdk";

// Import the verify function from the SDK source (not the built output)
// We reference it directly so vitest can resolve the @ts-ignore imports
import { verifyProof, verifyProofOnChain } from "../../sdk/browser/src/index";
import type { SignedProof, SignedProofPayload } from "../../sdk/browser/src/index";

function signProof(
  account: algosdk.Account,
  payload: SignedProofPayload
): SignedProof {
  const message = Buffer.from(JSON.stringify(payload));
  const sigBytes = algosdk.signBytes(message, account.sk);
  return {
    payload,
    signature: Buffer.from(sigBytes).toString("base64url"),
  };
}

describe("verifyProof", () => {
  let account: algosdk.Account;
  let basePayload: SignedProofPayload;

  beforeEach(() => {
    account = algosdk.generateAccount();
    basePayload = {
      nonce: "test-nonce-abc123",
      walletAddress: algosdk.encodeAddress(account.addr.publicKey),
      minAge: 21,
      meetsRequirement: true,
      timestamp: Date.now(),
    };
  });

  it("accepts a valid proof signed by the wallet", () => {
    const proof = signProof(account, basePayload);
    const result = verifyProof(proof);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.meetsRequirement).toBe(true);
      expect(result.payload.minAge).toBe(21);
    }
  });

  it("accepts meetsRequirement: false", () => {
    const payload = { ...basePayload, meetsRequirement: false };
    const proof = signProof(account, payload);
    const result = verifyProof(proof);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.meetsRequirement).toBe(false);
    }
  });

  it("rejects a proof with a tampered payload", () => {
    const proof = signProof(account, basePayload);
    // Tamper: flip meetsRequirement after signing
    const tampered: SignedProof = {
      ...proof,
      payload: { ...proof.payload, meetsRequirement: false },
    };
    const result = verifyProof(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/signature/);
    }
  });

  it("rejects a proof signed by a different account", () => {
    const otherAccount = algosdk.generateAccount();
    const proof = signProof(otherAccount, {
      ...basePayload,
      walletAddress: algosdk.encodeAddress(account.addr.publicKey), // claim original wallet
    });
    const result = verifyProof(proof);
    expect(result.valid).toBe(false);
  });

  it("rejects a proof with an invalid walletAddress", () => {
    const proof = signProof(account, basePayload);
    const invalid: SignedProof = {
      ...proof,
      payload: { ...proof.payload, walletAddress: "NOT_A_VALID_ADDRESS" },
    };
    const result = verifyProof(invalid);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/walletAddress/);
    }
  });

  it("rejects a proof with an invalid signature encoding", () => {
    const proof = signProof(account, basePayload);
    const invalid: SignedProof = { ...proof, signature: "%%%invalid%%%" };
    const result = verifyProof(invalid);
    expect(result.valid).toBe(false);
  });

  it("rejects a proof with a stale timestamp (>5 minutes)", () => {
    const stalePayload: SignedProofPayload = {
      ...basePayload,
      timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes ago
    };
    const proof = signProof(account, stalePayload);
    const result = verifyProof(proof);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/timestamp/);
    }
  });

  it("rejects a proof with a future timestamp", () => {
    const futurePayload: SignedProofPayload = {
      ...basePayload,
      timestamp: Date.now() + 60_000, // 1 minute in the future
    };
    const proof = signProof(account, futurePayload);
    const result = verifyProof(proof);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/timestamp/);
    }
  });
});

describe("verifyProofOnChain", () => {
  let account: algosdk.Account;
  let basePayload: SignedProofPayload;

  beforeEach(() => {
    account = algosdk.generateAccount();
    basePayload = {
      nonce: "test-nonce-abc123",
      walletAddress: algosdk.encodeAddress(account.addr.publicKey),
      minAge: 21,
      meetsRequirement: true,
      timestamp: Date.now(),
    };
    vi.restoreAllMocks();
  });

  it("returns valid with credentialCount when wallet has credential on-chain", async () => {
    const proof = signProof(account, basePayload);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ verified: true, credentialCount: 1 }),
    }));
    const result = await verifyProofOnChain(proof);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.credentialCount).toBe(1);
      expect(result.payload.meetsRequirement).toBe(true);
    }
  });

  it("returns invalid when wallet has no on-chain credential", async () => {
    const proof = signProof(account, basePayload);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ verified: false, credentialCount: 0 }),
    }));
    const result = await verifyProofOnChain(proof);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/credential/);
    }
  });

  it("returns invalid when signature check fails before hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const proof = signProof(account, basePayload);
    const tampered: SignedProof = { ...proof, payload: { ...proof.payload, meetsRequirement: false } };
    const result = await verifyProofOnChain(tampered);
    expect(result.valid).toBe(false);
    // fetch should not have been called — failed at local signature check
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns invalid on network error during on-chain check", async () => {
    const proof = signProof(account, basePayload);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Connection refused")));
    const result = await verifyProofOnChain(proof);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/Network error/);
    }
  });
});
