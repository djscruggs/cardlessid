/**
 * Types for identity verification system
 * Provider-agnostic interface for multiple verification providers
 */

export type VerificationStatus = "pending" | "approved" | "rejected" | "expired";

export type VerificationProvider = "cardlessid" | "idenfy" | "stripe_identity" | "persona" | "mock" | "custom";

export interface VerifiedIdentity {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthDate: string;  // ISO format YYYY-MM-DD
  governmentId: string;
  idType: string;     // "passport" | "government_id" | "drivers_license"
  state: string;      // US state code
  expirationDate?: string;  // ISO format YYYY-MM-DD (ID expiration)
}

export interface VerificationSession {
  id: string;
  provider: VerificationProvider;
  status: VerificationStatus;
  createdAt: number;  // timestamp
  expiresAt: number;  // timestamp

  // Verified identity data (only populated after approval)
  verifiedData?: VerifiedIdentity;

  // Provider-specific metadata
  providerSessionId?: string;
  providerMetadata?: Record<string, any>;

  // Credential issuance tracking
  credentialIssued?: boolean;
  walletAddress?: string;

  // NFT transfer tracking
  assetId?: string;           // Asset ID of the minted NFT credential
  assetTransferred?: boolean; // Has the NFT been transferred to the wallet?
  transferredAt?: number;     // Timestamp when NFT was transferred

  // Custom verification flow data
  idPhotoUrl?: string;
  selfiePhotoUrl?: string;
  documentAiData?: any;
  faceMatchResult?: any;
}

export interface CreateSessionResponse {
  sessionId: string;
  authToken: string;
  expiresAt: string;  // ISO timestamp
  provider: VerificationProvider;
  providerSessionId: string;  // For webhook simulation/testing
}

export interface WebhookData {
  providerSessionId: string;
  status: "approved" | "rejected";
  verifiedData?: VerifiedIdentity;
  metadata?: Record<string, any>;
}
