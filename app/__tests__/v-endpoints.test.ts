import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import algosdk from "algosdk";
import type { SignedProofPayload } from "~/utils/algorand-verify";

/**
 * Tests for the /api/v/* endpoints:
 *   GET  /api/v/nonce       → app/routes/api/v/nonce.ts
 *   POST /api/v/submit      → app/routes/api/v/submit.ts
 *   GET  /api/v/result/:n   → app/routes/api/v/result.$nonce.ts
 *
 * Each loader/action is called directly with a synthetic Request object —
 * no running server required.
 *
 * Note: algosdk.verifyBytes() is used in submit; because we use MOCK_SIGNATURE
 * in wallet-verify.tsx (not a real sig), submit tests that go through the full
 * proof validation path need a real Algorand keypair.
 */

const TEST_SECRET = "test-secret-for-endpoint-tests";

let account: algosdk.Account;
let walletAddress: string;

beforeEach(async () => {
  process.env.NONCE_SECRET = TEST_SECRET;
  vi.resetModules();
  account = algosdk.generateAccount();
  walletAddress = algosdk.encodeAddress(account.addr.publicKey);
});

afterEach(() => {
  delete process.env.NONCE_SECRET;
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  method: string,
  url: string,
  options: { body?: unknown; headers?: Record<string, string> } = {}
): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function callLoader(
  modulePath: string,
  request: Request,
  params: Record<string, string> = {}
) {
  const mod = await import(modulePath);
  return mod.loader({ request, params });
}

async function callAction(modulePath: string, request: Request) {
  const mod = await import(modulePath);
  return mod.action({ request, params: {} });
}

/** Issue a real nonce via the nonce utility (not through HTTP) */
async function freshNonce(minAge = 21): Promise<string> {
  const { issueNonce } = await import("~/utils/nonce.server");
  return issueNonce(minAge);
}

/** Build and sign a valid proof for the given nonce */
function signProof(nonce: string, minAge: number, meetsRequirement = true) {
  const payload: SignedProofPayload = {
    nonce,
    walletAddress,
    minAge,
    meetsRequirement,
    timestamp: Date.now(),
  };
  const message = Buffer.from(JSON.stringify(payload));
  const sigBytes = algosdk.signBytes(message, account.sk);
  return { payload, signature: Buffer.from(sigBytes).toString("base64url") };
}

// ---------------------------------------------------------------------------
// GET /api/v/nonce
// ---------------------------------------------------------------------------
describe("GET /api/v/nonce", () => {
  it("returns { nonce, expiresIn: 300 } with status 200", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/nonce");
    const res: Response = await callLoader("~/routes/api/v/nonce", req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.nonce).toBe("string");
    expect(body.expiresIn).toBe(300);
  });

  it("defaults minAge to 18 when not provided", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/nonce");
    const res: Response = await callLoader("~/routes/api/v/nonce", req);
    const { nonce } = await res.json();
    const { verifyNonce } = await import("~/utils/nonce.server");
    const result = verifyNonce(nonce);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.payload.minAge).toBe(18);
  });

  it("embeds minAge=21 from query param", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/nonce?minAge=21");
    const res: Response = await callLoader("~/routes/api/v/nonce", req);
    const { nonce } = await res.json();
    const { verifyNonce } = await import("~/utils/nonce.server");
    const result = verifyNonce(nonce);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.payload.minAge).toBe(21);
  });

  it("embeds siteId from query param", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/nonce?siteId=my-site");
    const res: Response = await callLoader("~/routes/api/v/nonce", req);
    const { nonce } = await res.json();
    const { verifyNonce } = await import("~/utils/nonce.server");
    const result = verifyNonce(nonce);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.payload.siteId).toBe("my-site");
  });

  it("returns 400 for minAge=0", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/nonce?minAge=0");
    const res: Response = await callLoader("~/routes/api/v/nonce", req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for minAge=151", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/nonce?minAge=151");
    const res: Response = await callLoader("~/routes/api/v/nonce", req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for minAge=abc", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/nonce?minAge=abc");
    const res: Response = await callLoader("~/routes/api/v/nonce", req);
    expect(res.status).toBe(400);
  });

  it("returns 405 for POST", async () => {
    const req = makeRequest("POST", "http://localhost/api/v/nonce");
    const res: Response = await callAction("~/routes/api/v/nonce", req);
    expect(res.status).toBe(405);
  });

  it("returns 451 for EEA request (DE)", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/nonce", {
      headers: { "x-vercel-ip-country": "DE" },
    });
    const res: Response = await callLoader("~/routes/api/v/nonce", req);
    expect(res.status).toBe(451);
  });

  it("returned nonce is verifiable by verifyNonce", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/nonce?minAge=21");
    const res: Response = await callLoader("~/routes/api/v/nonce", req);
    const { nonce } = await res.json();
    const { verifyNonce } = await import("~/utils/nonce.server");
    expect(verifyNonce(nonce).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v/submit
// ---------------------------------------------------------------------------
describe("POST /api/v/submit", () => {
  it("accepts a valid nonce + signed proof and returns { success: true }", async () => {
    const nonce = await freshNonce(21);
    const signedProof = signProof(nonce, 21);
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { nonce, signedProof },
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("accepts meetsRequirement: false", async () => {
    const nonce = await freshNonce(21);
    const signedProof = signProof(nonce, 21, false);
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { nonce, signedProof },
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(200);
  });

  it("returns 400 when nonce field is missing", async () => {
    const signedProof = signProof("x", 21);
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { signedProof },
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/nonce/i);
  });

  it("returns 400 when signedProof field is missing", async () => {
    const nonce = await freshNonce(21);
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { nonce },
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/signedProof/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/v/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/JSON/i);
  });

  it("returns 400 for an invalid (tampered) nonce", async () => {
    const nonce = await freshNonce(21);
    const tamperedNonce = nonce.slice(0, -1) + (nonce.endsWith("A") ? "B" : "A");
    const signedProof = signProof(nonce, 21); // proof has original nonce
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { nonce: tamperedNonce, signedProof },
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/nonce/i);
  });

  it("returns 400 when proof nonce field doesn't match submitted nonce", async () => {
    const nonce = await freshNonce(21);
    const otherNonce = await freshNonce(21);
    const signedProof = signProof(otherNonce, 21); // proof contains a different nonce
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { nonce, signedProof },
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/nonce/i);
  });

  it("returns 400 when proof minAge doesn't match nonce minAge", async () => {
    const nonce = await freshNonce(21); // nonce says 21
    const signedProof = signProof(nonce, 18); // proof says 18
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { nonce, signedProof },
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/minAge/i);
  });

  it("returns 400 for invalid Algorand signature in proof", async () => {
    const nonce = await freshNonce(21);
    const validProof = signProof(nonce, 21);
    const badProof = { ...validProof, signature: "AAAAAAAAAA" }; // garbage sig
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { nonce, signedProof: badProof },
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/proof/i);
  });

  it("returns 405 for GET", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/submit");
    const res: Response = await callLoader("~/routes/api/v/submit", req);
    expect(res.status).toBe(405);
  });

  it("returns 451 for EEA request", async () => {
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: {},
      headers: { "x-vercel-ip-country": "FR" },
    });
    const res: Response = await callAction("~/routes/api/v/submit", req);
    expect(res.status).toBe(451);
  });

  it("after successful submit, proof is stored in cache", async () => {
    const nonce = await freshNonce(21);
    const signedProof = signProof(nonce, 21);
    const req = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { nonce, signedProof },
    });
    await callAction("~/routes/api/v/submit", req);
    const { getProof } = await import("~/utils/proof-cache.server");
    expect(getProof(nonce)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GET /api/v/result/:nonce
// ---------------------------------------------------------------------------
describe("GET /api/v/result/:nonce", () => {
  it("returns 404 when no proof has been submitted", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/result/unknown-nonce");
    const res: Response = await callLoader("~/routes/api/v/result.$nonce", req, {
      nonce: "unknown-nonce",
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not found");
  });

  it("returns the proof after it has been submitted", async () => {
    const nonce = await freshNonce(21);
    const signedProof = signProof(nonce, 21);

    // Submit first
    const submitReq = makeRequest("POST", "http://localhost/api/v/submit", {
      body: { nonce, signedProof },
    });
    await callAction("~/routes/api/v/submit", submitReq);

    // Then poll result
    const resultReq = makeRequest("GET", `http://localhost/api/v/result/${nonce}`);
    const res: Response = await callLoader("~/routes/api/v/result.$nonce", resultReq, {
      nonce,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.proof).toBeDefined();
    expect(body.proof.payload.meetsRequirement).toBe(true);
  });

  it("returns 405 for POST", async () => {
    const req = makeRequest("POST", "http://localhost/api/v/result/x");
    const res: Response = await callAction("~/routes/api/v/result.$nonce", req);
    expect(res.status).toBe(405);
  });

  it("returns 451 for EEA request", async () => {
    const req = makeRequest("GET", "http://localhost/api/v/result/x", {
      headers: { "x-vercel-ip-country": "IT" },
    });
    const res: Response = await callLoader("~/routes/api/v/result.$nonce", req, {
      nonce: "x",
    });
    expect(res.status).toBe(451);
  });
});

// ---------------------------------------------------------------------------
// Full integration: nonce → submit → result
// ---------------------------------------------------------------------------
describe("full flow: nonce → submit → result", () => {
  it("happy path (meetsRequirement: true)", async () => {
    // 1. Get nonce
    const nonceReq = makeRequest("GET", "http://localhost/api/v/nonce?minAge=21");
    const nonceRes: Response = await callLoader("~/routes/api/v/nonce", nonceReq);
    const { nonce } = await nonceRes.json();
    expect(typeof nonce).toBe("string");

    // 2. Poll result — should be 404 before submit
    const pollBefore: Response = await callLoader(
      "~/routes/api/v/result.$nonce",
      makeRequest("GET", `http://localhost/api/v/result/${nonce}`),
      { nonce }
    );
    expect(pollBefore.status).toBe(404);

    // 3. Submit signed proof
    const signedProof = signProof(nonce, 21, true);
    const submitRes: Response = await callAction(
      "~/routes/api/v/submit",
      makeRequest("POST", "http://localhost/api/v/submit", { body: { nonce, signedProof } })
    );
    expect(submitRes.status).toBe(200);

    // 4. Poll result — should be 200 now
    const pollAfter: Response = await callLoader(
      "~/routes/api/v/result.$nonce",
      makeRequest("GET", `http://localhost/api/v/result/${nonce}`),
      { nonce }
    );
    expect(pollAfter.status).toBe(200);
    const { proof } = await pollAfter.json();
    expect(proof.payload.meetsRequirement).toBe(true);
    expect(proof.payload.minAge).toBe(21);
    expect(proof.payload.walletAddress).toBe(walletAddress);
  });

  it("happy path (meetsRequirement: false)", async () => {
    const nonceRes: Response = await callLoader(
      "~/routes/api/v/nonce",
      makeRequest("GET", "http://localhost/api/v/nonce?minAge=21")
    );
    const { nonce } = await nonceRes.json();
    const signedProof = signProof(nonce, 21, false);
    await callAction(
      "~/routes/api/v/submit",
      makeRequest("POST", "http://localhost/api/v/submit", { body: { nonce, signedProof } })
    );
    const pollRes: Response = await callLoader(
      "~/routes/api/v/result.$nonce",
      makeRequest("GET", `http://localhost/api/v/result/${nonce}`),
      { nonce }
    );
    expect(pollRes.status).toBe(200);
    const { proof } = await pollRes.json();
    expect(proof.payload.meetsRequirement).toBe(false);
  });
});
