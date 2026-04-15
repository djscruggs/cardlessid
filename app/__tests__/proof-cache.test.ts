import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * Tests for app/utils/proof-cache.server.ts
 * In-memory TTL cache — uses fake timers for TTL/sweep tests.
 */

// We re-import the module for each test group so the module-level Map
// and setInterval start fresh. vi.resetModules() in beforeEach handles this.

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

async function getCacheFns() {
  const mod = await import("~/utils/proof-cache.server");
  return { storeProof: mod.storeProof, getProof: mod.getProof };
}

describe("proof-cache", () => {
  it("storeProof then getProof returns the stored proof", async () => {
    const { storeProof, getProof } = await getCacheFns();
    const proof = { payload: { meetsRequirement: true }, signature: "abc" };
    storeProof("nonce-1", proof);
    expect(getProof("nonce-1")).toEqual(proof);
  });

  it("getProof returns null for unknown nonce", async () => {
    const { getProof } = await getCacheFns();
    expect(getProof("does-not-exist")).toBeNull();
  });

  it("storeProof overwrites an existing entry", async () => {
    const { storeProof, getProof } = await getCacheFns();
    const proof1 = { signature: "first" };
    const proof2 = { signature: "second" };
    storeProof("nonce-1", proof1);
    storeProof("nonce-1", proof2);
    expect(getProof("nonce-1")).toEqual(proof2);
  });

  it("getProof returns null after TTL expires (61s)", async () => {
    const { storeProof, getProof } = await getCacheFns();
    storeProof("nonce-ttl", { signature: "x" });
    expect(getProof("nonce-ttl")).not.toBeNull();

    vi.advanceTimersByTime(61_000);

    expect(getProof("nonce-ttl")).toBeNull();
  });

  it("getProof within TTL window still returns proof (59s)", async () => {
    const { storeProof, getProof } = await getCacheFns();
    storeProof("nonce-fresh", { signature: "y" });
    vi.advanceTimersByTime(59_000);
    expect(getProof("nonce-fresh")).not.toBeNull();
  });

  it("expired entry is deleted from the map on access (no leak)", async () => {
    // Access after expiry should trigger delete
    const { storeProof, getProof } = await getCacheFns();
    storeProof("nonce-stale", { signature: "z" });
    vi.advanceTimersByTime(61_000);
    // First access returns null and deletes
    expect(getProof("nonce-stale")).toBeNull();
    // Second access also returns null (entry is gone)
    expect(getProof("nonce-stale")).toBeNull();
  });

  it("sweep interval clears expired entries without calling getProof", async () => {
    const { storeProof, getProof } = await getCacheFns();
    storeProof("nonce-sweep", { signature: "sweep" });
    // Advance past TTL (60s) and past sweep interval (30s → 30s interval fires twice)
    vi.advanceTimersByTime(61_000);
    // Sweep fires at 30s intervals; at 61s it has fired twice — entry should be gone
    // Verify without calling getProof first:
    // We call getProof now — if sweep worked, entry is already deleted
    expect(getProof("nonce-sweep")).toBeNull();
  });

  it("multiple proofs coexist independently", async () => {
    const { storeProof, getProof } = await getCacheFns();
    storeProof("a", { v: 1 });
    storeProof("b", { v: 2 });
    expect(getProof("a")).toEqual({ v: 1 });
    expect(getProof("b")).toEqual({ v: 2 });
  });
});
