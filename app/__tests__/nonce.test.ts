import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Tests for app/utils/nonce.server.ts
 * Pure functions — no IO, no mocking of external services.
 * NONCE_SECRET env var is set in beforeEach.
 */

const TEST_SECRET = "test-secret-for-unit-tests-32bytes";

// Must set env before importing so getSecret() resolves correctly
beforeEach(() => {
  process.env.NONCE_SECRET = TEST_SECRET;
  vi.resetModules();
});

afterEach(() => {
  delete process.env.NONCE_SECRET;
  vi.resetModules();
});

async function getNonceFns() {
  const mod = await import("~/utils/nonce.server");
  return { issueNonce: mod.issueNonce, verifyNonce: mod.verifyNonce };
}

// ---------------------------------------------------------------------------
// issueNonce
// ---------------------------------------------------------------------------
describe("issueNonce", () => {
  it("returns a string with exactly one dot separator", async () => {
    const { issueNonce } = await getNonceFns();
    const token = issueNonce(21);
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("embedded payload contains jti, iat, exp, minAge", async () => {
    const { issueNonce } = await getNonceFns();
    const token = issueNonce(21);
    const encoded = token.split(".")[0];
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    expect(payload.jti).toBeTruthy();
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.exp).toBe("number");
    expect(payload.minAge).toBe(21);
  });

  it("exp - iat is approximately 300,000ms (5 min)", async () => {
    const { issueNonce } = await getNonceFns();
    const before = Date.now();
    const token = issueNonce(21);
    const encoded = token.split(".")[0];
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    expect(payload.exp - payload.iat).toBeGreaterThanOrEqual(299_000);
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(301_000);
    expect(payload.iat).toBeGreaterThanOrEqual(before);
  });

  it("includes siteId when provided", async () => {
    const { issueNonce } = await getNonceFns();
    const token = issueNonce(21, "my-site");
    const encoded = token.split(".")[0];
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    expect(payload.siteId).toBe("my-site");
  });

  it("omits siteId key when not provided", async () => {
    const { issueNonce } = await getNonceFns();
    const token = issueNonce(21);
    const encoded = token.split(".")[0];
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    expect(Object.keys(payload)).not.toContain("siteId");
  });

  it("two calls produce different jti values", async () => {
    const { issueNonce } = await getNonceFns();
    const t1 = issueNonce(21);
    const t2 = issueNonce(21);
    const p1 = JSON.parse(Buffer.from(t1.split(".")[0], "base64url").toString("utf8"));
    const p2 = JSON.parse(Buffer.from(t2.split(".")[0], "base64url").toString("utf8"));
    expect(p1.jti).not.toBe(p2.jti);
  });

  it("throws if NONCE_SECRET is not set", async () => {
    delete process.env.NONCE_SECRET;
    const { issueNonce } = await getNonceFns();
    expect(() => issueNonce(21)).toThrow("NONCE_SECRET env var is required");
  });
});

// ---------------------------------------------------------------------------
// verifyNonce
// ---------------------------------------------------------------------------
describe("verifyNonce", () => {
  it("verifies a freshly issued nonce", async () => {
    const { issueNonce, verifyNonce } = await getNonceFns();
    const token = issueNonce(21);
    const result = verifyNonce(token);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.minAge).toBe(21);
    }
  });

  it("verifies payload minAge matches what was issued", async () => {
    const { issueNonce, verifyNonce } = await getNonceFns();
    const token = issueNonce(18);
    const result = verifyNonce(token);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.payload.minAge).toBe(18);
  });

  it("verifies payload siteId matches what was issued", async () => {
    const { issueNonce, verifyNonce } = await getNonceFns();
    const token = issueNonce(21, "my-site");
    const result = verifyNonce(token);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.payload.siteId).toBe("my-site");
  });

  it("rejects a token with tampered payload", async () => {
    const { issueNonce, verifyNonce } = await getNonceFns();
    const token = issueNonce(21);
    const [encoded, sig] = token.split(".");
    // Flip one character in the encoded payload
    const tampered = encoded.slice(0, -1) + (encoded.endsWith("A") ? "B" : "A");
    const result = verifyNonce(`${tampered}.${sig}`);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("invalid signature");
  });

  it("rejects a token with tampered signature", async () => {
    const { issueNonce, verifyNonce } = await getNonceFns();
    const token = issueNonce(21);
    const [encoded, sig] = token.split(".");
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    const result = verifyNonce(`${encoded}.${tamperedSig}`);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("invalid signature");
  });

  it("rejects a malformed token with no dot", async () => {
    const { verifyNonce } = await getNonceFns();
    const result = verifyNonce("nodothere");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("malformed nonce");
  });

  it("rejects an empty string", async () => {
    const { verifyNonce } = await getNonceFns();
    const result = verifyNonce("");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("malformed nonce");
  });

  it("rejects a token with an expired exp", async () => {
    const { verifyNonce } = await getNonceFns();
    // Manually construct an expired token signed with the correct secret
    const { createHmac } = await import("crypto");
    const payload = {
      jti: "test",
      iat: Date.now() - 400_000,
      exp: Date.now() - 100_000, // already expired
      minAge: 21,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", TEST_SECRET).update(encoded).digest("base64url");
    const result = verifyNonce(`${encoded}.${sig}`);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("nonce expired");
  });

  it("rejects a token signed with a different secret", async () => {
    const { createHmac } = await import("crypto");
    const { verifyNonce } = await getNonceFns();
    const payload = { jti: "x", iat: Date.now(), exp: Date.now() + 300_000, minAge: 21 };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const wrongSig = createHmac("sha256", "wrong-secret").update(encoded).digest("base64url");
    const result = verifyNonce(`${encoded}.${wrongSig}`);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("invalid signature");
  });
});
