import { describe, it, expect } from "vitest";

/**
 * BigInt Serialization Regression Tests
 *
 * These tests prevent the "Do not know how to serialize a BigInt" error
 * that occurred when returning credential responses with BigInt values
 * from Algorand blockchain operations.
 *
 * Context: Algorand SDK operations often return BigInt values for asset IDs,
 * transaction IDs, and other numeric fields. These must be converted to
 * strings or numbers before JSON serialization.
 */

describe("BigInt Serialization", () => {
  describe("JSON.stringify with BigInt replacer", () => {
    it("should serialize BigInt values to strings", () => {
      const data = {
        assetId: BigInt(747879310),
        amount: BigInt(1000000),
        normalNumber: 123,
        normalString: "test",
      };

      const jsonString = JSON.stringify(data, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      expect(jsonString).toBe(
        '{"assetId":"747879310","amount":"1000000","normalNumber":123,"normalString":"test"}'
      );
    });

    it("should serialize nested BigInt values", () => {
      const data = {
        credential: {
          id: "test-123",
          assetId: BigInt(747879310),
        },
        blockchain: {
          transaction: {
            id: "ABC123",
            confirmedRound: BigInt(12345678),
          },
        },
        duplicateAssetIds: [BigInt(111), BigInt(222), BigInt(333)],
      };

      const jsonString = JSON.stringify(data, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      const parsed = JSON.parse(jsonString);

      expect(parsed.credential.assetId).toBe("747879310");
      expect(parsed.blockchain.transaction.confirmedRound).toBe("12345678");
      expect(parsed.duplicateAssetIds).toEqual(["111", "222", "333"]);
    });

    it("should serialize arrays of BigInt", () => {
      const duplicateAssetIds = [
        BigInt(747879310),
        BigInt(747879311),
        BigInt(747879312),
      ];

      const jsonString = JSON.stringify(duplicateAssetIds, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      expect(jsonString).toBe('["747879310","747879311","747879312"]');
    });

    it("should handle mixed types in arrays", () => {
      const mixedArray = [
        BigInt(123),
        456,
        "789",
        { id: BigInt(999), name: "test" },
      ];

      const jsonString = JSON.stringify(mixedArray, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      const parsed = JSON.parse(jsonString);

      expect(parsed[0]).toBe("123");
      expect(parsed[1]).toBe(456);
      expect(parsed[2]).toBe("789");
      expect(parsed[3].id).toBe("999");
      expect(parsed[3].name).toBe("test");
    });
  });

  describe("Credential Response Structure", () => {
    it("should serialize a typical credential response without errors", () => {
      const mockCredentialResponse = {
        success: true,
        credential: {
          id: "urn:uuid:123-456",
          issuanceDate: new Date().toISOString(),
        },
        nft: {
          assetId: "747879310", // Already converted to string
          requiresOptIn: true,
        },
        blockchain: {
          transaction: {
            id: "Q7WU44GZYXXJAAJJDWNS6YJEFTGUVUZSLBPNA73OP7QVTKCZHZCA",
            explorerUrl: "https://testnet.explorer.perawallet.app",
          },
        },
        duplicateDetection: {
          duplicateCount: 0,
          isDuplicate: false,
          duplicateAssetIds: [], // Empty array
        },
      };

      // Should not throw
      expect(() => JSON.stringify(mockCredentialResponse)).not.toThrow();
    });

    it("should handle credential response with duplicate asset IDs", () => {
      const mockCredentialResponse = {
        success: true,
        duplicateDetection: {
          duplicateCount: 2,
          isDuplicate: true,
          duplicateAssetIds: [747879310, 747879311], // Numbers (converted from BigInt)
        },
      };

      const jsonString = JSON.stringify(mockCredentialResponse);
      const parsed = JSON.parse(jsonString);

      expect(parsed.duplicateDetection.duplicateAssetIds).toEqual([
        747879310, 747879311,
      ]);
    });
  });

  describe("BigInt conversion utilities", () => {
    it("should convert BigInt to number", () => {
      const bigIntValue = BigInt(747879310);
      const numberValue = Number(bigIntValue);

      expect(numberValue).toBe(747879310);
      expect(typeof numberValue).toBe("number");
    });

    it("should convert array of BigInt to array of numbers", () => {
      const bigIntArray = [BigInt(111), BigInt(222), BigInt(333)];
      const numberArray = bigIntArray.map((id) => Number(id));

      expect(numberArray).toEqual([111, 222, 333]);
      expect(numberArray.every((n) => typeof n === "number")).toBe(true);
    });

    it("should handle toString() conversion", () => {
      const bigIntValue = BigInt(747879310);
      const stringValue = bigIntValue.toString();

      expect(stringValue).toBe("747879310");
      expect(typeof stringValue).toBe("string");
    });
  });

  describe("Response.json() vs JSON.stringify()", () => {
    it("should demonstrate the difference", () => {
      const dataWithBigInt = {
        assetId: BigInt(747879310),
      };

      // This would throw: "Do not know how to serialize a BigInt"
      // Response.json(dataWithBigInt)

      // This works with replacer
      const jsonString = JSON.stringify(dataWithBigInt, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      expect(jsonString).toBe('{"assetId":"747879310"}');
    });

    it("should create Response with stringified JSON", () => {
      const dataWithBigInt = {
        assetId: BigInt(747879310),
        success: true,
      };

      const jsonString = JSON.stringify(dataWithBigInt, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      const response = new Response(jsonString, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("Edge cases", () => {
    it("should handle very large BigInt values", () => {
      const largeValue = BigInt("999999999999999999999999999");

      const jsonString = JSON.stringify({ value: largeValue }, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      const parsed = JSON.parse(jsonString);
      expect(parsed.value).toBe("999999999999999999999999999");
    });

    it("should handle zero BigInt", () => {
      const zero = BigInt(0);

      const jsonString = JSON.stringify({ value: zero }, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      const parsed = JSON.parse(jsonString);
      expect(parsed.value).toBe("0");
    });

    it("should handle negative BigInt", () => {
      const negative = BigInt(-12345);

      const jsonString = JSON.stringify({ value: negative }, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      const parsed = JSON.parse(jsonString);
      expect(parsed.value).toBe("-12345");
    });

    it("should handle undefined and null alongside BigInt", () => {
      const data = {
        bigIntValue: BigInt(123),
        undefinedValue: undefined,
        nullValue: null,
        stringValue: "test",
      };

      const jsonString = JSON.stringify(data, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );

      const parsed = JSON.parse(jsonString);

      expect(parsed.bigIntValue).toBe("123");
      expect(parsed.undefinedValue).toBeUndefined();
      expect(parsed.nullValue).toBeNull();
      expect(parsed.stringValue).toBe("test");
    });
  });
});
