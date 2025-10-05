/**
 * Configuration for CardlessID Verifier
 */
export interface CardlessIDConfig {
  /** Your CardlessID API key */
  apiKey: string;
  /** Base URL for API (defaults to https://cardlessid.com) */
  baseUrl?: string;
}

/**
 * Parameters for creating a verification challenge
 */
export interface CreateChallengeParams {
  /** Minimum age required (1-150) */
  minAge: number;
  /** Optional webhook URL to receive notifications when challenge is completed */
  callbackUrl?: string;
}

/**
 * Challenge creation result
 */
export interface ChallengeResult {
  /** Unique challenge identifier */
  challengeId: string;
  /** URL to display as QR code for verification */
  qrCodeUrl: string;
  /** Deep link URL for mobile apps */
  deepLinkUrl: string;
  /** Timestamp when challenge was created */
  createdAt: number;
  /** Timestamp when challenge expires */
  expiresAt: number;
}

/**
 * Challenge verification status
 */
export type ChallengeStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/**
 * Verification result
 */
export interface VerificationResult {
  /** Challenge ID */
  challengeId: string;
  /** Whether the user was verified (true if approved) */
  verified: boolean;
  /** Current challenge status */
  status: ChallengeStatus;
  /** Minimum age requirement */
  minAge: number;
  /** Wallet address (only present if approved) */
  walletAddress?: string;
  /** Timestamp when challenge was created */
  createdAt: number;
  /** Timestamp when challenge expires */
  expiresAt: number;
  /** Timestamp when user responded (only present if completed) */
  respondedAt?: number;
}

/**
 * Polling options
 */
export interface PollOptions {
  /** Polling interval in milliseconds (default: 2000) */
  interval?: number;
  /** Total timeout in milliseconds (default: 600000 / 10 minutes) */
  timeout?: number;
}

/**
 * CardlessID Age Verification SDK
 */
declare class CardlessIDVerifier {
  /**
   * Create a new CardlessID verifier instance
   * @param config - Configuration object
   */
  constructor(config: CardlessIDConfig);

  /**
   * Create a new age verification challenge
   * @param params - Challenge parameters
   * @returns Promise resolving to challenge details
   */
  createChallenge(params: CreateChallengeParams): Promise<ChallengeResult>;

  /**
   * Verify a challenge and get its current status
   * @param challengeId - The challenge ID to verify
   * @returns Promise resolving to verification result
   */
  verifyChallenge(challengeId: string): Promise<VerificationResult>;

  /**
   * Poll a challenge until it's completed or expires
   * @param challengeId - The challenge ID to poll
   * @param options - Polling options
   * @returns Promise resolving to final verification result
   */
  pollChallenge(
    challengeId: string,
    options?: PollOptions
  ): Promise<VerificationResult>;
}

export default CardlessIDVerifier;
