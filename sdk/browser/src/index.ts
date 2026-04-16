/**
 * @cardlessid/verify — Browser SDK
 *
 * Drop-in age verification widget for web integrators.
 * No backend required. No API key needed for age verification.
 *
 * Usage (script tag):
 *   <script src="https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js"></script>
 *   <div id="age-gate"></div>
 *   <script>
 *     const verify = new CardlessIDVerify({
 *       minAge: 21,
 *       onVerified: ({ meetsRequirement, walletAddress }) => {
 *         if (meetsRequirement) grantAccess();
 *       },
 *     });
 *     verify.mount('#age-gate');
 *   </script>
 *
 * Usage (npm):
 *   import { CardlessIDVerify } from '@cardlessid/verify';
 */

// @ts-ignore — tweetnacl ships UMD, no official @types
import nacl from "tweetnacl";
// @ts-ignore — qrcode-generator ships UMD
import qrcode from "qrcode-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export type VerifyProofOnChainResult =
  | { valid: true; payload: SignedProofPayload; credentialCount: number }
  | { valid: false; error: string };

export interface VerifiedResult {
  meetsRequirement: boolean;
  walletAddress: string;
  proof: SignedProof;
}

export interface CardlessIDVerifyOptions {
  /** Minimum age requirement (1–150) */
  minAge: number;
  /** Base URL for the Cardless ID API. Defaults to https://cardlessid.org */
  baseUrl?: string;
  /** Optional site identifier for analytics (non-secret, safe in browser JS) */
  siteId?: string;
  /** Polling interval in ms (default 1500) */
  pollInterval?: number;
  /**
   * Called with the simplified result once a proof arrives and is verified.
   * Use this for most integrations.
   */
  onVerified?: (result: VerifiedResult) => void;
  /**
   * Called with the raw SignedProof for integrators who want to re-verify
   * server-side or inspect the full proof object.
   */
  onResult?: (proof: SignedProof) => void;
  /** Called when an unrecoverable error occurs (expired nonce, network failure, etc.) */
  onError?: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Algorand address → public key
//
// Algorand addresses are base32(publicKey[32] || checksum[4]) with no padding.
// We decode to get the raw 32-byte ed25519 public key.
// ---------------------------------------------------------------------------

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32DecodeAlgorand(addr: string): Uint8Array {
  // Strip any trailing '=' padding (Algorand addresses have none, but be safe)
  const input = addr.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of input) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Extract the 32-byte ed25519 public key from an Algorand address string.
 * Algorand address = base32(pubkey[32] + checksum[4]).
 */
function algoAddressToPublicKey(address: string): Uint8Array {
  const decoded = base32DecodeAlgorand(address); // 36 bytes
  if (decoded.length < 32) {
    throw new Error("Invalid Algorand address length");
  }
  return decoded.slice(0, 32);
}

// ---------------------------------------------------------------------------
// Proof verification
//
// Algorand's signBytes prepends [77, 88] ("MX") before signing.
// We replicate that here so tweetnacl can verify without algosdk.
// ---------------------------------------------------------------------------

const ALGO_SIGN_PREFIX = new Uint8Array([77, 88]); // "MX"

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function base64urlToUint8Array(b64url: string): Uint8Array {
  // Convert base64url to standard base64
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verify an Algorand ed25519 signature on a SignedProof.
 *
 * Checks:
 *   1. Signature is valid over canonical JSON of payload (with "MX" prefix)
 *   2. Timestamp is within a 5-minute window
 *
 * @param proof - The SignedProof received from the wallet via the API
 * @returns Discriminated union { valid, payload } or { valid, error }
 */
export function verifyProof(proof: SignedProof): VerifyProofResult {
  const { payload, signature } = proof;

  // Decode signature from base64url
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64urlToUint8Array(signature);
  } catch {
    return { valid: false, error: "invalid signature encoding" };
  }

  // Decode wallet public key from Algorand address
  let publicKey: Uint8Array;
  try {
    publicKey = algoAddressToPublicKey(payload.walletAddress);
  } catch {
    return { valid: false, error: "invalid walletAddress" };
  }

  // Build the message as algosdk.signBytes does: "MX" || canonical JSON
  const messageBytes = new TextEncoder().encode(JSON.stringify(payload));
  const toBeSigned = concatUint8Arrays(ALGO_SIGN_PREFIX, messageBytes);

  // Verify using tweetnacl
  const valid = nacl.sign.detached.verify(toBeSigned, sigBytes, publicKey);
  if (!valid) {
    return { valid: false, error: "signature verification failed" };
  }

  // Check timestamp freshness (5-minute window)
  const age = Date.now() - payload.timestamp;
  if (age < 0 || age > 5 * 60 * 1000) {
    return { valid: false, error: "proof timestamp out of acceptable window" };
  }

  return { valid: true, payload };
}

/**
 * Verify a SignedProof and confirm the wallet holds a valid on-chain credential.
 *
 * Runs `verifyProof` first (signature + timestamp), then calls
 * `GET /api/wallet/status/:address` to confirm the wallet actually passed
 * identity verification and holds a Cardless ID credential NFT on Algorand.
 *
 * Use this for server-side re-verification in production. Do not use in the
 * browser unless you trust the user's network — the signature check alone
 * (`verifyProof`) is sufficient for client-side gating.
 *
 * @param proof - The SignedProof received from the polling endpoint
 * @param baseUrl - Cardless ID API base URL (default: https://cardlessid.org)
 * @returns Promise resolving to a discriminated union with credential count or error
 */
export async function verifyProofOnChain(
  proof: SignedProof,
  baseUrl = "https://cardlessid.org"
): Promise<VerifyProofOnChainResult> {
  // Step 1: fast local check (signature + timestamp)
  const local = verifyProof(proof);
  if (!local.valid) return local;

  // Step 2: on-chain credential check
  const { walletAddress } = local.payload;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/wallet/status/${encodeURIComponent(walletAddress)}`);
  } catch (err) {
    return { valid: false, error: `Network error during on-chain check: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { valid: false, error: (body as { error?: string }).error ?? `Wallet status check failed (HTTP ${res.status})` };
  }

