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
 */
export function getProvider(providerName?: VerificationProvider): IVerificationProvider {
  const provider = providerName || (process.env.VERIFICATION_PROVIDER as VerificationProvider) || "mock";

  switch (provider) {
    case "mock":
      return new MockProvider();

    // TODO: Add real providers
    // case "idenfy":
    //   return new IdenfyProvider();
    // case "stripe_identity":
    //   return new StripeIdentityProvider();
    // case "persona":
    //   return new PersonaProvider();

    default:
      console.warn(`Unknown provider "${provider}", falling back to mock`);
      return new MockProvider();
  }
}

/**
 * Get list of supported providers
 */
export function getSupportedProviders(): VerificationProvider[] {
  return ["mock"];
  // TODO: Add as providers are implemented
  // return ["mock", "idenfy", "stripe_identity", "persona"];
}
