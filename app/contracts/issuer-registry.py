"""
Algorand Smart Contract for Issuer Registry
Manages authorized credential issuers with temporal revocation support

Features:
- Add/remove authorized issuers (requires vouching from existing issuer)
- Temporal tracking (when authorized, when revoked)
- Credential-level revocation
- Query issuer status at any point in time
- Revoke all credentials from an issuer (nuclear option)
"""

from pyteal import *

# ABI Method definitions for AlgoKit compatibility
ABI_METHODS = {
    "add_issuer": {
        "name": "add_issuer",
        "args": [
            {"name": "issuer_address", "type": "bytes"},
            {"name": "name", "type": "bytes"},
            {"name": "full_name", "type": "bytes"},
            {"name": "website_url", "type": "bytes"},
            {"name": "organization_type", "type": "bytes"},
            {"name": "jurisdiction", "type": "bytes"}
        ],
        "returns": {"type": "void"}
    },
    "revoke_issuer": {
        "name": "revoke_issuer",
        "args": [
            {"name": "issuer_address", "type": "bytes"}
        ],
        "returns": {"type": "void"}
    },
    "reinstate_issuer": {
        "name": "reinstate_issuer",
        "args": [
            {"name": "issuer_address", "type": "bytes"}
        ],
        "returns": {"type": "void"}
    },
    "revoke_credential": {
        "name": "revoke_credential",
        "args": [
            {"name": "credential_id", "type": "bytes"},
            {"name": "issuer_address", "type": "bytes"}
        ],
        "returns": {"type": "void"}
    },
    "query_issuer": {
        "name": "query_issuer",
        "args": [
            {"name": "issuer_address", "type": "bytes"}
        ],
        "returns": {"type": "bytes"}
    },
    "query_credential": {
        "name": "query_credential",
        "args": [
            {"name": "credential_id", "type": "bytes"}
        ],
        "returns": {"type": "bytes"}
    },
    "update_metadata": {
        "name": "update_metadata",
        "args": [
            {"name": "issuer_address", "type": "bytes"},
            {"name": "name", "type": "bytes"},
            {"name": "full_name", "type": "bytes"},
            {"name": "website_url", "type": "bytes"},
            {"name": "organization_type", "type": "bytes"},
            {"name": "jurisdiction", "type": "bytes"}
        ],
        "returns": {"type": "void"}
    },
    "query_metadata": {
        "name": "query_metadata",
        "args": [
            {"name": "issuer_address", "type": "bytes"}
        ],
        "returns": {"type": "bytes"}
    }
}


