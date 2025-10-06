/**
 * AlgoKit-style TypeScript Client for Issuer Registry Smart Contract
 * Compatible with existing PyTeal contract
 */

import algosdk, { Algodv2, AtomicTransactionComposer, Account } from "algosdk";

export interface IssuerMetadata {
  name: string;
  fullName: string;
  website: string;
  organizationType: string;
  jurisdiction: string;
}

export interface IssuerStatus {
  authorizedAt: number;
  revokedAt: number;
  revokeAllPrior: boolean;
  vouchedBy: string;
}

export class IssuerRegistryClient {
  private algodClient: Algodv2;
  private appId: number;
  private sender: Account;

  constructor(config: {
    algodClient: Algodv2;
    appId: number;
    sender: Account;
  }) {
    this.algodClient = config.algodClient;
    this.appId = config.appId;
    this.sender = config.sender;
  }

  /**
   * Add a new issuer to the registry
   */
  public async addIssuer(
    issuerAddress: string,
    metadata: IssuerMetadata
  ): Promise<string> {
    const atc = new AtomicTransactionComposer();
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    suggestedParams.flatFee = true;
    suggestedParams.fee = 2000; // Higher fee for box operations

    const newIssuerBytes = algosdk.decodeAddress(issuerAddress).publicKey;
    const senderBytes = algosdk.decodeAddress(this.sender.addr).publicKey;

    atc.addMethodCall({
      appID: this.appId,
      method: {
        name: "add_issuer",
        selector: algosdk.getMethodByName("add_issuer").getSelector(),
      },
      sender: this.sender.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(this.sender),
      methodArgs: [
        issuerAddress,
        metadata.name,
        metadata.fullName,
        metadata.website,
        metadata.organizationType,
        metadata.jurisdiction,
      ],
      boxes: [
        { appIndex: this.appId, name: newIssuerBytes },
        { appIndex: this.appId, name: senderBytes },
        { appIndex: this.appId, name: new Uint8Array([...Buffer.from("meta:"), ...newIssuerBytes]) },
      ],
    });

    const result = await atc.execute(this.algodClient, 4);
    return result.txIDs[0];
  }

  /**
   * Revoke an issuer's authorization
   */
  public async revokeIssuer(issuerAddress: string): Promise<string> {
    const atc = new AtomicTransactionComposer();
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    suggestedParams.flatFee = true;
    suggestedParams.fee = 2000;

    atc.addMethodCall({
      appID: this.appId,
      method: {
        name: "revoke_issuer",
        selector: algosdk.getMethodByName("revoke_issuer").getSelector(),
      },
      sender: this.sender.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(this.sender),
      methodArgs: [issuerAddress],
      boxes: [
        { appIndex: this.appId, name: algosdk.decodeAddress(issuerAddress).publicKey },
      ],
    });

    const result = await atc.execute(this.algodClient, 4);
    return result.txIDs[0];
  }

  /**
   * Reinstate a previously revoked issuer
   */
  public async reinstateIssuer(issuerAddress: string): Promise<string> {
    const atc = new AtomicTransactionComposer();
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    suggestedParams.flatFee = true;
    suggestedParams.fee = 2000;

    atc.addMethodCall({
      appID: this.appId,
      method: {
        name: "reinstate_issuer",
        selector: algosdk.getMethodByName("reinstate_issuer").getSelector(),
      },
      sender: this.sender.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(this.sender),
      methodArgs: [issuerAddress],
      boxes: [
        { appIndex: this.appId, name: algosdk.decodeAddress(issuerAddress).publicKey },
      ],
    });

    const result = await atc.execute(this.algodClient, 4);
    return result.txIDs[0];
  }

  /**
   * Revoke a specific credential
   */
  public async revokeCredential(
    credentialId: string,
    issuerAddress: string
  ): Promise<string> {
    const atc = new AtomicTransactionComposer();
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    suggestedParams.flatFee = true;
    suggestedParams.fee = 2000;

    atc.addMethodCall({
      appID: this.appId,
      method: {
        name: "revoke_credential",
        selector: algosdk.getMethodByName("revoke_credential").getSelector(),
      },
      sender: this.sender.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(this.sender),
      methodArgs: [credentialId, issuerAddress],
      boxes: [
        { appIndex: this.appId, name: new Uint8Array([...Buffer.from("cred:"), ...Buffer.from(credentialId)]) },
      ],
    });

    const result = await atc.execute(this.algodClient, 4);
    return result.txIDs[0];
  }

