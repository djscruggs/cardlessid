/**
 * Cardless ID Age Verification SDK for Node.js
 *
 * This SDK allows you to integrate Cardless ID age verification into your application.
 *
 * @example
 * ```javascript
 * const Cardless ID = require('./cardlessid-verifier');
 *
 * const verifier = new CardlessID({
 *   apiKey: 'your_api_key_here',
 *   baseUrl: 'https://cardlessid.com' // optional, defaults to production
 * });
 *
 * // Create a verification challenge
 * const challenge = await verifier.createChallenge({
 *   minAge: 21,
 *   callbackUrl: 'https://yourapp.com/verify-callback' // optional webhook
 * });
 *
 * console.log('QR Code URL:', challenge.qrCodeUrl);
 * console.log('Challenge ID:', challenge.challengeId);
 *
 * // Later, verify the challenge status
 * const result = await verifier.verifyChallenge(challenge.challengeId);
 *
 * if (result.verified) {
 *   console.log('User verified! Wallet:', result.walletAddress);
 * }
 * ```
 */

class CardlessIDVerifier {
  /**
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - Your Cardless ID API key
   * @param {string} [config.baseUrl='https://cardlessid.com'] - Base URL for API
   */
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("API key is required");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://cardlessid.com";
  }

  /**
   * Create a new age verification challenge
   *
   * @param {Object} params - Challenge parameters
   * @param {number} params.minAge - Minimum age required (1-150)
   * @param {string} [params.callbackUrl] - Optional webhook URL to receive notifications
   * @returns {Promise<Object>} Challenge details
   * @property {string} challengeId - Unique challenge identifier
   * @property {string} qrCodeUrl - URL to display as QR code
   * @property {string} deepLinkUrl - Deep link URL for mobile apps
   * @property {number} expiresAt - Expiration timestamp
   */
  async createChallenge(params) {
    const { minAge, callbackUrl } = params;

    if (!minAge || typeof minAge !== "number" || minAge < 1 || minAge > 150) {
      throw new Error("minAge must be a number between 1 and 150");
    }

    const response = await fetch(
      `${this.baseUrl}/api/integrator/challenge/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          minAge,
          callbackUrl,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create challenge");
    }

    return await response.json();
  }

  /**
   * Verify a challenge and get its current status
   *
   * @param {string} challengeId - The challenge ID to verify
   * @returns {Promise<Object>} Verification result
   * @property {boolean} verified - Whether the challenge was approved
   * @property {string} status - Challenge status (pending|approved|rejected|expired)
   * @property {string} [walletAddress] - Wallet address (if approved)
   * @property {number} minAge - Minimum age requirement
   * @property {number} createdAt - Creation timestamp
   * @property {number} expiresAt - Expiration timestamp
   * @property {number} [respondedAt] - Response timestamp (if completed)
   */
  async verifyChallenge(challengeId) {
    if (!challengeId) {
      throw new Error("challengeId is required");
    }

    const response = await fetch(
      `${this.baseUrl}/api/integrator/challenge/verify/${challengeId}`,
      {
        method: "GET",
        headers: {
          "X-API-Key": this.apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to verify challenge");
    }

    return await response.json();
  }

  /**
   * Poll a challenge until it's completed or expires
   *
   * @param {string} challengeId - The challenge ID to poll
   * @param {Object} [options] - Polling options
   * @param {number} [options.interval=2000] - Polling interval in ms
   * @param {number} [options.timeout=600000] - Total timeout in ms (default 10 min)
   * @returns {Promise<Object>} Final verification result
   */
  async pollChallenge(challengeId, options = {}) {
    const interval = options.interval || 2000;
    const timeout = options.timeout || 600000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const result = await this.verifyChallenge(challengeId);

          // Check if completed
          if (result.status === "approved" || result.status === "rejected") {
            resolve(result);
            return;
          }

          // Check if expired
          if (result.status === "expired") {
            reject(new Error("Challenge expired"));
            return;
          }

          // Check timeout
          if (Date.now() - startTime > timeout) {
            reject(new Error("Polling timeout"));
            return;
          }

          // Continue polling
          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }
}

module.exports = CardlessIDVerifier;
