import type { Account, uint64 } from '@algorandfoundation/algorand-typescript'
import { BoxMap, Contract, Global, GlobalState, Txn, arc4, assert } from '@algorandfoundation/algorand-typescript'

/**
 * IssuerInfo stores metadata about an authorized issuer
 */
class IssuerInfo extends arc4.Struct<{
  isActive: arc4.Bool
  name: arc4.Str
  url: arc4.Str
  addedAt: arc4.UintN64
}> {}

/**
 * CardlessIssuer - On-chain registry of authorized issuers for Cardless ID credentials
 */
export class CardlessIssuer extends Contract {
  // Application name (will be visible in blockchain explorers)
  name = GlobalState<arc4.Str>()

  // Admin who can manage issuers
  admin = GlobalState<Account>()

  // Total count of issuers (for reference)
  issuerCount = GlobalState<uint64>({ initialValue: 0 })

  /**
   * Initialize the contract with the admin address
   */
  createApplication(): void {
    this.name.value = new arc4.Str('Cardless ID Issuer Registry')
    this.admin.value = Txn.sender
  }

  /**
   * Add an authorized issuer to the registry
   * @param issuerAddress - Address of the issuer to add
   * @param name - Name/description of the issuer
   */
  addIssuer(issuerAddress: Account, name: string, url: string): void {
    // Only admin can add issuers
    assert(Txn.sender === this.admin.value, 'Only admin can add issuers')

    // Check if issuer already exists
    assert(!this.issuers(issuerAddress).exists, 'Issuer already exists')

    // Create new issuer info and store in box storage
    this.issuers(issuerAddress).value = new IssuerInfo({
      isActive: new arc4.Bool(true),
      name: new arc4.Str(name),
      url: new arc4.Str(url),
      addedAt: new arc4.UintN64(Global.latestTimestamp),
    }).copy()

    // Increment count
    this.issuerCount.value = this.issuerCount.value + 1
  }

  /**
   * Remove an issuer from the registry
   * @param issuerAddress - Address of the issuer to remove
   */
  removeIssuer(issuerAddress: Account): void {
    // Only admin can remove issuers
    assert(Txn.sender === this.admin.value, 'Only admin can remove issuers')

    // Check if issuer exists
    assert(this.issuers(issuerAddress).exists, 'Issuer does not exist')

    // Mark as inactive instead of deleting (for audit trail)
    const issuerInfo = this.issuers(issuerAddress).value.copy()
    issuerInfo.isActive = new arc4.Bool(false)
    this.issuers(issuerAddress).value = issuerInfo.copy()

    // Decrement count
    this.issuerCount.value = this.issuerCount.value - 1
  }

  /**
   * Check if an address is an authorized and active issuer
   * @param issuerAddress - Address to check
   * @returns true if the address is an active authorized issuer
   */
  isAuthorized(issuerAddress: Account): boolean {
    if (!this.issuers(issuerAddress).exists) {
      return false
    }
    return this.issuers(issuerAddress).value.isActive.native
  }

  /**
   * Get information about an issuer
   * @param issuerAddress - Address of the issuer
   * @returns Issuer information (name, active status, timestamp)
   */
  getIssuerInfo(issuerAddress: Account): IssuerInfo {
    assert(this.issuers(issuerAddress).exists, 'Issuer not found')
    return this.issuers(issuerAddress).value
  }

  /**
   * Transfer admin rights to a new address
   * @param newAdmin - Address of the new admin
   */
  transferAdmin(newAdmin: Account): void {
    assert(Txn.sender === this.admin.value, 'Only admin can transfer admin rights')
    this.admin.value = newAdmin
  }

  /**
   * Box storage for issuer registry (Account -> IssuerInfo)
   */
  issuers = BoxMap<Account, IssuerInfo>({ keyPrefix: 'i' })
}
