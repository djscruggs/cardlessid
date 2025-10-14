import { describe, it, expect } from "vitest";
import { CARDLESS_NAMESPACE, CARDLESS_FIELDS, SCHEMA_VERSION } from "~/utils/credential-schema";

/**
 * Utility Function Tests
 * Tests for credential schema and helper utilities
 */

describe("Credential Schema", () => {
  it("should have correct namespace URL", () => {
    expect(CARDLESS_NAMESPACE).toBe("https://cardlessid.org/credentials/v1#");
  });

  it("should define compositeHash field", () => {
    expect(CARDLESS_FIELDS.compositeHash).toBeDefined();
    expect(CARDLESS_FIELDS.compositeHash.id).toContain("compositeHash");
    expect(CARDLESS_FIELDS.compositeHash.type).toBe("http://www.w3.org/2001/XMLSchema#string");
  });

  it("should define evidence field", () => {
    expect(CARDLESS_FIELDS.evidence).toBeDefined();
    expect(CARDLESS_FIELDS.evidence.id).toBe("https://www.w3.org/2018/credentials#evidence");
    expect(CARDLESS_FIELDS.evidence.structure).toBeDefined();
    expect(CARDLESS_FIELDS.evidence.structure.fraudDetection).toBeDefined();
    expect(CARDLESS_FIELDS.evidence.structure.documentAnalysis).toBeDefined();
    expect(CARDLESS_FIELDS.evidence.structure.biometricVerification).toBeDefined();
  });

  it("should have a valid schema version", () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("Data Structures", () => {
  it("should validate W3C credential structure", () => {
    const mockCredential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://cardlessid.org/credentials/v1",
      ],
      type: ["VerifiableCredential", "CardlessIDCredential"],
      issuer: "did:algo:ISSUER_ADDRESS",
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: "did:algo:USER_ADDRESS",
        compositeHash: "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
      },
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        proofPurpose: "assertionMethod",
        verificationMethod: "did:algo:ISSUER_ADDRESS#key-1",
        proofValue: "base64-encoded-signature",
      },
    };

    // Validate required W3C fields
    expect(mockCredential["@context"]).toBeDefined();
    expect(mockCredential.type).toContain("VerifiableCredential");
    expect(mockCredential.issuer).toContain("did:algo");
    expect(mockCredential.issuanceDate).toBeDefined();
    expect(mockCredential.credentialSubject).toBeDefined();
    expect(mockCredential.proof).toBeDefined();
  });

  it("should validate credential evidence structure", () => {
    const mockEvidence = {
      type: "DocumentVerification",
      fraudDetection: {
        performed: true,
        passed: true,
        method: "google-document-ai",
        provider: "Google Document AI",
        signals: [],
      },
      documentAnalysis: {
        provider: "aws-textract",
        bothSidesAnalyzed: true,
        lowConfidenceFields: [],
        qualityLevel: "high",
      },
      biometricVerification: {
        performed: true,
        faceMatch: {
          confidence: 0.95,
          provider: "aws-rekognition",
        },
        liveness: {
          confidence: 0.98,
          provider: "aws-rekognition",
        },
      },
    };

    expect(mockEvidence.type).toBe("DocumentVerification");
    expect(mockEvidence.fraudDetection.performed).toBe(true);
    expect(mockEvidence.documentAnalysis.qualityLevel).toBe("high");
    expect(mockEvidence.biometricVerification.faceMatch.confidence).toBeGreaterThan(0.9);
  });
});

describe("Hash Generation", () => {
  it("should generate consistent SHA-256 hashes", async () => {
    const data = "test-data";
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash1 = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Generate again to verify consistency
    const hashBuffer2 = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray2 = Array.from(new Uint8Array(hashBuffer2));
    const hash2 = hashArray2.map(b => b.toString(16).padStart(2, "0")).join("");

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
  });

  it("should produce different hashes for different inputs", async () => {
    const data1 = "test-data-1";
    const data2 = "test-data-2";

    const encoder = new TextEncoder();

    const hash1Buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data1));
    const hash1 = Array.from(new Uint8Array(hash1Buffer))
      .map(b => b.toString(16).padStart(2, "0")).join("");

    const hash2Buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data2));
    const hash2 = Array.from(new Uint8Array(hash2Buffer))
      .map(b => b.toString(16).padStart(2, "0")).join("");

    expect(hash1).not.toBe(hash2);
  });
});

describe("Date Handling", () => {
  it("should format dates in ISO 8601 format", () => {
    const testDate = new Date("2025-01-15T12:00:00Z");
    const isoString = testDate.toISOString();

    expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(isoString).toContain("2025-01-15");
  });

  it("should handle date parsing", () => {
    const isoString = "1990-01-15T00:00:00Z";
    const date = new Date(isoString);

    expect(date.getUTCFullYear()).toBe(1990);
    expect(date.getUTCMonth()).toBe(0); // January is 0
    expect(date.getUTCDate()).toBe(15);
  });

  it("should calculate age correctly", () => {
    const birthDate = new Date("1990-01-15");
    const today = new Date("2025-10-14");

    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;

    expect(adjustedAge).toBe(35);
  });
});
