/**
 * Types for identity verification system
 * Provider-agnostic interface for multiple verification providers
 */

export type VerificationStatus = "pending" | "approved" | "rejected" | "expired";

export type VerificationProvider = "idenfy" | "stripe_identity" | "persona" | "mock";

export interface VerifiedIdentity {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthDate: string;  // ISO format YYYY-MM-DD
  governmentId: string;
  idType: string;     // "passport" | "government_id"
  state: string;      // US state code
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
