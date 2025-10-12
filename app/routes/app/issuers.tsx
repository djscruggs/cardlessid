/**
 * Issuer Registry List - Read-only view of all issuers
 * Reads data directly from blockchain box storage (no transaction fees)
 */

import { useState, useEffect } from "react";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/issuer-list";
import algosdk from "algosdk";

export async function loader({ request }: Route.LoaderArgs) {
  const appId = process.env.ISSUER_REGISTRY_APP_ID || "Not configured";
  const network = process.env.VITE_ALGORAND_NETWORK || "testnet";
  return {
    appId,
    network,
    explorerUrl:
      network === "mainnet"
        ? `https://explorer.perawallet.app/application/${appId}`
        : `https://testnet.explorer.perawallet.app/application/${appId}`,
  };
}

interface Issuer {
  address: string;
  name: string;
  url: string;
  addedAt: string;
  isActive: boolean;
}

function decodeIssuerInfo(boxValue: Uint8Array) {
  try {
    // Check if we have enough data
    if (!boxValue || boxValue.length < 1) {
      throw new Error("Invalid box value: empty or undefined");
    }

    console.log(`[Decode] Starting decode, total length: ${boxValue.length}`);
    console.log(`[Decode] All bytes:`, Array.from(boxValue));

    // ARC4 Struct format with dynamic fields uses offsets:
    // Byte 0: isActive (bool = 1 byte, but stored as 0x80 for true, 0x00 for false in ARC4)
    // Bytes 1-2: offset to name (uint16)
    // Bytes 3-4: offset to url (uint16)
    // Bytes 5-12: addedAt (uint64)
    // Then the actual string data follows

    let offset = 0;

    // Read isActive - ARC4 Bool is stored as 0x80 (true) or 0x00 (false)
    const isActive = boxValue[offset] === 0x80;
    console.log(`[Decode] isActive at offset ${offset}: ${boxValue[offset]} = ${isActive}`);
    offset += 1;

    // Read offset to name (2 bytes)
    const nameOffset = (boxValue[offset] << 8) | boxValue[offset + 1];
    console.log(`[Decode] Name offset: ${nameOffset}`);
    offset += 2;

    // Read offset to url (2 bytes)
    const urlOffset = (boxValue[offset] << 8) | boxValue[offset + 1];
    console.log(`[Decode] URL offset: ${urlOffset}`);
    offset += 2;

    // Read addedAt (8 bytes uint64, big-endian)
    const addedAtBytes = boxValue.slice(offset, offset + 8);
    const addedAt = Number(
      (BigInt(addedAtBytes[0]) << 56n) |
      (BigInt(addedAtBytes[1]) << 48n) |
      (BigInt(addedAtBytes[2]) << 40n) |
      (BigInt(addedAtBytes[3]) << 32n) |
      (BigInt(addedAtBytes[4]) << 24n) |
      (BigInt(addedAtBytes[5]) << 16n) |
      (BigInt(addedAtBytes[6]) << 8n) |
      BigInt(addedAtBytes[7])
    );
    console.log(`[Decode] addedAt: ${addedAt}`);
    offset += 8;

    // Now read the actual strings using their offsets
    // Read name at nameOffset
    const nameLength = (boxValue[nameOffset] << 8) | boxValue[nameOffset + 1];
    const name = new TextDecoder().decode(
      boxValue.slice(nameOffset + 2, nameOffset + 2 + nameLength)
    );
    console.log(`[Decode] Name: "${name}" (length ${nameLength})`);

    // Read url at urlOffset
    const urlLength = (boxValue[urlOffset] << 8) | boxValue[urlOffset + 1];
    const url = new TextDecoder().decode(
      boxValue.slice(urlOffset + 2, urlOffset + 2 + urlLength)
    );
    console.log(`[Decode] URL: "${url}" (length ${urlLength})`);

    return {
      isActive,
      name,
      url,
      addedAt,
    };
  } catch (error) {
    console.error("Error decoding issuer info:", error);
    throw error;
  }
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function IssuerList({ loaderData }: Route.ComponentProps) {
  const { appId, network, explorerUrl } = loaderData;
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIssuers();
  }, []);

  async function loadIssuers() {
    try {
      setLoading(true);
      setError(null);

      const appIdNum = parseInt(appId);
      if (isNaN(appIdNum) || appIdNum === 0) {
        setError(
          "Issuer Registry not deployed yet. Please deploy the smart contract first and set ISSUER_REGISTRY_APP_ID in .env"
        );
        setLoading(false);
        return;
      }

      // Create algod client
      const algodClient = new algosdk.Algodv2(
        "",
        network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443
      );

      // Get all boxes
      const boxes = await algodClient.getApplicationBoxes(appIdNum).do();
      console.log("boxes", boxes);
      console.log(`Found ${boxes.boxes.length} boxes in registry`);

      const issuerList: Issuer[] = [];

      for (const box of boxes.boxes) {
        try {
          console.log(`Processing box: name length=${box.name.length}, first byte=${box.name[0]}`);
          console.log(`Box name bytes:`, Array.from(box.name));

          // Extract address from box name (skip first byte which is prefix 'i')
          if (box.name.length < 2 || box.name[0] !== 105) {
            // 105 is 'i' in ASCII
            console.log(`Skipping non-issuer box: ${box.name}`);
            continue;
          }

          const addressBytes = box.name.slice(1);
          console.log(`Address bytes length: ${addressBytes.length}`);
          const issuerAddress = algosdk.encodeAddress(addressBytes);
          console.log(`Decoded address: ${issuerAddress}`);

          // Read box contents
          const boxResponse = await algodClient
            .getApplicationBoxByName(appIdNum, box.name)
            .do();

          console.log(`Box value length: ${boxResponse.value.length}`);
          console.log(`Box value bytes:`, Array.from(boxResponse.value.slice(0, 20)));

          const issuerInfo = decodeIssuerInfo(boxResponse.value);
          console.log(`Decoded issuer info:`, issuerInfo);

          if (issuerInfo.isActive) {
            issuerList.push({
              address: issuerAddress,
              name: issuerInfo.name,
              url: issuerInfo.url,
              addedAt:
                issuerInfo.addedAt > 0
                  ? new Date(issuerInfo.addedAt * 1000).toLocaleDateString()
                  : "Unknown",
              isActive: issuerInfo.isActive,
            });
          } else {
            console.log(`Skipping inactive issuer: ${issuerAddress}`);
          }
        } catch (boxError: any) {
          console.error(`Error processing box ${box.name}:`, boxError);
          // Continue processing other boxes even if one fails
          continue;
        }
      }

      // Sort by name
      issuerList.sort((a, b) => a.name.localeCompare(b.name));

      setIssuers(issuerList);
    } catch (err: any) {
      console.error("Error loading issuers:", err);
      setError(err.message || "Failed to load issuers");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Authorized Issuers</h1>
        <p className="text-gray-600">
          List of all active credential issuers in the registry
        </p>
        <div className="mt-4 p-4 bg-base-200 rounded-lg">
          <p className="text-sm">
            <strong>Network:</strong> {network}
          </p>
          <p className="text-sm">
            <strong>App ID:</strong> {appId}
          </p>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            View on Pera Explorer →
          </a>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && issuers.length === 0 && (
        <div className="alert alert-info">
          <span>No active issuers found in the registry</span>
        </div>
      )}

      {!loading && !error && issuers.length > 0 && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Total active issuers: {issuers.length}
          </div>

          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>URL</th>
                  <th>Wallet Address</th>
                  <th>Added Date</th>
                </tr>
              </thead>
              <tbody>
                {issuers.map((issuer) => (
                  <tr key={issuer.address}>
                    <td className="font-semibold">{issuer.name}</td>
                    <td>
                      <a
                        href={issuer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary"
                      >
                        {issuer.url}
                      </a>
                    </td>
                    <td>
                      <a
                        href={
                          network === "mainnet"
                            ? `https://explorer.perawallet.app/address/${issuer.address}`
                            : `https://testnet.explorer.perawallet.app/address/${issuer.address}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm link"
                        title={issuer.address}
                      >
                        {truncateAddress(issuer.address)}
                      </a>
                    </td>
                    <td>{issuer.addedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-8">
        <button onClick={loadIssuers} className="btn btn-outline btn-sm">
          Refresh List
        </button>
      </div>
    </div>
  );
}
