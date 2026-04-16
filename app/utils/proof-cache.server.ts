/**
 * In-memory TTL cache for signed verification proofs.
 * Maps nonce → signedProof with automatic 60-second eviction.
 * No persistent storage — proofs are ephemeral by design.
 */

/** Proofs evict after 60 seconds — GDPR: no personal data retained beyond relay window */
const PROOF_TTL_MS = 60 * 1000;

interface CacheEntry {
  proof: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Sweep expired entries every 30 seconds; unref so this doesn't block process exit
const sweepInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}, 30_000);
sweepInterval.unref();

/**
 * Store a signed proof keyed by nonce. Overwrites any existing entry.
 * @param nonce The nonce token string (used as cache key)
 * @param proof The signed proof payload (opaque — stored and returned as-is)
 */
export function storeProof(nonce: string, proof: unknown): void {
  cache.set(nonce, { proof, expiresAt: Date.now() + PROOF_TTL_MS });
}

/**
 * Retrieve a stored proof by nonce. Returns null if not found or expired.
 * @param nonce The nonce token string
 * @returns The stored proof, or null
 */
export function getProof(nonce: string): unknown | null {
  const entry = cache.get(nonce);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(nonce);
    return null;
  }
  return entry.proof;
}
