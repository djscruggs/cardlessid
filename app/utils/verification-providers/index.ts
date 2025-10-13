/**
 * Provider factory and registry
 * Import and instantiate verification providers here
 */

import type { IVerificationProvider } from "./base";
import type { VerificationProvider } from "~/types/verification";
import { MockProvider } from "./mock";

/**
 * Get verification provider instance by name
 * @param providerName - Provider identifier
 * @returns Provider instance
 * @throws Error if mock provider is requested in production without explicit override
 */
export function getProvider(providerName?: VerificationProvider): IVerificationProvider {
  const isProduction = process.env.NODE_ENV === "production";

  // Default to "cardlessid" in production, "mock" in development
  const defaultProvider = isProduction ? "cardlessid" : "mock";
  const provider = providerName || (process.env.VERIFICATION_PROVIDER as VerificationProvider) || defaultProvider;

  // Production safety: Prevent mock as default
  if (isProduction && provider === "mock" && !process.env.ALLOW_MOCK_VERIFICATION) {
    throw new Error(
      "🚨 SECURITY ERROR: Mock provider cannot be used in production. " +
      "Either remove VERIFICATION_PROVIDER environment variable to use the default CardlessID provider, " +
      "or set it to a real provider (cardlessid, idenfy, stripe_identity, persona, or custom). " +
      "To temporarily allow mock in production for testing (NOT RECOMMENDED), set ALLOW_MOCK_VERIFICATION=true."
    );
  }

  switch (provider) {
    case "cardlessid":
      // The built-in CardlessID verification using Google Document AI + AWS
      // This is handled via the /api/custom-verification/* routes
      // No provider class needed - it's an API-based flow
      console.log("🔐 Using CardlessID verification (Google Document AI + AWS)");
      // Return mock provider as a placeholder since cardlessid uses direct API calls
      return new MockProvider();

    case "mock":
      // MockProvider constructor will handle production checks
      return new MockProvider();

    // TODO: Add real third-party providers
    // case "idenfy":
    //   return new IdenfyProvider();
    // case "stripe_identity":
    //   return new StripeIdentityProvider();
    // case "persona":
    //   return new PersonaProvider();

    case "custom":
      // For developers building their own verification providers
      throw new Error(
        "Custom provider selected but not implemented. " +
        "Please implement your custom verification provider and register it here."
      );

    default:
      console.error(`Unknown provider "${provider}"`);

      // In production, fail instead of falling back
      if (isProduction) {
        throw new Error(
          `Unknown verification provider: "${provider}". ` +
          `Supported providers: ${getSupportedProviders().join(", ")}. ` +
          `Set VERIFICATION_PROVIDER environment variable to a valid provider, or omit it to use the default CardlessID provider.`
        );
      }

      // In development, warn but allow fallback to mock
      console.warn(`Falling back to mock provider in development mode`);
      return new MockProvider();
  }
}

/**
 * Get list of supported providers
 */
export function getSupportedProviders(): VerificationProvider[] {
  return ["cardlessid", "mock", "custom"];
  // TODO: Add as third-party providers are implemented
  // return ["cardlessid", "idenfy", "stripe_identity", "persona", "mock", "custom"];
}
