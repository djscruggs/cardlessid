from algopy import ARC4Contract, String, Account, GlobalState, UInt64
from algopy.arc4 import abimethod


class IssuerRegistry(ARC4Contract):
    """
    Smart contract for managing authorized credential issuers
    
    Global State:
    - admin: Address of contract administrator
    - issuer_count: Total number of issuers ever added
    
    Box Storage (per issuer):
    - Key: issuer_address
    - Value: [authorized_at, revoked_at, revoke_all_prior_flag, vouched_by]
    
    Box Storage (per issuer metadata):
    - Key: "meta:" + issuer_address
    - Value: [updated_at, name, full_name, website_url, organization_type, jurisdiction]
    
    Box Storage (per credential):
    - Key: credential_id (hash)
    - Value: [revoked_at, issuer_address]
    """

    admin = GlobalState(Account)
    issuer_count = GlobalState(UInt64)

    @abimethod
    def bootstrap(self, admin: Account) -> None:
        """Initialize the contract with admin address"""
        self.admin.value = admin
        self.issuer_count.value = UInt64(0)

    @abimethod
    def add_issuer(
        self,
        issuer_address: Account,
        name: String,
        full_name: String,
        website_url: String,
        organization_type: String,
        jurisdiction: String
    ) -> String:
        """Add a new authorized issuer to the registry (admin only)"""
        # For now, return success message - full implementation would use boxes
        return String("Added issuer: ") + name + String(" (") + issuer_address + String(")")

    @abimethod
    def revoke_issuer(self, issuer_address: Account) -> String:
        """Revoke authorization for an issuer (admin only)"""
        return String("Revoked issuer: ") + issuer_address

    @abimethod
    def reinstate_issuer(self, issuer_address: Account) -> String:
        """Reinstate a previously revoked issuer (admin only)"""
        return String("Reinstated issuer: ") + issuer_address

    @abimethod
    def revoke_credential(self, credential_id: String, issuer_address: Account) -> String:
        """Revoke a specific credential (admin only)"""
        return String("Revoked credential: ") + credential_id + String(" from issuer: ") + issuer_address

    @abimethod
    def query_issuer(self, issuer_address: Account) -> String:
        """Query the status of an issuer"""
        return String("Issuer status for: ") + issuer_address

    @abimethod
    def query_credential(self, credential_id: String) -> String:
        """Query the status of a credential"""
        return String("Credential status for: ") + credential_id

    @abimethod
    def update_metadata(
        self,
        issuer_address: Account,
        name: String,
        full_name: String,
        website_url: String,
        organization_type: String,
        jurisdiction: String
    ) -> String:
        """Update issuer metadata (admin only)"""
        return String("Updated metadata for: ") + name + String(" (") + issuer_address + String(")")

    @abimethod
    def query_metadata(self, issuer_address: Account) -> String:
        """Query issuer metadata"""
        return String("Metadata for issuer: ") + issuer_address

    @abimethod
    def get_stats(self) -> String:
        """Get registry statistics"""
        return String("Total issuers: ") + self.issuer_count.value + String(", Admin: ") + self.admin.value
