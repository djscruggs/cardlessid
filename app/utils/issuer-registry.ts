/**
 * Utility functions for interacting with the Issuer Registry smart contract
 * Handles authorization, revocation, and verification of credential issuers
 */

import algosdk from "algosdk";
import { algodClient } from "./algorand";

// Replace with your deployed contract app ID
export const ISSUER_REGISTRY_APP_ID = parseInt(
  process.env.ISSUER_REGISTRY_APP_ID || "0"
);

export interface IssuerMetadata {
  name: string;
  fullName: string;
  website: string;
  organizationType: string;
  jurisdiction: string;
  updatedAt: number; // Unix timestamp
}

export interface IssuerStatus {
  address: string;
  authorizedAt: number; // Unix timestamp
  revokedAt: number | null; // Unix timestamp or null if not revoked
  revokeAllPrior: boolean; // If true, all credentials from this issuer are invalid
  vouchedBy: string; // Address of issuer who vouched for this one
  isActive: boolean; // Computed: true if authorized and not revoked
  metadata?: IssuerMetadata; // Optional metadata
}

export interface CredentialRevocation {
  credentialId: string;
  revokedAt: number;
  issuerAddress: string;
}

/**
 * Add a new authorized issuer to the registry with metadata
 * Requires either admin private key OR an active issuer's private key (vouching)
 */
export async function addIssuer(
  voucherPrivateKey: Uint8Array,
  issuerAddress: string,
  metadata: {
    name: string;
    fullName: string;
    website: string;
    organizationType: string;
    jurisdiction: string;
  }
): Promise<string> {
  try {
    const voucherAddress = algosdk.encodeAddress(
      algosdk.secretKeyToPublicKey(voucherPrivateKey)
    );

    const suggestedParams = await algodClient.getTransactionParams().do();

    // Encode issuer address as bytes
    const issuerAddressBytes = algosdk.decodeAddress(issuerAddress).publicKey;
    const voucherAddressBytes = algosdk.decodeAddress(voucherAddress).publicKey;

    // Encode metadata as bytes
    const nameBytes = new Uint8Array(Buffer.from(metadata.name, "utf-8"));
    const fullNameBytes = new Uint8Array(Buffer.from(metadata.fullName, "utf-8"));
    const websiteBytes = new Uint8Array(Buffer.from(metadata.website, "utf-8"));
    const orgTypeBytes = new Uint8Array(Buffer.from(metadata.organizationType, "utf-8"));
    const jurisdictionBytes = new Uint8Array(Buffer.from(metadata.jurisdiction, "utf-8"));

    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: voucherAddress,
      appIndex: ISSUER_REGISTRY_APP_ID,
      appArgs: [
        new Uint8Array(Buffer.from("add_issuer")),
        issuerAddressBytes,
        nameBytes,
        fullNameBytes,
        websiteBytes,
        orgTypeBytes,
        jurisdictionBytes,
      ],
      suggestedParams,
      // Box references: new issuer + voucher + metadata box
      boxes: [
        { appIndex: ISSUER_REGISTRY_APP_ID, name: issuerAddressBytes },
        { appIndex: ISSUER_REGISTRY_APP_ID, name: voucherAddressBytes },
        { appIndex: ISSUER_REGISTRY_APP_ID, name: new Uint8Array([...Buffer.from("meta:"), ...issuerAddressBytes]) },
      ],
    });

    const signedTxn = appCallTxn.signTxn(voucherPrivateKey);
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algodClient, response.txid, 4);

    console.log(
      `✓ Added issuer ${issuerAddress} (vouched by ${voucherAddress}) with tx: ${response.txid}`
    );
    return response.txid;
  } catch (error) {
    console.error("Error adding issuer:", error);
    throw error;
  }
}

/**
 * Revoke a issuer's authorization
 * Optionally invalidate all their existing credentials
 */
export async function revokeIssuer(
  adminPrivateKey: Uint8Array,
  issuerAddress: string,
  revokeAllPrior: boolean = false
): Promise<string> {
  try {
    const adminAddress = algosdk.encodeAddress(
      algosdk.secretKeyToPublicKey(adminPrivateKey)
    );

    const suggestedParams = await algodClient.getTransactionParams().do();

    const issuerAddressBytes = algosdk.decodeAddress(issuerAddress).publicKey;

    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: adminAddress,
      appIndex: ISSUER_REGISTRY_APP_ID,
      appArgs: [
        new Uint8Array(Buffer.from("revoke_issuer")),
        issuerAddressBytes,
        algosdk.encodeUint64(revokeAllPrior ? 1 : 0),
      ],
      suggestedParams,
      boxes: [{ appIndex: ISSUER_REGISTRY_APP_ID, name: issuerAddressBytes }],
    });

    const signedTxn = appCallTxn.signTxn(adminPrivateKey);
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algodClient, response.txid, 4);

    console.log(
      `✓ Revoked issuer ${issuerAddress} (revokeAll: ${revokeAllPrior}) with tx: ${response.txid}`
    );
    return response.txid;
  } catch (error) {
    console.error("Error revoking issuer:", error);
    throw error;
  }
}