  const status = (await res.json()) as { verified: boolean; credentialCount?: number };
  if (!status.verified) {
    return { valid: false, error: "Wallet does not hold a valid Cardless ID credential" };
  }

  return { valid: true, payload: local.payload, credentialCount: status.credentialCount ?? 0 };
}

// ---------------------------------------------------------------------------
// QR code rendering
// ---------------------------------------------------------------------------

function renderQRToCanvas(text: string, canvas: HTMLCanvasElement): void {
  const qr = qrcode(0, "M"); // type 0 = auto, error correction M
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const cellSize = Math.floor(Math.min(canvas.width, canvas.height) / moduleCount);
  const margin = Math.floor(
    (Math.min(canvas.width, canvas.height) - cellSize * moduleCount) / 2
  );

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(
          margin + col * cellSize,
          margin + row * cellSize,
          cellSize,
          cellSize
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Default managed UI styles (injected once)
// ---------------------------------------------------------------------------

const STYLE_ID = "__cardlessid_styles__";

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .cid-widget {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 16px;
      box-sizing: border-box;
    }
    .cid-qr-canvas {
      display: block;
      border-radius: 8px;
    }
    .cid-status {
      font-size: 13px;
      color: #6b7280;
      text-align: center;
    }
    .cid-status.cid-success { color: #16a34a; font-weight: 600; }
    .cid-status.cid-error   { color: #dc2626; }
    .cid-deep-link {
      font-size: 12px;
      color: #2563eb;
      text-decoration: none;
    }
    .cid-deep-link:hover { text-decoration: underline; }
    .cid-retry-btn {
      font-size: 13px;
      padding: 6px 16px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
    }
    .cid-retry-btn:hover { background: #f3f4f6; }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// CardlessIDVerify class
// ---------------------------------------------------------------------------

type State = "idle" | "loading" | "ready" | "polling" | "success" | "error";

export class CardlessIDVerify {
  private opts: Required<
    Pick<CardlessIDVerifyOptions, "minAge" | "baseUrl" | "pollInterval">
  > &
    CardlessIDVerifyOptions;

  private nonce: string | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private container: Element | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private statusEl: HTMLElement | null = null;
  private state: State = "idle";

  constructor(options: CardlessIDVerifyOptions) {
    if (!options.minAge || options.minAge < 1 || options.minAge > 150) {
      throw new Error("minAge must be a number between 1 and 150");
    }
    this.opts = {
      baseUrl: "https://cardlessid.org",
      pollInterval: 1500,
      ...options,
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Mount the widget into a DOM element.
   * @param selector CSS selector string or Element
   */
  mount(selector: string | Element): this {
    const el =
      typeof selector === "string"
        ? document.querySelector(selector)
        : selector;
    if (!el) throw new Error(`CardlessIDVerify: element not found: ${selector}`);
    this.container = el;
    injectStyles();
    this._buildUI();
    this._fetchNonce();
    return this;
  }

  /**
   * Unmount and stop polling. Call this when the widget is no longer needed.
   */
  destroy(): void {
    this._stopPolling();
    if (this.container) this.container.innerHTML = "";
    this.nonce = null;
    this.state = "idle";
  }

  /**
   * Headless: fetch a new nonce and return the QR content string.
   * Use this if you want to render the QR yourself.
   */
  async getNonce(): Promise<{ nonce: string; qrContent: string; deepLink: string }> {
    const { nonce, deepLink } = await this._fetchNonceRaw();
    return { nonce, qrContent: deepLink, deepLink };
  }

  /**
   * Headless: poll for a result for the given nonce.
   * Resolves when a proof arrives, rejects on timeout.
   */
  async pollForResult(nonce: string, timeoutMs = 300_000): Promise<SignedProof> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = async () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Verification timed out"));
          return;
        }
        try {
          const proof = await this._fetchResult(nonce);
          if (proof) {
            resolve(proof);
          } else {
            this.pollTimer = setTimeout(tick, this.opts.pollInterval);
          }
        } catch (err) {
          reject(err);
        }
      };
      tick();
    });
  }

  // -------------------------------------------------------------------------
  // Internal: UI
  // -------------------------------------------------------------------------

  private _buildUI(): void {
    if (!this.container) return;
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "cid-widget";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "cid-qr-canvas";
    this.canvas.width = 220;
    this.canvas.height = 220;

    this.statusEl = document.createElement("p");
    this.statusEl.className = "cid-status";
    this.statusEl.textContent = "Loading...";

    wrapper.appendChild(this.canvas);
    wrapper.appendChild(this.statusEl);
    this.container.appendChild(wrapper);
  }

  private _setState(state: State, message?: string): void {
    this.state = state;
    if (!this.statusEl) return;
    this.statusEl.className = "cid-status";
    if (state === "success") this.statusEl.classList.add("cid-success");
    if (state === "error") this.statusEl.classList.add("cid-error");
    if (message) this.statusEl.textContent = message;
  }

  private _renderQR(deepLink: string): void {
    if (!this.canvas) return;

    // Render QR onto canvas
    renderQRToCanvas(deepLink, this.canvas);

    // Add deep link below canvas for mobile users who can't scan
    const wrapper = this.canvas.parentElement!;
    const existingLink = wrapper.querySelector<HTMLAnchorElement>(".cid-deep-link");
    if (existingLink) {
      existingLink.href = deepLink;
    } else {
      const link = document.createElement("a");
      link.className = "cid-deep-link";
      link.href = deepLink;
      link.textContent = "Open in Cardless ID wallet";
      wrapper.appendChild(link);
    }
  }

  private _showRetry(): void {
    if (!this.statusEl) return;
    const wrapper = this.statusEl.parentElement!;
    const existing = wrapper.querySelector(".cid-retry-btn");
    if (existing) return;
    const btn = document.createElement("button");
    btn.className = "cid-retry-btn";
    btn.textContent = "Try again";
    btn.addEventListener("click", () => {
      btn.remove();
      this._fetchNonce();
    });
    wrapper.appendChild(btn);
  }

  // -------------------------------------------------------------------------
  // Internal: API
  // -------------------------------------------------------------------------

  private async _fetchNonceRaw(): Promise<{ nonce: string; deepLink: string }> {
    const { baseUrl, minAge, siteId } = this.opts;
    const url = new URL(`${baseUrl}/api/v/nonce`);
    url.searchParams.set("minAge", String(minAge));
    if (siteId) url.searchParams.set("siteId", siteId);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { nonce: string; expiresIn: number };
    const deepLink = `${baseUrl}/app/wallet-verify?nonce=${encodeURIComponent(data.nonce)}&minAge=${minAge}`;
    return { nonce: data.nonce, deepLink };
  }

  private async _fetchNonce(): Promise<void> {
    this._setState("loading", "Preparing verification...");
    try {
      const { nonce, deepLink } = await this._fetchNonceRaw();
      this.nonce = nonce;
      this._renderQR(deepLink);
      this._setState(
        "ready",
        `Scan with Cardless ID wallet to prove age ${this.opts.minAge}+`
      );
      this._startPolling();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._setState("error", `Failed to start verification: ${error.message}`);
      this._showRetry();
      this.opts.onError?.(error);
    }
  }

  private async _fetchResult(nonce: string): Promise<SignedProof | null> {
    const res = await fetch(`${this.opts.baseUrl}/api/v/result/${encodeURIComponent(nonce)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { proof: SignedProof };
    return data.proof;
  }

  // -------------------------------------------------------------------------
  // Internal: polling
  // -------------------------------------------------------------------------

  private _startPolling(): void {
    if (!this.nonce) return;
    this._setState("polling", `Scan with Cardless ID wallet to prove age ${this.opts.minAge}+`);
    this._schedulePoll();
  }

  private _schedulePoll(): void {
    this.pollTimer = setTimeout(() => this._poll(), this.opts.pollInterval);
  }

  private async _poll(): Promise<void> {
    if (!this.nonce || this.state === "success" || this.state === "error") return;

    try {
      const proof = await this._fetchResult(this.nonce);
      if (!proof) {
        // Not yet — keep polling
        this._schedulePoll();
        return;
      }

      this._stopPolling();
      this._handleProof(proof);
    } catch (err) {
      // Network hiccup — keep polling unless it's a fatal error
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message.includes("expired") || error.message.includes("451")) {
        this._setState("error", error.message);
        this._showRetry();
        this.opts.onError?.(error);
      } else {
        // Transient — keep polling
        this._schedulePoll();
      }
    }
  }

  private _handleProof(proof: SignedProof): void {
    // Verify the proof client-side
    const result = verifyProof(proof);
    if (!result.valid) {
      const error = new Error(`Proof verification failed: ${result.error}`);
      this._setState("error", error.message);
      this._showRetry();
      this.opts.onError?.(error);
      return;
    }

    const { meetsRequirement, walletAddress } = result.payload;

    // Update UI
    if (meetsRequirement) {
      this._setState("success", `Age ${this.opts.minAge}+ verified`);
    } else {
      this._setState("error", `Age requirement (${this.opts.minAge}+) not met`);
    }

    // Clear QR — no longer needed
    if (this.canvas) {
      const ctx = this.canvas.getContext("2d")!;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Fire callbacks
    this.opts.onResult?.(proof);
    this.opts.onVerified?.({ meetsRequirement, walletAddress, proof });
  }

  private _stopPolling(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

// Make available as window.CardlessIDVerify in browser IIFE build
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>)["CardlessIDVerify"] =
    CardlessIDVerify;
  (window as unknown as Record<string, unknown>)["CardlessIDVerifyProof"] = {
    verifyProof,
    verifyProofOnChain,
  };
}
