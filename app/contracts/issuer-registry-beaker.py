"""
Algorand Smart Contract for Issuer Registry using Beaker framework
Manages authorized credential issuers with temporal revocation support
"""

from pyteal import *
from beaker import *

# Create the application
app = Application("IssuerRegistry")

# Global state
app.state.admin = GlobalStateValue(
    stack_type=TealType.bytes,
    default=Global.creator_address(),
    descr="Address of contract administrator"
)

app.state.issuer_count = GlobalStateValue(
    stack_type=TealType.uint64,
    default=Int(0),
    descr="Total number of issuers ever added"
)

# External methods
@app.external
def add_issuer(
    issuer_address: abi.Address,
    name: abi.String,
    full_name: abi.String,
    website_url: abi.String,
    organization_type: abi.String,
    jurisdiction: abi.String,
    *,
    output: abi.String
) -> Expr:
    """Add a new authorized issuer to the registry"""
    current_time = Global.latest_timestamp()
    
    # Check if caller is admin or existing issuer
    is_admin = Txn.sender() == app.state.admin.get()
    
    # For now, only admin can add issuers (can be extended for vouching)
    return Seq(
        Assert(is_admin),
        
        # Create issuer box
        App.box_put(
            issuer_address.get(),
            Concat(
                Itob(current_time),  # authorized_at
                Itob(Int(0)),        # revoked_at (0 = not revoked)
                Itob(Int(0)),        # revoke_all_prior (0 = false)
                Txn.sender()         # vouched_by
            )
        ),
        
        # Create metadata box
        App.box_put(
            Concat(Bytes("meta:"), issuer_address.get()),
            Concat(
                Itob(current_time),  # updated_at
                name.get(),          # name
                full_name.get(),     # full_name
                website_url.get(),   # website_url
                organization_type.get(), # organization_type
                jurisdiction.get()   # jurisdiction
            )
        ),
        
        # Update issuer count
        app.state.issuer_count.set(app.state.issuer_count.get() + Int(1)),
        
        output.set(Itob(Int(1))),  # Success
        Approve()
    )

@app.external
def revoke_issuer(
    issuer_address: abi.Address,
    *,
    output: abi.String
) -> Expr:
    """Revoke authorization for an issuer (admin only)"""
    is_admin = Txn.sender() == app.state.admin.get()
    current_time = Global.latest_timestamp()
    
    return Seq(
        Assert(is_admin),
        
        # Update issuer box with revocation
        (issuer_box := App.box_get(issuer_address.get())),
        Assert(issuer_box.hasValue()),
        
        # Extract existing data and update revoked_at
        (existing_data := issuer_box.value()),
        App.box_put(
            issuer_address.get(),
            Concat(
                Extract(existing_data, Int(0), Int(8)),  # authorized_at
                Itob(current_time),                      # revoked_at
                Extract(existing_data, Int(16), Int(8)),  # revoke_all_prior
                Extract(existing_data, Int(24), Int(32))  # vouched_by
            )
        ),
        
        output.set(Itob(Int(1))),  # Success
        Approve()
    )

@app.external
def reinstate_issuer(
    issuer_address: abi.Address,
    *,
    output: abi.String
) -> Expr:
    """Reinstate a previously revoked issuer (admin only)"""
    is_admin = Txn.sender() == app.state.admin.get()
    
    return Seq(
        Assert(is_admin),
        
        # Update issuer box to remove revocation
        (issuer_box := App.box_get(issuer_address.get())),
        Assert(issuer_box.hasValue()),
        
        # Extract existing data and clear revoked_at
        (existing_data := issuer_box.value()),
        App.box_put(
            issuer_address.get(),
            Concat(
                Extract(existing_data, Int(0), Int(8)),  # authorized_at
                Itob(Int(0)),                           # revoked_at (0 = not revoked)
                Extract(existing_data, Int(16), Int(8)), # revoke_all_prior
                Extract(existing_data, Int(24), Int(32)) # vouched_by
            )
        ),
        
        output.set(Itob(Int(1))),  # Success
        Approve()
    )

@app.external
def revoke_credential(
    credential_id: abi.String,
    issuer_address: abi.Address,
    *,
    output: abi.String
) -> Expr:
    """Revoke a specific credential (admin only)"""
    is_admin = Txn.sender() == app.state.admin.get()
    current_time = Global.latest_timestamp()
    
    return Seq(
        Assert(is_admin),
        
        # Create credential revocation box
        App.box_put(
            Concat(Bytes("cred:"), credential_id.get()),
            Concat(
                Itob(current_time),  # revoked_at
                issuer_address.get() # issuer_address
            )
        ),
        
        output.set(Itob(Int(1))),  # Success
        Approve()
    )

@app.external
def query_issuer(
    issuer_address: abi.Address,
    *,
    output: abi.DynamicBytes
) -> Expr:
    """Query the status of an issuer"""
    return Seq(
        (issuer_box := App.box_get(issuer_address.get())),
        If(
            issuer_box.hasValue(),
            output.set(issuer_box.value()),
            output.set(Bytes(""))  # Empty if not found
        ),
        Approve()
    )

@app.external
def query_credential(
    credential_id: abi.String,
    *,
    output: abi.DynamicBytes
) -> Expr:
    """Query the status of a credential"""
    return Seq(
        (cred_box := App.box_get(Concat(Bytes("cred:"), credential_id.get()))),
        If(
            cred_box.hasValue(),
            output.set(cred_box.value()),
            output.set(Bytes(""))  # Empty if not found
        ),
        Approve()
    )

@app.external
def update_metadata(
    issuer_address: abi.Address,
    name: abi.String,
    full_name: abi.String,
    website_url: abi.String,
    organization_type: abi.String,
    jurisdiction: abi.String,
    *,
    output: abi.String
) -> Expr:
    """Update issuer metadata (admin only)"""
    is_admin = Txn.sender() == app.state.admin.get()
    current_time = Global.latest_timestamp()
    
    return Seq(
        Assert(is_admin),
        
        # Update metadata box
        App.box_put(
            Concat(Bytes("meta:"), issuer_address.get()),
            Concat(
                Itob(current_time),  # updated_at
                name.get(),          # name
                full_name.get(),     # full_name
                website_url.get(),   # website_url
                organization_type.get(), # organization_type
                jurisdiction.get()   # jurisdiction
            )
        ),
        
        output.set(Itob(Int(1))),  # Success
        Approve()
    )

@app.external
def query_metadata(
    issuer_address: abi.Address,
    *,
    output: abi.DynamicBytes
) -> Expr:
    """Query issuer metadata"""
    return Seq(
        (meta_box := App.box_get(Concat(Bytes("meta:"), issuer_address.get()))),
        If(
            meta_box.hasValue(),
            output.set(meta_box.value()),
            output.set(Bytes(""))  # Empty if not found
        ),
        Approve()
    )

# Generate the app spec
if __name__ == "__main__":
    app_spec = app.build()
    with open("app/contracts/issuer-registry-app-spec.json", "w") as f:
        f.write(app_spec.to_json())