/**
 * Reinstate a previously revoked issuer
 */
export async function reinstateIssuer(
  adminPrivateKey: Uint8Array,
  issuerAddress: string
): Promise<string> {
  try {
    const adminAddress = algosdk.encodeAddress(
      algosdk.secretKeyToPublicKey(adminPrivateKey)
    );

    const suggestedParams = await algodClient.getTransactionParams().do();

    const issuerAddressBytes = algosdk.decodeAddress(issuerAddress).publicKey;

    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: adminAddress,
      appIndex: ISSUER_REGISTRY_APP_ID,
      appArgs: [
        new Uint8Array(Buffer.from("reinstate_issuer")),
        issuerAddressBytes,
      ],
      suggestedParams,
      boxes: [{ appIndex: ISSUER_REGISTRY_APP_ID, name: issuerAddressBytes }],
    });

    const signedTxn = appCallTxn.signTxn(adminPrivateKey);
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algodClient, response.txid, 4);

    console.log(
      `✓ Reinstated issuer ${issuerAddress} with tx: ${response.txid}`
    );
    return response.txid;
  } catch (error) {
    console.error("Error reinstating issuer:", error);
    throw error;
  }
}

/**
 * Revoke a specific credential
 */
export async function revokeCredential(
  adminPrivateKey: Uint8Array,
  credentialId: string,
  issuerAddress: string
): Promise<string> {
  try {
    const adminAddress = algosdk.encodeAddress(
      algosdk.secretKeyToPublicKey(adminPrivateKey)
    );

    const suggestedParams = await algodClient.getTransactionParams().do();

    const issuerAddressBytes = algosdk.decodeAddress(issuerAddress).publicKey;
    const credentialIdBytes = new Uint8Array(Buffer.from(credentialId, "utf-8"));

    // Box key is "cred:" + credential_id
    const boxKey = new Uint8Array([
      ...Buffer.from("cred:"),
      ...credentialIdBytes,
    ]);

    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: adminAddress,
      appIndex: ISSUER_REGISTRY_APP_ID,
      appArgs: [
        new Uint8Array(Buffer.from("revoke_credential")),
        credentialIdBytes,
        issuerAddressBytes,
      ],
      suggestedParams,
      boxes: [{ appIndex: ISSUER_REGISTRY_APP_ID, name: boxKey }],
    });

    const signedTxn = appCallTxn.signTxn(adminPrivateKey);
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algodClient, response.txid, 4);

    console.log(
      `✓ Revoked credential ${credentialId} with tx: ${response.txid}`
    );
    return response.txid;
  } catch (error) {
    console.error("Error revoking credential:", error);
    throw error;
  }
}

/**
 * Get issuer metadata from the registry
 * Returns null if metadata not found
 */
