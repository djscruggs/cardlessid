/**
 * Mock verification provider for testing
 * Simulates a verification flow without requiring real ID verification
 *
 * ⚠️ SECURITY WARNING: This provider MUST NOT be used in production!
 * It bypasses all real identity verification and should only be used
 * for development and testing purposes.
 */

import type { IVerificationProvider } from "./base";
import type { WebhookData } from "~/types/verification";

export class MockProvider implements IVerificationProvider {
  readonly name = "mock";

  constructor() {
    // Production safety check
    const isProduction = process.env.NODE_ENV === "production";
    const allowMock = process.env.ALLOW_MOCK_VERIFICATION === "true";

    if (isProduction && !allowMock) {
      throw new Error(
        "🚨 SECURITY ERROR: Mock verification provider cannot be used in production. " +
        "This provider bypasses all identity verification. " +
        "Use a real verification provider (idenfy, stripe_identity, persona) for production deployments. " +
        "If you absolutely must use mock in production for testing (NOT RECOMMENDED), " +
        "set ALLOW_MOCK_VERIFICATION=true environment variable."
      );
    }

    if (isProduction && allowMock) {
      console.warn(
        "⚠️⚠️⚠️ WARNING: Mock verification provider is enabled in PRODUCTION! ⚠️⚠️⚠️\n" +
        "   This is EXTREMELY DANGEROUS and should ONLY be used for testing.\n" +
        "   Mock provider bypasses all identity verification.\n" +
        "   Remove ALLOW_MOCK_VERIFICATION environment variable immediately after testing."
      );
    }

    if (!isProduction) {
      console.log("🧪 Mock verification provider initialized (development mode)");
    }
  }

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
