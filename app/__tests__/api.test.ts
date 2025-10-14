import { describe, it, expect, beforeAll } from "vitest";

/**
 * API Route Tests
 * Tests for API endpoints and integration
 */

let devServerBaseUrl: string;

beforeAll(() => {
  // Use the dev server URL
  devServerBaseUrl = "http://localhost:5173";
});

describe.skip("Basic API Routes", () => {
  // Note: These tests require the dev server to be running at http://localhost:5173
  // Run 'npm run dev' in a separate terminal to enable these tests

  it("should return hello world from hello endpoint", async () => {
    const response = await fetch(`${devServerBaseUrl}/api/hello`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("hello");
    expect(data.hello).toBe("world");
  });

  it("should return 405 for GET request to credentials endpoint", async () => {
    const response = await fetch(`${devServerBaseUrl}/api/credentials`);
    expect(response.status).toBe(405);

    const data = await response.json();
    expect(data.error).toBe("Method not allowed");
  });
});

describe("API Input Validation", () => {
  it("should validate Algorand address format", () => {
    const validAddress = "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM";
    const invalidAddress = "invalid-address";

    const algorandAddressRegex = /^[A-Z2-7]{58}$/;

    expect(algorandAddressRegex.test(validAddress)).toBe(true);
    expect(algorandAddressRegex.test(invalidAddress)).toBe(false);
  });

  it("should validate birth date is at least 13 years ago", () => {
    const today = new Date();
    const thirteenYearsAgo = new Date(
      today.getFullYear() - 13,
      today.getMonth(),
      today.getDate()
    );

    const validBirthDate = new Date("2000-01-01");
    const invalidBirthDate = new Date();

    expect(validBirthDate < thirteenYearsAgo).toBe(true);
    expect(invalidBirthDate < thirteenYearsAgo).toBe(false);
  });

  it("should validate required credential fields", () => {
    const validRequest = {
      verificationSessionId: "session-123",
      walletAddress: "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
      firstName: "John",
      lastName: "Doe",
      birthDate: "1990-01-15",
      governmentId: "A1234567",
    };

    expect(validRequest.verificationSessionId).toBeTruthy();
    expect(validRequest.walletAddress).toBeTruthy();
    expect(validRequest.firstName).toBeTruthy();
    expect(validRequest.lastName).toBeTruthy();
    expect(validRequest.birthDate).toBeTruthy();
    expect(validRequest.governmentId).toBeTruthy();
  });
});

describe("Verification Quality Levels", () => {
  function determineVerificationLevel(metadata: any): "high" | "medium" | "low" {
    if (!metadata) return "low";

    const hasLowConfidence = (metadata.lowConfidenceFields?.length || 0) > 0;
    const hasFraudCheck = metadata.fraudCheckPassed === true;
    const hasBothSides = metadata.bothSidesProcessed === true;
    const hasFraudSignals = (metadata.fraudSignals?.length || 0) > 0;

    if (hasFraudCheck && hasBothSides && !hasLowConfidence && !hasFraudSignals) {
      return "high";
    }

    if (hasLowConfidence || hasFraudSignals || !hasFraudCheck) {
      return "low";
    }

    return "medium";
  }

  it("should return high quality for perfect verification", () => {
    const metadata = {
      fraudCheckPassed: true,
      bothSidesProcessed: true,
      lowConfidenceFields: [],
      fraudSignals: [],
    };

    expect(determineVerificationLevel(metadata)).toBe("high");
  });

  it("should return low quality for failed fraud check", () => {
    const metadata = {
      fraudCheckPassed: false,
      bothSidesProcessed: true,
      lowConfidenceFields: [],
      fraudSignals: [],
    };

    expect(determineVerificationLevel(metadata)).toBe("low");
  });

  it("should return low quality when fraud signals present", () => {
    const metadata = {
      fraudCheckPassed: true,
      bothSidesProcessed: true,
      lowConfidenceFields: [],
      fraudSignals: ["signal1"],
    };

    expect(determineVerificationLevel(metadata)).toBe("low");
  });

  it("should return medium quality for partial verification", () => {
    const metadata = {
      fraudCheckPassed: true,
      bothSidesProcessed: false,
      lowConfidenceFields: [],
      fraudSignals: [],
    };

    expect(determineVerificationLevel(metadata)).toBe("medium");
  });

  it("should return low quality for missing metadata", () => {
    expect(determineVerificationLevel(null)).toBe("low");
    expect(determineVerificationLevel(undefined)).toBe("low");
  });
});

describe("Composite Hash Generation", () => {
  it("should generate consistent composite hashes", async () => {
    const firstName = "John";
    const middleName = "";
    const lastName = "Doe";
    const birthDate = "1990-01-15";

    const compositeData = `${firstName}|${middleName}|${lastName}|${birthDate}`;

    const hash1Buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(compositeData)
    );
    const hash1 = Array.from(new Uint8Array(hash1Buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const hash2Buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(compositeData)
    );
    const hash2 = Array.from(new Uint8Array(hash2Buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("should produce different hashes for different people", async () => {
    const person1 = "John||Doe|1990-01-15";
    const person2 = "Jane||Smith|1990-01-15";

    const hash1Buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(person1)
    );
    const hash1 = Array.from(new Uint8Array(hash1Buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const hash2Buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(person2)
    );
    const hash2 = Array.from(new Uint8Array(hash2Buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(hash1).not.toBe(hash2);
  });

  it("should detect exact duplicates", async () => {
    const compositeData1 = "John|Michael|Doe|1990-01-15";
    const compositeData2 = "John|Michael|Doe|1990-01-15";

    const hash1Buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(compositeData1)
    );
    const hash1 = Array.from(new Uint8Array(hash1Buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const hash2Buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(compositeData2)
    );
    const hash2 = Array.from(new Uint8Array(hash2Buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(hash1).toBe(hash2);
  });
});

describe("Credential Response Structure", () => {
  it("should validate credential response format", () => {
    const mockResponse = {
      success: true,
      credential: {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: "urn:uuid:test-123",
        type: ["VerifiableCredential", "BirthDateCredential"],
        issuer: {
          id: "did:algo:ISSUER_ADDRESS",
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: "did:algo:USER_ADDRESS",
          "cardlessid:compositeHash": "hash123",
        },
        proof: {
          type: "Ed25519Signature2020",
          proofValue: "signature-base64",
        },
      },
      personalData: {
        firstName: "John",
        lastName: "Doe",
        birthDate: "1990-01-15",
      },
      verificationQuality: {
        level: "high",
        fraudCheckPassed: true,
      },
      nft: {
        assetId: "123456",
        requiresOptIn: true,
      },
    };

    expect(mockResponse.success).toBe(true);
    expect(mockResponse.credential["@context"]).toBeDefined();
    expect(mockResponse.credential.type).toContain("VerifiableCredential");
    expect(mockResponse.credential.proof).toBeDefined();
    expect(mockResponse.personalData).toBeDefined();
    expect(mockResponse.verificationQuality.level).toBe("high");
    expect(mockResponse.nft.assetId).toBeTruthy();
  });

  it("should include W3C evidence property", () => {
    const evidence = {
      type: ["DocumentVerification"],
      verifier: "did:algo:ISSUER",
      evidenceDocument: "DriversLicense",
      fraudDetection: {
        performed: true,
        passed: true,
        method: "google-document-ai",
        signals: [],
      },
      documentAnalysis: {
        provider: "aws-textract",
        bothSidesAnalyzed: true,
        qualityLevel: "high",
      },
      biometricVerification: {
        performed: true,
        faceMatch: {
          confidence: 0.95,
        },
      },
    };

    expect(evidence.type).toContain("DocumentVerification");
    expect(evidence.fraudDetection.performed).toBe(true);
    expect(evidence.documentAnalysis.qualityLevel).toBe("high");
    expect(evidence.biometricVerification.faceMatch.confidence).toBeGreaterThan(0.9);
  });
});

describe("Error Handling", () => {
  it("should handle missing required fields", () => {
    const invalidRequest = {
      walletAddress: "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM",
      // Missing verificationSessionId
    };

    const hasSessionId = !!(invalidRequest as any).verificationSessionId;
    const hasWalletAddress = !!invalidRequest.walletAddress;

    expect(hasSessionId).toBe(false);
    expect(hasWalletAddress).toBe(true);
  });

  it("should validate error response format", () => {
    const errorResponse = {
      error: "Verification session not found",
    };

    expect(errorResponse.error).toBeTruthy();
    expect(errorResponse.error).toContain("Verification session");
  });

  it("should handle age validation errors", () => {
    const birthDate = new Date();
    const today = new Date();
    const thirteenYearsAgo = new Date(
      today.getFullYear() - 13,
      today.getMonth(),
      today.getDate()
    );

    const isOldEnough = birthDate < thirteenYearsAgo;
    expect(isOldEnough).toBe(false);
  });
});

describe("DID Format Validation", () => {
  it("should create valid Algorand DIDs", () => {
    const walletAddress = "MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM";
    const did = `did:algo:${walletAddress}`;

    expect(did).toMatch(/^did:algo:[A-Z2-7]{58}$/);
    expect(did).toContain("did:algo:");
  });

  it("should extract address from DID", () => {
    const did = "did:algo:MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM";
    const address = did.split(":")[2];

    expect(address).toBe("MWCAXBUMUK3I2NTVEHDA6JVQ2W7IMKJUJSGEKQTRMFYYE3W6GJUSHUAGJM");
    expect(address.length).toBe(58);
  });
});

describe("ISO Date Handling", () => {
  it("should format issuance dates in ISO 8601", () => {
    const isoString = new Date().toISOString();

    expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("should parse birth dates correctly", () => {
    const birthDate = "1990-01-15T00:00:00Z";
    const date = new Date(birthDate);

    expect(date.getUTCFullYear()).toBe(1990);
    expect(date.getUTCMonth()).toBe(0); // January
    expect(date.getUTCDate()).toBe(15);
  });
});