def issuer_registry():
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

    # Admin authorization check
    is_admin = Txn.sender() == App.globalGet(Bytes("admin"))

    # Application calls
    @Subroutine(TealType.uint64)
    def on_create():
        return Seq([
            App.globalPut(Bytes("admin"), Txn.sender()),
            App.globalPut(Bytes("issuer_count"), Int(0)),
            # Note: Admin issuer will be added in first add_issuer call
            # Box creation requires app account to have MBR funding first
            Approve()
        ])

    # Check if sender is an active issuer
    @Subroutine(TealType.uint64)
    def is_active_issuer(address):
        box_key = address

        return Seq([
            (issuer_data := App.box_get(box_key)),
            If(
                issuer_data.hasValue(),
                # Check if not revoked (revoked_at == 0)
                Btoi(Extract(issuer_data.value(), Int(8), Int(8))) == Int(0),
                Int(0)
            )
        ])

    # Validate name format
    @Subroutine(TealType.uint64)
    def validate_name():
        name = Txn.application_args[2]  # name argument
        name_length = Len(name)
        
        # Name must be between 3 and 64 characters
        return And(
            name_length >= Int(3),
            name_length <= Int(64)
        )

    # Validate URL format
    @Subroutine(TealType.uint64)
    def validate_url():
        url = Txn.application_args[4]  # URL argument
        
        # Basic URL validation (starts with http:// or https://)
        url_starts_http = Or(
            Substring(url, Int(0), Int(7)) == Bytes("http://"),
            Substring(url, Int(0), Int(8)) == Bytes("https://")
        )
        
        # Check URL length (reasonable limit)
        url_length_valid = And(
            Len(url) >= Int(10),  # Minimum reasonable URL length
            Len(url) <= Int(256)  # Maximum URL length
        )
        
        # Basic URL validation (format and length)
        return And(url_starts_http, url_length_valid)

    # Add authorized issuer (requires vouching from active issuer)
    @Subroutine(TealType.uint64)
    def add_issuer():
        issuer_address = Txn.application_args[1]
        name = Txn.application_args[2]
        full_name = Txn.application_args[3]
        url = Txn.application_args[4]
        organization_type = Txn.application_args[5]
        jurisdiction = Txn.application_args[6]
        current_time = Global.latest_timestamp()

        # Box key is the issuer address
        box_key = issuer_address

        # Box value: [authorized_at (8), revoked_at (8), revoke_all_flag (8), vouched_by (32)]
        # revoked_at = 0 means not revoked
        box_value = Concat(
            Itob(current_time),  # authorized_at
            Itob(Int(0)),         # revoked_at (0 = not revoked)
            Itob(Int(0)),         # revoke_all_prior (0 = false)
            Txn.sender()          # vouched_by (the current issuer vouching)
        )

        # Metadata box key
        meta_box_key = Concat(Bytes("meta:"), issuer_address)
        
        # Metadata value: [updated_at (8), name, full_name, url, org_type, jurisdiction]
        meta_box_value = Concat(
            Itob(current_time),  # updated_at
            name,                # name
            full_name,           # full_name
            url,                 # website_url
            organization_type,   # organization_type
            jurisdiction         # jurisdiction
        )

        return Seq([
            # Validate metadata format
            Assert(validate_name()),
            Assert(validate_url()),
            
            # Must be either admin OR an active issuer
            Assert(
                Or(
                    is_admin,
                    is_active_issuer(Txn.sender())
                )
            ),
            # Verify the new issuer doesn't already exist
            (existing := App.box_get(box_key)),
            Assert(Not(existing.hasValue())),
            # Add the new issuer
            App.box_put(box_key, box_value),
            # Add metadata
            App.box_put(meta_box_key, meta_box_value),
            App.globalPut(
                Bytes("issuer_count"),
                App.globalGet(Bytes("issuer_count")) + Int(1)
            ),
            Approve()
        ])

    # Revoke issuer
    @Subroutine(TealType.uint64)
    def revoke_issuer():
        issuer_address = Txn.application_args[1]
        revoke_all_prior = Btoi(Txn.application_args[2])  # 0 or 1
        current_time = Global.latest_timestamp()

        box_key = issuer_address

        return Seq([
            Assert(is_admin),
            (existing_value := App.box_get(box_key)),
            Assert(existing_value.hasValue()),
            # Create updated value with revocation (preserving vouched_by)
            App.box_put(box_key, Concat(
                Extract(existing_value.value(), Int(0), Int(8)),  # authorized_at
                Itob(current_time),        # revoked_at
                Itob(revoke_all_prior),    # revoke_all_prior flag
                Extract(existing_value.value(), Int(24), Int(32))  # vouched_by
            )),
            Approve()
        ])

    # Reinstate issuer (remove revocation)
    @Subroutine(TealType.uint64)
    def reinstate_issuer():
        issuer_address = Txn.application_args[1]
        current_time = Global.latest_timestamp()

        box_key = issuer_address

        return Seq([
            Assert(is_admin),
            (existing_value := App.box_get(box_key)),
            Assert(existing_value.hasValue()),
            # Reset: set new authorized_at to now, clear revoked_at and flag
            App.box_put(box_key, Concat(
                Itob(current_time),  # new authorized_at
                Itob(Int(0)),        # revoked_at = 0 (not revoked)
                Itob(Int(0)),        # revoke_all_prior = 0
                Extract(existing_value.value(), Int(24), Int(32))  # vouched_by
            )),
            Approve()
        ])

    # Revoke specific credential
    @Subroutine(TealType.uint64)
    def revoke_credential():
        credential_id = Txn.application_args[1]
        issuer_address = Txn.application_args[2]
        current_time = Global.latest_timestamp()

        # Box key for credentials: "cred:" + credential_id
        box_key = Concat(Bytes("cred:"), credential_id)

        # Box value: [revoked_at (8 bytes), issuer_address (32 bytes)]
        box_value = Concat(
            Itob(current_time),
            issuer_address
        )

        return Seq([
            Assert(is_admin),
            App.box_put(box_key, box_value),
            Approve()
        ])

    # Query issuer status (read-only)
    @Subroutine(TealType.uint64)
    def query_issuer():
        issuer_address = Txn.application_args[1]
        box_key = issuer_address

        return Seq([
            (value := App.box_get(box_key)),
            If(
                value.hasValue(),
                Seq([
                    Log(value.value()),
                    Approve()
                ]),
                Reject()
            )
        ])

    # Query credential status (read-only)
    @Subroutine(TealType.uint64)
    def query_credential():
        credential_id = Txn.application_args[1]
        box_key = Concat(Bytes("cred:"), credential_id)

        return Seq([
            (value := App.box_get(box_key)),
            If(
                value.hasValue(),
                Seq([
                    Log(value.value()),
                    Approve()
                ]),
                Reject()
            )
        ])

    # Update issuer metadata (admin only)
    @Subroutine(TealType.uint64)
    def update_metadata():
        issuer_address = Txn.application_args[1]
        name = Txn.application_args[2]
        full_name = Txn.application_args[3]
        url = Txn.application_args[4]
        organization_type = Txn.application_args[5]
        jurisdiction = Txn.application_args[6]
        current_time = Global.latest_timestamp()

        # Metadata box key
        meta_box_key = Concat(Bytes("meta:"), issuer_address)
        
        # Metadata value: [updated_at (8), name, full_name, url, org_type, jurisdiction]
        meta_box_value = Concat(
            Itob(current_time),  # updated_at
            name,                # name
            full_name,           # full_name
            url,                 # website_url
            organization_type,   # organization_type
            jurisdiction         # jurisdiction
        )

        return Seq([
            Assert(is_admin),  # Only admin can update metadata
            Assert(validate_name()),
            Assert(validate_url()),
            # Verify issuer exists
            (existing := App.box_get(issuer_address)),
            Assert(existing.hasValue()),
            # Update metadata
            App.box_put(meta_box_key, meta_box_value),
            Approve()
        ])

    # Query issuer metadata (read-only)
    @Subroutine(TealType.uint64)
    def query_metadata():
        issuer_address = Txn.application_args[1]
        meta_box_key = Concat(Bytes("meta:"), issuer_address)

        return Seq([
            (value := App.box_get(meta_box_key)),
            If(
                value.hasValue(),
                Seq([
                    Log(value.value()),
                    Approve()
                ]),
                Reject()
            )
        ])

    # Handler subroutines for simple operations
    @Subroutine(TealType.uint64)
    def handle_delete():
        return If(is_admin, Approve(), Reject())

    @Subroutine(TealType.uint64)
    def handle_update():
        return If(is_admin, Approve(), Reject())

    @Subroutine(TealType.uint64)
    def handle_optin():
        return Approve()

    @Subroutine(TealType.uint64)
    def handle_closeout():
        return Approve()

    # Router for application calls
    program = Cond(
        [Txn.application_id() == Int(0), on_create()],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_delete()],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_update()],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin()],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout()],
        [Txn.application_args[0] == Bytes("add_issuer"), add_issuer()],
        [Txn.application_args[0] == Bytes("revoke_issuer"), revoke_issuer()],
        [Txn.application_args[0] == Bytes("reinstate_issuer"), reinstate_issuer()],
        [Txn.application_args[0] == Bytes("revoke_credential"), revoke_credential()],
        [Txn.application_args[0] == Bytes("update_metadata"), update_metadata()],
        [Txn.application_args[0] == Bytes("query_issuer"), query_issuer()],
        [Txn.application_args[0] == Bytes("query_credential"), query_credential()],
        [Txn.application_args[0] == Bytes("query_metadata"), query_metadata()],
    )

    return program


if __name__ == "__main__":
    # Compile approval program
    print(compileTeal(issuer_registry(), mode=Mode.Application, version=10))