export async function getIssuerMetadata(
  issuerAddress: string
): Promise<IssuerMetadata | null> {
  try {
    const issuerAddressBytes = algosdk.decodeAddress(issuerAddress).publicKey;
    const metaBoxKey = new Uint8Array([...Buffer.from("meta:"), ...issuerAddressBytes]);

    try {
      const boxResponse = await algodClient
        .getApplicationBoxByName(ISSUER_REGISTRY_APP_ID, metaBoxKey)
        .do();

      const boxValue = boxResponse.value;

      // Parse metadata: [updated_at (8), name, full_name, url, org_type, jurisdiction]
      let offset = 0;
      
      // Parse updated_at
      const updatedAt = Number(
        algosdk.decodeUint64(new Uint8Array(boxValue.slice(offset, offset + 8)), "safe")
      );
      offset += 8;

      // Parse name (variable length, need to find next field)
      const nameStart = offset;
      // Find end of name by looking for next field pattern
      // This is simplified - in practice you'd need more sophisticated parsing
      const nameEnd = boxValue.indexOf(0, nameStart); // Assuming null-terminated strings
      const name = new TextDecoder().decode(boxValue.slice(nameStart, nameEnd));
      offset = nameEnd + 1;

      // Parse full_name
      const fullNameStart = offset;
      const fullNameEnd = boxValue.indexOf(0, fullNameStart);
      const fullName = new TextDecoder().decode(boxValue.slice(fullNameStart, fullNameEnd));
      offset = fullNameEnd + 1;

      // Parse website
      const websiteStart = offset;
      const websiteEnd = boxValue.indexOf(0, websiteStart);
      const website = new TextDecoder().decode(boxValue.slice(websiteStart, websiteEnd));
      offset = websiteEnd + 1;

      // Parse organization_type
      const orgTypeStart = offset;
      const orgTypeEnd = boxValue.indexOf(0, orgTypeStart);
      const organizationType = new TextDecoder().decode(boxValue.slice(orgTypeStart, orgTypeEnd));
      offset = orgTypeEnd + 1;

      // Parse jurisdiction (remaining bytes)
      const jurisdiction = new TextDecoder().decode(boxValue.slice(offset));

      return {
        name,
        fullName,
        website,
        organizationType,
        jurisdiction,
        updatedAt,
      };
    } catch (error: any) {
      // Box doesn't exist - metadata not found
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error querying issuer metadata:", error);
    throw error;
  }
}

/**
 * Update issuer metadata (admin only)
 */
export async function updateIssuerMetadata(
  adminPrivateKey: Uint8Array,
  issuerAddress: string,
  metadata: {
    name: string;
    fullName: string;
    website: string;
    organizationType: string;
    jurisdiction: string;
  }
): Promise<string> {
  try {
    const adminAddress = algosdk.encodeAddress(
      algosdk.secretKeyToPublicKey(adminPrivateKey)
    );

    const suggestedParams = await algodClient.getTransactionParams().do();

    const issuerAddressBytes = algosdk.decodeAddress(issuerAddress).publicKey;

    // Encode metadata as bytes
    const nameBytes = new Uint8Array(Buffer.from(metadata.name, "utf-8"));
    const fullNameBytes = new Uint8Array(Buffer.from(metadata.fullName, "utf-8"));
    const websiteBytes = new Uint8Array(Buffer.from(metadata.website, "utf-8"));
    const orgTypeBytes = new Uint8Array(Buffer.from(metadata.organizationType, "utf-8"));
    const jurisdictionBytes = new Uint8Array(Buffer.from(metadata.jurisdiction, "utf-8"));

    const metaBoxKey = new Uint8Array([...Buffer.from("meta:"), ...issuerAddressBytes]);

    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from: adminAddress,
      appIndex: ISSUER_REGISTRY_APP_ID,
      appArgs: [
        new Uint8Array(Buffer.from("update_metadata")),
        issuerAddressBytes,
        nameBytes,
        fullNameBytes,
        websiteBytes,
        orgTypeBytes,
        jurisdictionBytes,
      ],
      suggestedParams,
      boxes: [
        { appIndex: ISSUER_REGISTRY_APP_ID, name: issuerAddressBytes },
        { appIndex: ISSUER_REGISTRY_APP_ID, name: metaBoxKey },
      ],
    });

    const signedTxn = appCallTxn.signTxn(adminPrivateKey);
    const response = await algodClient.sendRawTransaction(signedTxn).do();

    await algosdk.waitForConfirmation(algodClient, response.txid, 4);

    console.log(
      `✓ Updated metadata for issuer ${issuerAddress} with tx: ${response.txid}`
    );
    return response.txid;
  } catch (error) {
    console.error("Error updating issuer metadata:", error);
    throw error;
  }
}

/**
 * Query issuer status from the registry
 * Returns null if issuer not found
 */