  /**
   * Query issuer status
   */
  public async queryIssuer(issuerAddress: string): Promise<IssuerStatus | null> {
    const atc = new AtomicTransactionComposer();
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    suggestedParams.flatFee = true;
    suggestedParams.fee = 2000;

    atc.addMethodCall({
      appID: this.appId,
      method: {
        name: "query_issuer",
        selector: algosdk.getMethodByName("query_issuer").getSelector(),
      },
      sender: this.sender.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(this.sender),
      methodArgs: [issuerAddress],
      boxes: [
        { appIndex: this.appId, name: algosdk.decodeAddress(issuerAddress).publicKey },
      ],
    });

    const result = await atc.execute(this.algodClient, 4);
    
    // Parse the result from the transaction
    const txInfo = await this.algodClient.pendingTransactionInformation(result.txIDs[0]).do();
    if (txInfo.logs && txInfo.logs.length > 0) {
      const logData = Buffer.from(txInfo.logs[0], 'base64');
      // Parse the log data to extract issuer status
      // This is a simplified parser - in practice you'd need more robust parsing
      return {
        authorizedAt: logData.readUInt32BE(0),
        revokedAt: logData.readUInt32BE(8),
        revokeAllPrior: logData.readUInt32BE(16) !== 0,
        vouchedBy: algosdk.encodeAddress(logData.slice(24, 56)),
      };
    }
    
    return null;
  }

  /**
   * Query credential status
   */
  public async queryCredential(credentialId: string): Promise<any> {
    const atc = new AtomicTransactionComposer();
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    suggestedParams.flatFee = true;
    suggestedParams.fee = 2000;

    atc.addMethodCall({
      appID: this.appId,
      method: {
        name: "query_credential",
        selector: algosdk.getMethodByName("query_credential").getSelector(),
      },
      sender: this.sender.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(this.sender),
      methodArgs: [credentialId],
      boxes: [
        { appIndex: this.appId, name: new Uint8Array([...Buffer.from("cred:"), ...Buffer.from(credentialId)]) },
      ],
    });

    const result = await atc.execute(this.algodClient, 4);
    return result;
  }

  /**
   * Update issuer metadata
   */
  public async updateMetadata(
    issuerAddress: string,
    metadata: IssuerMetadata
  ): Promise<string> {
    const atc = new AtomicTransactionComposer();
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    suggestedParams.flatFee = true;
    suggestedParams.fee = 2000;

    const newIssuerBytes = algosdk.decodeAddress(issuerAddress).publicKey;

    atc.addMethodCall({
      appID: this.appId,
      method: {
        name: "update_metadata",
        selector: algosdk.getMethodByName("update_metadata").getSelector(),
      },
      sender: this.sender.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(this.sender),
      methodArgs: [
        issuerAddress,
        metadata.name,
        metadata.fullName,
        metadata.website,
        metadata.organizationType,
        metadata.jurisdiction,
      ],
      boxes: [
        { appIndex: this.appId, name: new Uint8Array([...Buffer.from("meta:"), ...newIssuerBytes]) },
      ],
    });

    const result = await atc.execute(this.algodClient, 4);
    return result.txIDs[0];
  }

  /**
   * Query issuer metadata
   */
  public async queryMetadata(issuerAddress: string): Promise<IssuerMetadata | null> {
    const atc = new AtomicTransactionComposer();
    const suggestedParams = await this.algodClient.getTransactionParams().do();
    suggestedParams.flatFee = true;
    suggestedParams.fee = 2000;

    atc.addMethodCall({
      appID: this.appId,
      method: {
        name: "query_metadata",
        selector: algosdk.getMethodByName("query_metadata").getSelector(),
      },
      sender: this.sender.addr,
      suggestedParams,
      signer: algosdk.makeBasicAccountTransactionSigner(this.sender),
      methodArgs: [issuerAddress],
      boxes: [
        { appIndex: this.appId, name: new Uint8Array([...Buffer.from("meta:"), ...algosdk.decodeAddress(issuerAddress).publicKey]) },
      ],
    });

    const result = await atc.execute(this.algodClient, 4);
    
    // Parse the result from the transaction
    const txInfo = await this.algodClient.pendingTransactionInformation(result.txIDs[0]).do();
    if (txInfo.logs && txInfo.logs.length > 0) {
      const logData = Buffer.from(txInfo.logs[0], 'base64');
      // Parse the log data to extract metadata
      // This is a simplified parser - in practice you'd need more robust parsing
      const offset = 8; // Skip timestamp
      const nameLength = logData.readUInt32BE(offset);
      const name = logData.slice(offset + 4, offset + 4 + nameLength).toString('utf-8');
      
      return {
        name,
        fullName: name, // Simplified for now
        website: "",
        organizationType: "",
        jurisdiction: "",
      };
    }
    
    return null;
  }
}
