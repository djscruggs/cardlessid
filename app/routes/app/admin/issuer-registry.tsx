/**
 * Admin UI for Issuer Registry
 * Uses QR codes and wallet signing for security (no mnemonics exposed)
 */

import { useState, useEffect, useCallback } from "react";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/issuer-registry";
import algosdk from "algosdk";
import QRCode from "qrcode";
import AlgorandQRCode from "algorand-qrcode";
import { IssuerRegistryClient } from "../../../contracts/generated";

export async function loader({ request }: Route.LoaderArgs) {
  const appId = process.env.ISSUER_REGISTRY_APP_ID || "Not configured";
  const network = process.env.VITE_ALGORAND_NETWORK || "testnet";
  const adminMnemonic = process.env.ADMIN_MNEMONIC || "";
  return {
    appId,
    network,
    adminMnemonic,
    explorerUrl:
      network === "mainnet"
        ? `https://explorer.perawallet.app/application/${appId}`
        : `https://testnet.explorer.perawallet.app/application/${appId}`,
  };
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function IssuerRegistry({ loaderData }: Route.ComponentProps) {
  const { appId, network, adminMnemonic, explorerUrl } = loaderData;
  const [activeTab, setActiveTab] = useState<
    "add" | "query" | "revoke" | "verify" | "update"
  >("add");

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Issuer Registry Admin</h1>
        <p className="text-gray-600">
          Secure management using your Algorand wallet - no mnemonics exposed
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

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === "add" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("add")}
        >
          Add Issuer
        </button>
        <button
          className={`tab ${activeTab === "query" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("query")}
        >
          Query Status
        </button>
        <button
          className={`tab ${activeTab === "revoke" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("revoke")}
        >
          Revoke Issuer
        </button>
        <button
          className={`tab ${activeTab === "verify" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("verify")}
        >
          Verify Credential
        </button>
        <button
          className={`tab ${activeTab === "update" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("update")}
        >
          Update Metadata
        </button>
      </div>

      {/* Tab Content */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {activeTab === "add" && (
            <AddIssuerWalletForm appId={appId} network={network} adminMnemonic={adminMnemonic} />
          )}
          {activeTab === "query" && <QueryIssuerForm />}
          {activeTab === "revoke" && (
            <RevokeIssuerWalletForm appId={appId} network={network} />
          )}
          {activeTab === "verify" && <VerifyCredentialForm />}
          {activeTab === "update" && (
            <UpdateMetadataForm appId={appId} network={network} />
          )}
        </div>
      </div>
    </div>
  );
}

function AddIssuerWalletForm({
  appId,
  network,
  adminMnemonic,
}: {
  appId: string;
  network: string;
  adminMnemonic: string;
}) {
  const [newIssuerAddress, setNewIssuerAddress] = useState("");
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [website, setWebsite] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [voucherAddress, setVoucherAddress] = useState("");
  const [unsignedTxn, setUnsignedTxn] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [signedTxn, setSignedTxn] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "scan" | "paste" | "result">(
    "form"
  );
  const [validation, setValidation] = useState<{
    name: { status: 'idle' | 'validating' | 'valid' | 'invalid'; error?: string };
    url: { status: 'idle' | 'validating' | 'valid' | 'invalid'; error?: string };
  }>({ name: { status: 'idle' }, url: { status: 'idle' } });

  const validateMetadata = useCallback(
    debounce(async (nameToValidate: string, urlToValidate: string) => {
      if (!nameToValidate || !urlToValidate) {
        setValidation({ name: { status: 'idle' }, url: { status: 'idle' } });
        return;
      }

      setValidation({ 
        name: { status: 'validating' }, 
        url: { status: 'validating' } 
      });

      try {
        const formData = new FormData();
        formData.append('name', nameToValidate);
        formData.append('url', urlToValidate);
        
        const response = await fetch('/api/issuer-registry/verify-metadata', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        
        if (result.valid) {
          setValidation({ 
            name: { status: 'valid' }, 
            url: { status: 'valid' } 
          });
        } else {
          // Determine which field has the error
          const isNameError = result.error.includes('Name');
          setValidation({
            name: { 
              status: 'invalid', 
              error: isNameError ? result.error : undefined 
            },
            url: { 
              status: 'invalid', 
              error: !isNameError ? result.error : undefined 
            }
          });
        }
      } catch (error: any) {
        setValidation({
          name: { status: 'invalid', error: 'Validation failed' },
          url: { status: 'invalid', error: 'Validation failed' }
        });
      }
    }, 500),
    []
  );

  async function generateTransaction() {
    try {
      setError(null);

      // Validate app ID first
      const appIdNum = parseInt(appId);
      if (isNaN(appIdNum) || appIdNum === 0) {
        setError(
          "Issuer Registry not deployed yet. Please deploy the smart contract first and set ISSUER_REGISTRY_APP_ID in .env"
        );
        return;
      }
      
      // Trim whitespace from addresses
      const trimmedNewIssuerAddress = newIssuerAddress?.trim();
      const trimmedVoucherAddress = voucherAddress?.trim();

      if (!trimmedNewIssuerAddress || !algosdk.isValidAddress(trimmedNewIssuerAddress)) {
        setError("Invalid new issuer address");
        return;
      }

      if (!trimmedVoucherAddress || !algosdk.isValidAddress(trimmedVoucherAddress)) {
        setError("Invalid voucher address");
        return;
      }

      // Validate metadata fields
      if (!name || name.length < 3 || name.length > 64) {
        setError("Name must be between 3 and 64 characters");
        return;
      }

      if (!fullName || fullName.length < 3 || fullName.length > 128) {
        setError("Full name must be between 3 and 128 characters");
        return;
      }

      if (!website || !website.startsWith('http')) {
        setError("Website must be a valid URL starting with http");
        return;
      }

      if (!organizationType) {
        setError("Organization type is required");
        return;
      }

      if (!jurisdiction) {
        setError("Jurisdiction is required");
        return;
      }

      // Check if metadata validation passed
      if (validation.name.status !== 'valid' || validation.url.status !== 'valid') {
        setError("Please ensure name and URL are valid and unique");
        return;
      }

      // Create AlgoKit-style client
      const algodClient = new algosdk.Algodv2(
        "",
        network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443
      );

      // Create sender account for the client
      const senderAccount = algosdk.mnemonicToSecretKey(adminMnemonic);
      
      const client = new IssuerRegistryClient({
        algodClient,
        appId: appIdNum,
        sender: senderAccount,
      });

      console.log("🔍 Using AlgoKit-style client for transaction generation");
      console.log("App ID:", appIdNum);
      console.log("Sender:", trimmedVoucherAddress);
      console.log("New Issuer:", trimmedNewIssuerAddress);

      // Use the AlgoKit-style client to create the transaction
      const metadata = {
        name,
        fullName,
        website,
        organizationType,
        jurisdiction,
      };

      console.log("🔍 Using AlgoKit-style client for transaction generation");
      console.log("Metadata:", metadata);

      // Use the actual client method to create the transaction
      // Note: We're not executing the transaction, just creating it for QR code
      const atc = new algosdk.AtomicTransactionComposer();
      const suggestedParams = await algodClient.getTransactionParams().do();
      suggestedParams.flatFee = true;
      suggestedParams.fee = BigInt(2000); // Higher fee for box operations

      // Decode addresses with better error handling
      let newIssuerBytes, voucherBytes;
      try {
        newIssuerBytes = algosdk.decodeAddress(trimmedNewIssuerAddress).publicKey;
        voucherBytes = algosdk.decodeAddress(trimmedVoucherAddress).publicKey;
      } catch (decodeError: any) {
        setError(`Invalid address format: ${decodeError.message}`);
        return;
      }

      // Create the transaction using the client's approach but with manual construction
      // Encode metadata as bytes
      const nameBytes = new Uint8Array(Buffer.from(name, "utf-8"));
      const fullNameBytes = new Uint8Array(Buffer.from(fullName, "utf-8"));
      const websiteBytes = new Uint8Array(Buffer.from(website, "utf-8"));
      const orgTypeBytes = new Uint8Array(Buffer.from(organizationType, "utf-8"));
      const jurisdictionBytes = new Uint8Array(Buffer.from(jurisdiction, "utf-8"));

      // Create application call transaction using the client's pattern
      const appArgs = [
        new Uint8Array(Buffer.from("add_issuer")),
        newIssuerBytes,        // 1. issuer_address
        nameBytes,             // 2. name
        fullNameBytes,         // 3. full_name
        websiteBytes,          // 4. url
        orgTypeBytes,          // 5. organization_type
        jurisdictionBytes,     // 6. jurisdiction
      ];

      const unsignedTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: trimmedVoucherAddress,
        appIndex: appIdNum,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: appArgs,
        suggestedParams,
        boxes: [
          { appIndex: appIdNum, name: newIssuerBytes },
          { appIndex: appIdNum, name: voucherBytes },
          { appIndex: appIdNum, name: new Uint8Array([...Buffer.from("meta:"), ...newIssuerBytes]) },
        ],
      });

      console.log("🔍 Transaction created successfully using AlgoKit pattern");
      console.log("Transaction object:", unsignedTxn);
      console.log("🔍 Transaction type:", unsignedTxn.type);

      // Encode transaction
      const txnBytes = algosdk.encodeUnsignedTransaction(unsignedTxn);
      const txnBase64 = Buffer.from(txnBytes).toString("base64");
      
      console.log("🔍 Transaction bytes length:", txnBytes.length);
      console.log("🔍 Base64 length:", txnBase64.length);
      
      setUnsignedTxn(txnBase64);

      // Check if transaction is too large for QR code
      if (txnBase64.length > 2000) {
        setError(`Transaction too large for QR code (${txnBase64.length} chars). Please use the paste method instead.`);
        setStep("paste");
        return;
      }

      // Generate QR code using the proper format for application calls
      const transactionUrl = `algorand://transaction?txn=${txnBase64}`;
      
      console.log("🔍 Generated transaction URL:", transactionUrl);
      console.log("🔍 URL format: algorand://transaction?txn=...");
      
      try {
        // Try Algorand QR Code generator first
        const qr = await AlgorandQRCode(transactionUrl, {
          size: 200,
          type: 'transaction'
        });
        
        if (typeof qr === 'string' && qr.startsWith('data:image')) {
          console.log("✅ QR Code generated using Algorand QR Code Generator");
          setQrCodeUrl(qr);
        } else {
          throw new Error("Unexpected QR format from Algorand library");
        }
        
      } catch (qrError: any) {
        console.log("Falling back to generic QR code generator...");
        
        // Fallback to generic QR code
        const fallbackQr = await QRCode.toDataURL(transactionUrl, { 
          width: 200,
          errorCorrectionLevel: 'H',
          margin: 2
        });
        setQrCodeUrl(fallbackQr);
        console.log("✅ Fallback QR Code generated successfully");
      }

      setStep("scan");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function submitSignedTransaction() {
    try {
      setError(null);

      if (!signedTxn) {
        setError("Please paste the signed transaction");
        return;
      }

      // Submit to network
      const algodClient = new algosdk.Algodv2(
        "",
        network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443
      );

      const signedTxnBytes = new Uint8Array(Buffer.from(signedTxn, "base64"));
      const response = await algodClient
        .sendRawTransaction(signedTxnBytes)
        .do();
      const txId = response.txid;

      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      setResult({
        success: true,
        txId,
        newIssuerAddress,
        voucherAddress,
      });
      setStep("result");
    } catch (err: any) {
      setError(err.message);
    }
  }

  function reset() {
    setNewIssuerAddress("");
    setName("");
    setFullName("");
    setWebsite("");
    setOrganizationType("");
    setJurisdiction("");
    setVoucherAddress("");
    setUnsignedTxn(null);
    setQrCodeUrl(null);
    setSignedTxn("");
    setResult(null);
    setError(null);
    setValidation({ name: { status: 'idle' }, url: { status: 'idle' } });
    setStep("form");
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Add New Issuer (Wallet)</h2>

      {step === "form" && (
        <>
          <p className="text-sm text-gray-600 mb-6">
            Create an unsigned transaction, scan with your wallet, sign it, and
            paste the result back.
          </p>

          <div className="space-y-4">
            {/* Issuer Address */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">New Issuer Address</span>
              </label>
              <input
                type="text"
                value={newIssuerAddress}
                onChange={(e) => setNewIssuerAddress(e.target.value)}
                placeholder="ALGORAND_ADDRESS_HERE"
                className="input input-bordered w-full"
                required
              />
            </div>

            {/* Name Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Issuer Name *</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    validateMetadata(e.target.value, website);
                  }}
                  placeholder="California DMV"
                  className={`input input-bordered w-full ${
                    validation.name.status === 'invalid' ? 'input-error' : 
                    validation.name.status === 'valid' ? 'input-success' : ''
                  }`}
                  required
                />
                {validation.name.status === 'validating' && (
                  <span className="absolute right-3 top-3 loading loading-spinner loading-xs" />
                )}
                {validation.name.status === 'valid' && (
                  <span className="absolute right-3 top-3 text-success">✓</span>
                )}
              </div>
              
              {validation.name.status === 'invalid' && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {validation.name.error}
                  </span>
                </label>
              )}
            </div>

            {/* Full Name Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Full Legal Name *</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="California Department of Motor Vehicles"
                className="input input-bordered w-full"
                required
              />
            </div>

            {/* Website Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Website URL *</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    validateMetadata(name, e.target.value);
                  }}
                  placeholder="https://dmv.ca.gov"
                  className={`input input-bordered w-full ${
                    validation.url.status === 'invalid' ? 'input-error' : 
                    validation.url.status === 'valid' ? 'input-success' : ''
                  }`}
                  required
                />
                {validation.url.status === 'validating' && (
                  <span className="absolute right-3 top-3 loading loading-spinner loading-xs" />
                )}
                {validation.url.status === 'valid' && (
                  <span className="absolute right-3 top-3 text-success">✓</span>
                )}
              </div>
              
              {validation.url.status === 'invalid' && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {validation.url.error}
                  </span>
                </label>
              )}
            </div>

            {/* Organization Type */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Organization Type *</span>
              </label>
              <select
                value={organizationType}
                onChange={(e) => setOrganizationType(e.target.value)}
                className="select select-bordered w-full"
                required
              >
                <option value="">Select organization type</option>
                <option value="government">Government</option>
                <option value="corporate">Corporation</option>
                <option value="individual">Individual</option>
                <option value="nonprofit">Non-Profit</option>
                <option value="educational">Educational Institution</option>
                <option value="healthcare">Healthcare Provider</option>
                <option value="financial">Financial Institution</option>
                <option value="technology">Technology Company</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Jurisdiction */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Jurisdiction *</span>
              </label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="California, USA"
                className="input input-bordered w-full"
                required
              />
            </div>

            {/* Voucher Address */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  Your Wallet Address (Voucher)
                </span>
              </label>
              <input
                type="text"
                value={voucherAddress}
                onChange={(e) => setVoucherAddress(e.target.value)}
                placeholder="YOUR_WALLET_ADDRESS"
                className="input input-bordered w-full"
                required
              />
              <label className="label">
                <span className="label-text-alt">
                  Must be admin or an existing active issuer
                </span>
              </label>
            </div>

            <button 
              onClick={generateTransaction} 
              className="btn btn-primary"
              disabled={validation.name.status !== 'valid' || validation.url.status !== 'valid'}
            >
              Generate Transaction
            </button>
          </div>
        </>
      )}

      {step === "scan" && (
        <>
          <p className="text-sm text-gray-600 mb-6">
            Scan this QR code with Pera Wallet to sign the transaction
          </p>

          {qrCodeUrl && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={qrCodeUrl}
                width={500}
                height={500}
                alt="Transaction QR Code"
                className="border p-4 rounded"
              />

              <button
                onClick={() => setStep("paste")}
                className="btn btn-primary"
              >
                I've Signed It → Paste Result
              </button>
              <button onClick={reset} className="btn btn-ghost btn-sm">
                Start Over
              </button>
            </div>
          )}

          {unsignedTxn && (
            <div className="card bg-base-100 shadow-xl mt-6">
              <div className="card-body">
                <h2 className="card-title">🔧 Debug: Transaction Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Transaction Data (Base64)</span>
                    </label>
                    <textarea
                      value={unsignedTxn}
                      readOnly
                      className="textarea textarea-bordered w-full h-32 font-mono text-xs"
                      placeholder="Transaction data will appear here..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Transaction Type:</strong> Application Call
                    </div>
                    <div>
                      <strong>App ID:</strong> {appId}
                    </div>
                    <div>
                      <strong>Method:</strong> add_issuer
                    </div>
                    <div>
                      <strong>Size:</strong> {unsignedTxn?.length || 0} characters
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {step === "paste" && (
        <>
          <p className="text-sm text-gray-600 mb-6">
            Paste the signed transaction from your wallet
          </p>

          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Signed Transaction (Base64)</span>
              </label>
              <textarea
                value={signedTxn}
                onChange={(e) => setSignedTxn(e.target.value)}
                placeholder="Paste signed transaction here..."
                className="textarea textarea-bordered h-32"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitSignedTransaction}
                className="btn btn-primary"
              >
                Submit to Network
              </button>
              <button onClick={() => setStep("scan")} className="btn btn-ghost">
                Back to QR Code
              </button>
            </div>
          </div>
        </>
      )}

      {step === "result" && result && (
        <>
          <div className="alert alert-success mb-4">
            <div>
              <h3 className="font-bold">✓ Issuer Added Successfully!</h3>
              <p className="text-sm mt-2">Transaction ID: {result.txId}</p>
              <p className="text-sm">New Issuer: {result.newIssuerAddress}</p>
              <p className="text-sm">Vouched by: {result.voucherAddress}</p>
            </div>
          </div>

          <button onClick={reset} className="btn btn-primary">
            Add Another Issuer
          </button>
        </>
      )}

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function RevokeIssuerWalletForm({
  appId,
  network,
}: {
  appId: string;
  network: string;
}) {
  const [issuerAddress, setIssuerAddress] = useState("");
  const [adminAddress, setAdminAddress] = useState("");
  const [revokeAll, setRevokeAll] = useState(false);
  const [unsignedTxn, setUnsignedTxn] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [signedTxn, setSignedTxn] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "scan" | "paste" | "result">(
    "form"
  );

  async function generateTransaction() {
    try {
      setError(null);

      // Validate app ID first
      const appIdNum = parseInt(appId);
      if (isNaN(appIdNum) || appIdNum === 0) {
        setError(
          "Issuer Registry not deployed yet. Please deploy the smart contract first and set ISSUER_REGISTRY_APP_ID in .env"
        );
        return;
      }

      if (!issuerAddress || !algosdk.isValidAddress(issuerAddress)) {
        setError("Invalid issuer address");
        return;
      }

      if (!adminAddress || !algosdk.isValidAddress(adminAddress)) {
        setError("Invalid admin address");
        return;
      }

      const algodClient = new algosdk.Algodv2(
        "",
        network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443
      );

      const params = await algodClient.getTransactionParams().do();
      const issuerBytes = algosdk.decodeAddress(issuerAddress).publicKey;

      const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: adminAddress,
        appIndex: appIdNum,
        appArgs: [
          new Uint8Array(Buffer.from("revoke_issuer")),
          issuerBytes,
          algosdk.encodeUint64(revokeAll ? 1 : 0),
        ],
        suggestedParams: params,
        boxes: [{ appIndex: appIdNum, name: issuerBytes }],
      });

      const txnBase64 = Buffer.from(txn.toByte()).toString("base64");
      setUnsignedTxn(txnBase64);

      const peraUrl = `algorand://transaction?txn=${encodeURIComponent(txnBase64)}`;
      const qr = await QRCode.toDataURL(peraUrl, { width: 300 });
      setQrCodeUrl(qr);

      setStep("scan");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function submitSignedTransaction() {
    try {
      setError(null);

      if (!signedTxn) {
        setError("Please paste the signed transaction");
        return;
      }

      const algodClient = new algosdk.Algodv2(
        "",
        network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443
      );

      const signedTxnBytes = new Uint8Array(Buffer.from(signedTxn, "base64"));
      const response = await algodClient
        .sendRawTransaction(signedTxnBytes)
        .do();
      const txId = response.txid;

      await algosdk.waitForConfirmation(algodClient, txId, 4);

      setResult({
        success: true,
        txId,
        issuerAddress,
        revokeAll,
      });
      setStep("result");
    } catch (err: any) {
      setError(err.message);
    }
  }

  function reset() {
    setIssuerAddress("");
    setAdminAddress("");
    setRevokeAll(false);
    setUnsignedTxn(null);
    setQrCodeUrl(null);
    setSignedTxn("");
    setResult(null);
    setError(null);
    setStep("form");
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Revoke Issuer (Wallet)</h2>

      {step === "form" && (
        <>
          <p className="text-sm text-gray-600 mb-6">
            Generate a revocation transaction and sign it with your admin wallet
          </p>

          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Issuer to Revoke</span>
              </label>
              <input
                type="text"
                value={issuerAddress}
                onChange={(e) => setIssuerAddress(e.target.value)}
                placeholder="ISSUER_ADDRESS_HERE"
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Admin Wallet Address</span>
              </label>
              <input
                type="text"
                value={adminAddress}
                onChange={(e) => setAdminAddress(e.target.value)}
                placeholder="YOUR_ADMIN_ADDRESS"
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-warning"
                  checked={revokeAll}
                  onChange={(e) => setRevokeAll(e.target.checked)}
                />
                <div>
                  <span className="label-text font-semibold">
                    Invalidate all prior credentials (nuclear option)
                  </span>
                  {revokeAll && (
                    <p className="text-xs text-warning mt-1">
                      ⚠️ This will invalidate ALL credentials ever issued by
                      this issuer!
                    </p>
                  )}
                </div>
              </label>
            </div>

            <button onClick={generateTransaction} className="btn btn-error">
              Generate Revocation Transaction
            </button>
          </div>
        </>
      )}

      {step === "scan" && qrCodeUrl && (
        <>
          <div className="flex flex-col items-center gap-4">
            <img
              src={qrCodeUrl}
              alt="Revocation QR Code"
              className="border p-4 rounded"
            />
            <button
              onClick={() => setStep("paste")}
              className="btn btn-primary"
            >
              I've Signed It → Paste Result
            </button>
            <button onClick={reset} className="btn btn-ghost btn-sm">
              Start Over
            </button>
          </div>
        </>
      )}

      {step === "paste" && (
        <>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Signed Transaction (Base64)</span>
              </label>
              <textarea
                value={signedTxn}
                onChange={(e) => setSignedTxn(e.target.value)}
                placeholder="Paste signed transaction here..."
                className="textarea textarea-bordered h-32"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitSignedTransaction}
                className="btn btn-error"
              >
                Submit Revocation
              </button>
              <button onClick={() => setStep("scan")} className="btn btn-ghost">
                Back
              </button>
            </div>
          </div>
        </>
      )}

      {step === "result" && result && (
        <>
          <div className="alert alert-success mb-4">
            <div>
              <h3 className="font-bold">✓ Issuer Revoked Successfully!</h3>
              <p className="text-sm mt-2">Transaction ID: {result.txId}</p>
              <p className="text-sm">Revoked Issuer: {result.issuerAddress}</p>
              {result.revokeAll && (
                <p className="text-sm text-warning">
                  All credentials invalidated
                </p>
              )}
            </div>
          </div>

          <button onClick={reset} className="btn btn-primary">
            Revoke Another Issuer
          </button>
        </>
      )}

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// Reuse QueryIssuerForm and VerifyCredentialForm from original (read-only operations)
function QueryIssuerForm() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleQuery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const address = formData.get("address") as string;

    try {
      const response = await fetch(`/api/issuer-registry/status/${address}`);
      const data = await response.json();

      if (response.ok) {
        setResult(data.issuer);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Query Issuer Status</h2>
      <p className="text-sm text-gray-600 mb-6">
        Check if an address is an authorized issuer (read-only, no wallet
        needed)
      </p>

      <form onSubmit={handleQuery} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Issuer Address</span>
          </label>
          <input
            type="text"
            name="address"
            placeholder="ALGORAND_ADDRESS_HERE"
            className="input input-bordered w-full"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Querying..." : "Query Status"}
        </button>
      </form>

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 bg-base-200 rounded-lg">
          <h3 className="font-bold text-lg mb-4">Issuer Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Address:</span>
              <span className="font-mono text-sm">{result.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Status:</span>
              <span
                className={`badge ${result.isActive ? "badge-success" : "badge-error"}`}
              >
                {result.isActive ? "Active" : "Revoked"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Authorized At:</span>
              <span>
                {new Date(result.authorizedAt * 1000).toLocaleString()}
              </span>
            </div>
            {result.revokedAt && (
              <div className="flex justify-between">
                <span className="font-semibold">Revoked At:</span>
                <span>
                  {new Date(result.revokedAt * 1000).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-semibold">Vouched By:</span>
              <span className="font-mono text-sm">{result.vouchedBy}</span>
            </div>
            {result.revokeAllPrior && (
              <div className="alert alert-warning mt-2">
                <span>
                  ⚠️ All credentials from this issuer have been invalidated
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VerifyCredentialForm() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/issuer-registry/verify-credential", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Verify Credential</h2>
      <p className="text-sm text-gray-600 mb-6">
        Check credential validity (read-only, no wallet needed)
      </p>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Credential ID</span>
          </label>
          <input
            type="text"
            name="credentialId"
            placeholder="urn:uuid:12345..."
            className="input input-bordered w-full"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Issuer Address</span>
          </label>
          <input
            type="text"
            name="issuerAddress"
            placeholder="ALGORAND_ADDRESS_HERE"
            className="input input-bordered w-full"
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Issuance Date</span>
          </label>
          <input
            type="datetime-local"
            name="issuanceDate"
            className="input input-bordered w-full"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Verifying..." : "Verify Credential"}
        </button>
      </form>

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div
            className={`alert ${result.valid ? "alert-success" : "alert-error"}`}
          >
            <div>
              <h3 className="font-bold text-lg">
                {result.valid ? "✓ Valid Credential" : "✗ Invalid Credential"}
              </h3>
              {result.reason && (
                <p className="text-sm mt-2">Reason: {result.reason}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateMetadataForm({
  appId,
  network,
}: {
  appId: string;
  network: string;
}) {
  const [issuerAddress, setIssuerAddress] = useState("");
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [website, setWebsite] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<{
    name: { status: 'idle' | 'validating' | 'valid' | 'invalid'; error?: string };
    url: { status: 'idle' | 'validating' | 'valid' | 'invalid'; error?: string };
  }>({ name: { status: 'idle' }, url: { status: 'idle' } });

  const validateMetadata = useCallback(
    debounce(async (nameToValidate: string, urlToValidate: string) => {
      if (!nameToValidate || !urlToValidate) {
        setValidation({ name: { status: 'idle' }, url: { status: 'idle' } });
        return;
      }

      setValidation({ 
        name: { status: 'validating' }, 
        url: { status: 'validating' } 
      });

      try {
        const formData = new FormData();
        formData.append('name', nameToValidate);
        formData.append('url', urlToValidate);
        formData.append('excludeAddress', issuerAddress); // Exclude current issuer when updating
        
        const response = await fetch('/api/issuer-registry/verify-metadata', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        
        if (result.valid) {
          setValidation({ 
            name: { status: 'valid' }, 
            url: { status: 'valid' } 
          });
        } else {
          const isNameError = result.error.includes('Name');
          setValidation({
            name: { 
              status: 'invalid', 
              error: isNameError ? result.error : undefined 
            },
            url: { 
              status: 'invalid', 
              error: !isNameError ? result.error : undefined 
            }
          });
        }
      } catch (error: any) {
        setValidation({
          name: { status: 'invalid', error: 'Validation failed' },
          url: { status: 'invalid', error: 'Validation failed' }
        });
      }
    }, 500),
    [issuerAddress]
  );

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('issuerAddress', issuerAddress);
      formData.append('name', name);
      formData.append('fullName', fullName);
      formData.append('website', website);
      formData.append('organizationType', organizationType);
      formData.append('jurisdiction', jurisdiction);

      const response = await fetch('/api/issuer-registry/update-metadata', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Update Issuer Metadata</h2>
      <p className="text-sm text-gray-600 mb-6">
        Update metadata for an existing issuer (admin only)
      </p>

      <form onSubmit={handleUpdate} className="space-y-4">
        {/* Issuer Address */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Issuer Address</span>
          </label>
          <input
            type="text"
            value={issuerAddress}
            onChange={(e) => setIssuerAddress(e.target.value)}
            placeholder="ALGORAND_ADDRESS_HERE"
            className="input input-bordered w-full"
            required
          />
        </div>

        {/* Name Field */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Issuer Name *</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                validateMetadata(e.target.value, website);
              }}
              placeholder="California DMV"
              className={`input input-bordered w-full ${
                validation.name.status === 'invalid' ? 'input-error' : 
                validation.name.status === 'valid' ? 'input-success' : ''
              }`}
              required
            />
            {validation.name.status === 'validating' && (
              <span className="absolute right-3 top-3 loading loading-spinner loading-xs" />
            )}
            {validation.name.status === 'valid' && (
              <span className="absolute right-3 top-3 text-success">✓</span>
            )}
          </div>
          
          {validation.name.status === 'invalid' && (
            <label className="label">
              <span className="label-text-alt text-error">
                {validation.name.error}
              </span>
            </label>
          )}
        </div>

        {/* Full Name Field */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Full Legal Name *</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="California Department of Motor Vehicles"
            className="input input-bordered w-full"
            required
          />
        </div>

        {/* Website Field */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Website URL *</span>
          </label>
          <div className="relative">
            <input
              type="url"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
                validateMetadata(name, e.target.value);
              }}
              placeholder="https://dmv.ca.gov"
              className={`input input-bordered w-full ${
                validation.url.status === 'invalid' ? 'input-error' : 
                validation.url.status === 'valid' ? 'input-success' : ''
              }`}
              required
            />
            {validation.url.status === 'validating' && (
              <span className="absolute right-3 top-3 loading loading-spinner loading-xs" />
            )}
            {validation.url.status === 'valid' && (
              <span className="absolute right-3 top-3 text-success">✓</span>
            )}
          </div>
          
          {validation.url.status === 'invalid' && (
            <label className="label">
              <span className="label-text-alt text-error">
                {validation.url.error}
              </span>
            </label>
          )}
        </div>

        {/* Organization Type */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Organization Type *</span>
          </label>
          <select
            value={organizationType}
            onChange={(e) => setOrganizationType(e.target.value)}
            className="select select-bordered w-full"
            required
          >
            <option value="">Select organization type</option>
            <option value="government">Government</option>
            <option value="corporate">Corporation</option>
            <option value="individual">Individual</option>
            <option value="nonprofit">Non-Profit</option>
            <option value="educational">Educational Institution</option>
            <option value="healthcare">Healthcare Provider</option>
            <option value="financial">Financial Institution</option>
            <option value="technology">Technology Company</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Jurisdiction */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Jurisdiction *</span>
          </label>
          <input
            type="text"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="California, USA"
            className="input input-bordered w-full"
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary w-full"
          disabled={loading || validation.name.status !== 'valid' || validation.url.status !== 'valid'}
        >
          {loading ? "Updating..." : "Update Metadata"}
        </button>
      </form>

      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="alert alert-success">
            <div>
              <h3 className="font-bold">✓ Metadata Updated Successfully!</h3>
              <p className="text-sm mt-2">Transaction ID: {result.txId}</p>
              <p className="text-sm">Issuer: {result.issuerAddress}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
