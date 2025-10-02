/**
 * Mock verification provider for testing
 * Simulates a verification flow without requiring real ID verification
 */

import type { IVerificationProvider } from "./base";
import type { WebhookData } from "~/types/verification";

export class MockProvider implements IVerificationProvider {
  readonly name = "mock";

  async createSession(sessionId: string): Promise<{
    authToken: string;
    providerSessionId: string;
  }> {
    // Generate mock tokens
    const authToken = `mock_token_${sessionId}_${Date.now()}`;
    const providerSessionId = `mock_session_${sessionId}`;

    return {
      authToken,
      providerSessionId,
    };
  }

  async validateWebhook(request: Request): Promise<boolean> {
    // In mock mode, always accept webhooks
    // In real implementation, check signature header
    return true;
  }

  parseWebhookData(body: any): WebhookData {
    // Mock webhook body format
    // {
    //   providerSessionId: "mock_session_xxx",
    //   status: "approved",
    //   firstName: "John",
    //   lastName: "Doe",
    //   ...
    // }

    return {
      providerSessionId: body.providerSessionId,
      status: body.status as "approved" | "rejected",
      verifiedData: body.status === "approved" ? {
        firstName: body.firstName,
        middleName: body.middleName || "",
        lastName: body.lastName,
        birthDate: body.birthDate,
        governmentId: body.governmentId,
        idType: body.idType || "government_id",
        state: body.state || "CA",
      } : undefined,
      metadata: {
        mockProvider: true,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getSessionStatus(providerSessionId: string): Promise<{
    status: "pending" | "approved" | "rejected";
  }> {
    // Mock always returns pending until webhook is sent
    return {
      status: "pending",
    };
  }
}
