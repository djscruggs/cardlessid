/**
 * Base interface for identity verification providers
 * Each provider (iDenfy, Stripe, Persona, etc.) implements this interface
 */

import type { VerifiedIdentity, WebhookData } from "~/types/verification";

export interface IVerificationProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Create a verification session and get auth token for mobile SDK
   * @param sessionId - Our internal session ID
   * @returns Auth token and provider's session ID
   */
  createSession(sessionId: string): Promise<{
    authToken: string;
    providerSessionId: string;
  }>;

  /**
   * Validate webhook signature/authenticity
   * @param request - Incoming webhook request
   * @returns true if webhook is valid
   */
  validateWebhook(request: Request): Promise<boolean>;

  /**
   * Parse webhook data into standard format
   * @param body - Raw webhook body
   * @returns Standardized webhook data
   */
  parseWebhookData(body: any): WebhookData;

  /**
   * Optional: Get session status from provider API
   * @param providerSessionId - Provider's session ID
   */
  getSessionStatus?(providerSessionId: string): Promise<{
    status: "pending" | "approved" | "rejected";
    verifiedData?: VerifiedIdentity;
  }>;
}