export async function getIssuerStatus(
  issuerAddress: string
): Promise<IssuerStatus | null> {
  try {
    // For read-only operations, we simulate the transaction
    // This allows us to read box storage without paying transaction fees

    const issuerAddressBytes = algosdk.decodeAddress(issuerAddress).publicKey;

    // Read the box directly using algod API
    const boxName = Buffer.from(issuerAddressBytes).toString("base64");

    try {
      const boxResponse = await algodClient
        .getApplicationBoxByName(ISSUER_REGISTRY_APP_ID, issuerAddressBytes)
        .do();

      const boxValue = boxResponse.value;

      // Parse box value: [authorized_at (8), revoked_at (8), revoke_all_flag (8), vouched_by (32)]
      const authorizedAt = Number(
        algosdk.decodeUint64(new Uint8Array(boxValue.slice(0, 8)), "safe")
      );
      const revokedAtRaw = Number(
        algosdk.decodeUint64(new Uint8Array(boxValue.slice(8, 16)), "safe")
      );
      const revokeAllPriorRaw = Number(
        algosdk.decodeUint64(new Uint8Array(boxValue.slice(16, 24)), "safe")
      );
      const vouchedByBytes = new Uint8Array(boxValue.slice(24, 56));
      const vouchedBy = algosdk.encodeAddress(vouchedByBytes);

      const revokedAt = revokedAtRaw === 0 ? null : revokedAtRaw;
      const revokeAllPrior = revokeAllPriorRaw === 1;
      const isActive = revokedAt === null;

      // Get metadata if available
      const metadata = await getIssuerMetadata(issuerAddress);

      return {
        address: issuerAddress,
        authorizedAt,
        revokedAt,
        revokeAllPrior,
        vouchedBy,
        isActive,
        metadata,
      };
    } catch (error: any) {
      // Box doesn't exist - issuer not found
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error querying issuer status:", error);
    throw error;
  }
}

/**
 * Query credential revocation status
 * Returns null if credential not revoked
 */
export async function getCredentialRevocation(
  credentialId: string
): Promise<CredentialRevocation | null> {
  try {
    const credentialIdBytes = new Uint8Array(Buffer.from(credentialId, "utf-8"));

    // Box key is "cred:" + credential_id
    const boxKey = new Uint8Array([
      ...Buffer.from("cred:"),
      ...credentialIdBytes,
    ]);

    try {
      const boxResponse = await algodClient
        .getApplicationBoxByName(ISSUER_REGISTRY_APP_ID, boxKey)
        .do();

      const boxValue = boxResponse.value;

      // Parse: [revoked_at (8), issuer_address (32)]
      const revokedAt = Number(
        algosdk.decodeUint64(new Uint8Array(boxValue.slice(0, 8)), "safe")
      );
      const issuerAddressBytes = new Uint8Array(boxValue.slice(8, 40));
      const issuerAddress = algosdk.encodeAddress(issuerAddressBytes);

      return {
        credentialId,
        revokedAt,
        issuerAddress,
      };
    } catch (error: any) {
      // Box doesn't exist - credential not revoked
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error querying credential revocation:", error);
    throw error;
  }
}

/**
 * Get all issuers from the registry (for uniqueness checking)
 * Note: This is a simplified implementation - in practice you'd need to maintain an index
 */
export async function getAllIssuersFromRegistry(): Promise<IssuerStatus[]> {
  // This is a placeholder implementation
  // In a real system, you'd maintain an index of all issuer addresses
  // For now, we'll return an empty array and rely on the API to handle uniqueness
  console.warn("getAllIssuersFromRegistry: Not implemented - using empty array");
  return [];
}

/**
 * Verify if a credential is valid based on:
 * 1. Verifier was authorized at time of issuance
 * 2. Verifier was not revoked at time of issuance (or if revokeAllPrior is false)
 * 3. Credential itself has not been individually revoked
 */
export async function verifyCredentialValidity(
  credentialId: string,
  issuerAddress: string,
  issuanceDate: Date
): Promise<{
  valid: boolean;
  reason?: string;
}> {
  try {
    // Check 1: Get issuer status
    const issuerStatus = await getIssuerStatus(issuerAddress);

    if (!issuerStatus) {
      return {
        valid: false,
        reason: "Issuer not found in issuer registry",
      };
    }

    const issuanceTimestamp = Math.floor(issuanceDate.getTime() / 1000);

    // Check 2: Was issuer authorized at time of issuance?
    if (issuanceTimestamp < issuerStatus.authorizedAt) {
      return {
        valid: false,
        reason: "Credential issued before issuer was authorized",
      };
    }

    // Check 3: Was issuer revoked before issuance?
    if (
      issuerStatus.revokedAt &&
      issuanceTimestamp >= issuerStatus.revokedAt
    ) {
      return {
        valid: false,
        reason: "Credential issued after issuer was revoked",
      };
    }

    // Check 4: If issuer has revokeAllPrior flag, all their credentials are invalid
    if (issuerStatus.revokeAllPrior) {
      return {
        valid: false,
        reason: "All credentials from this issuer have been revoked",
      };
    }

    // Check 5: Is this specific credential revoked?
    const credentialRevocation = await getCredentialRevocation(credentialId);

    if (credentialRevocation) {
      return {
        valid: false,
        reason: `Credential revoked on ${new Date(credentialRevocation.revokedAt * 1000).toISOString()}`,
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error verifying credential validity:", error);
    return {
      valid: false,
      reason: "Error verifying credential",
    };
  }
}
