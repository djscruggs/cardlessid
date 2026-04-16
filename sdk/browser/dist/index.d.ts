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
export type VerifyProofResult = {
    valid: true;
    payload: SignedProofPayload;
} | {
    valid: false;
    error: string;
};
export type VerifyProofOnChainResult = {
    valid: true;
    payload: SignedProofPayload;
    credentialCount: number;
} | {
    valid: false;
    error: string;
};
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
export declare function verifyProof(proof: SignedProof): VerifyProofResult;
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
export declare function verifyProofOnChain(proof: SignedProof, baseUrl?: string): Promise<VerifyProofOnChainResult>;
export declare class CardlessIDVerify {
    private opts;
    private nonce;
    private pollTimer;
    private container;
    private canvas;
    private statusEl;
    private state;
    constructor(options: CardlessIDVerifyOptions);
    /**
     * Mount the widget into a DOM element.
     * @param selector CSS selector string or Element
     */
    mount(selector: string | Element): this;
    /**
     * Unmount and stop polling. Call this when the widget is no longer needed.
     */
    destroy(): void;
    /**
     * Headless: fetch a new nonce and return the QR content string.
     * Use this if you want to render the QR yourself.
     */
    getNonce(): Promise<{
        nonce: string;
        qrContent: string;
        deepLink: string;
    }>;
    /**
     * Headless: poll for a result for the given nonce.
     * Resolves when a proof arrives, rejects on timeout.
     */
    pollForResult(nonce: string, timeoutMs?: number): Promise<SignedProof>;
    private _buildUI;
    private _setState;
    private _renderQR;
    private _showRetry;
    private _fetchNonceRaw;
    private _fetchNonce;
    private _fetchResult;
    private _startPolling;
    private _schedulePoll;
    private _poll;
    private _handleProof;
    private _stopPolling;
}
