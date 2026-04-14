import type { MetaFunction } from "react-router";
import MermaidDiagram from "~/components/MermaidDiagram";

const ARCHITECTURE_DIAGRAM = `
flowchart LR
  V["Identity Verification\n(document + biometrics)"]
  IS["Issuance Service"]
  W["Wallet App\n(W3C Credential — private)"]
  REG["Issuer Registry\nSmart Contract"]
  NFT["Credential NFT\n(ASA — no personal data)"]

  subgraph Issuer["Cardless ID Issuer"]
    V -->|"verified identity"| IS
  end

  subgraph User["User's Device"]
    W
  end

  subgraph Algorand["Algorand Blockchain (public)"]
    REG
    NFT
  end

  IS -->|"stores W3C credential"| W
  IS -->|"mints non-transferable NFT"| NFT
  IS <-->|"isAuthorized()"| REG
`;

const ISSUANCE_SEQUENCE = `
sequenceDiagram
  actor User
  participant Issuer
  participant Algorand

  Issuer->>Algorand: Check issuer is authorized (registry)
  Algorand-->>Issuer: isAuthorized = true

  User->>Issuer: Submit identity documents & selfie
  Issuer->>Issuer: Verify document + biometrics
  Issuer->>Issuer: Generate W3C Verifiable Credential
  Issuer-->>User: Store credential in wallet (off-chain)

  alt New wallet
    Issuer->>Algorand: Fund wallet (~0.2 ALGO)
  end

  Issuer->>Algorand: Mint credential NFT (ASA)
  Issuer->>Algorand: Transfer NFT to user wallet
  Issuer->>Algorand: Freeze NFT (non-transferable)
  Algorand-->>User: Credential anchored on-chain
`;

export const meta: MetaFunction = () => {
  return [
    { title: "Cardless ID Smart Contract Architecture" },
    {
      name: "description",
      content:
        "How Cardless ID uses blockchain smart contracts to anchor identity credentials — Algorand implementation and portability to other chains.",
    },
  ];
};

export default function SmartContractDocs() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Smart Contract Architecture
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          How Cardless ID anchors identity credentials to a public blockchain
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-blue-800">
            Cardless ID currently runs on the{" "}
            <strong>Algorand blockchain</strong>. The underlying architecture —
            an on-chain issuer registry plus non-transferable credential tokens
            — is blockchain-agnostic and can be ported to any chain that
            supports smart contracts.
          </p>
        </div>
      </div>

      {/* Overview */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          When a user's identity is verified, Cardless ID records the credential
          in two places:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4 ml-2">
          <li>
            A <strong>W3C Verifiable Credential</strong> stored locally in the
            user's wallet app (off-chain, private).
          </li>
          <li>
            A <strong>non-transferable NFT</strong> minted on the blockchain
            (on-chain, public proof-of-issuance).
          </li>
        </ol>
        <p className="text-gray-700">
          The on-chain record contains no personal data — only a cryptographic
          hash and metadata about the issuer. This lets any third party
          independently verify that a credential was legitimately issued without
          accessing any private information.
        </p>
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-base font-medium text-gray-700 mb-4">
            Architecture Overview
          </h3>
          <MermaidDiagram chart={ARCHITECTURE_DIAGRAM} className="flex justify-center" />
        </div>
      </section>

      {/* Issuer Registry */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          The Issuer Registry Smart Contract
        </h2>
        <p className="text-gray-700 mb-4">
          A smart contract deployed on Algorand maintains a registry of
          authorized credential issuers. The contract exposes these core
          operations:
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                  Method
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 font-mono text-indigo-700">
                  addIssuer()
                </td>
                <td className="px-4 py-3 text-gray-700">
                  Registers a new authorized issuer with name and URL metadata
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-indigo-700">
                  removeIssuer()
                </td>
                <td className="px-4 py-3 text-gray-700">
                  Permanently removes an issuer from the registry
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-indigo-700">
                  revokeIssuer()
                </td>
                <td className="px-4 py-3 text-gray-700">
                  Suspends an issuer (soft or hard revocation)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-indigo-700">
                  reinstateIssuer()
                </td>
                <td className="px-4 py-3 text-gray-700">
                  Restores a previously suspended issuer
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-indigo-700">
                  isAuthorized()
                </td>
                <td className="px-4 py-3 text-gray-700">
                  Returns whether an issuer is currently active — callable by
                  anyone, no permission required
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-indigo-700">
                  revokeCredential()
                </td>
                <td className="px-4 py-3 text-gray-700">
                  Marks a specific credential as revoked. The ID is the{" "}
                  <code className="bg-gray-100 px-1 rounded text-xs">urn:uuid:…</code>{" "}
                  string assigned to the W3C credential at issuance and stored in
                  the NFT's on-chain metadata
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-indigo-700">
                  transferAdmin()
                </td>
                <td className="px-4 py-3 text-gray-700">
                  Transfers administrative control of the registry
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4">
          <p className="text-indigo-800">
            <strong>Trustless verification:</strong> Because{" "}
            <code className="bg-indigo-100 px-1 rounded">isAuthorized()</code>{" "}
            is a public read-only call, any verifier can check issuer status
            directly against the blockchain without trusting Cardless ID's
            servers.
          </p>
        </div>
      </section>

      {/* Credential NFTs */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Credential NFTs (Algorand Standard Assets)
        </h2>
        <p className="text-gray-700 mb-4">
          Each verified credential is minted as an{" "}
          <strong>Algorand Standard Asset (ASA)</strong> with properties that
          make it behave like a non-transferable "soulbound" token:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Asset Properties</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>
                <span className="font-mono text-indigo-700">total: 1</span> —
                unique, one-of-a-kind token
              </li>
              <li>
                <span className="font-mono text-indigo-700">decimals: 0</span>{" "}
                — indivisible
              </li>
              <li>
                <span className="font-mono text-indigo-700">unitName: "CIDCRED"</span>
              </li>
              <li>
                <span className="font-mono text-indigo-700">
                  defaultFrozen: false
                </span>{" "}
                — frozen after transfer
              </li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">
              Issuer Controls
            </h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>
                <span className="font-mono text-indigo-700">manager</span> —
                issuer can update metadata
              </li>
              <li>
                <span className="font-mono text-indigo-700">freeze</span> —
                issuer freezes token after delivery
              </li>
              <li>
                <span className="font-mono text-indigo-700">clawback</span> —
                issuer can revoke the credential
              </li>
            </ul>
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Issuance Flow
        </h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
          <MermaidDiagram chart={ISSUANCE_SEQUENCE} />
        </div>
        <p className="text-gray-700">
          On-chain metadata follows the{" "}
          <strong>ARC-69 standard</strong> and includes the credential ID, a
          SHA-256 composite hash (for duplicate detection), and the issuance
          timestamp. No name, birthdate, or other personal data is written to
          the chain.
        </p>
      </section>

      {/* Costs */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Costs
        </h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-800">
            There is a real (though small) cost in ALGO for each credential
            issuance. These fees are paid by the issuer, not the end user.
          </p>
        </div>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                  Operation
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                  Cost
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 text-gray-700">
                  Wallet funding (new wallets only)
                </td>
                <td className="px-4 py-3 font-mono text-gray-900">~0.2 ALGO</td>
                <td className="px-4 py-3 text-gray-600">
                  0.1 ALGO min balance + tx fees; one-time per wallet
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">ASA creation (mint)</td>
                <td className="px-4 py-3 font-mono text-gray-900">0.001 ALGO</td>
                <td className="px-4 py-3 text-gray-600">
                  Standard Algorand transaction fee
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">ASA transfer</td>
                <td className="px-4 py-3 font-mono text-gray-900">0.001 ALGO</td>
                <td className="px-4 py-3 text-gray-600">
                  Deliver credential to recipient wallet
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">ASA freeze</td>
                <td className="px-4 py-3 font-mono text-gray-900">0.001 ALGO</td>
                <td className="px-4 py-3 text-gray-600">
                  Lock credential as non-transferable
                </td>
              </tr>
              <tr className="bg-gray-50 font-medium">
                <td className="px-4 py-3 text-gray-900">
                  Total per issuance (existing wallet)
                </td>
                <td className="px-4 py-3 font-mono text-gray-900">~0.003 ALGO</td>
                <td className="px-4 py-3 text-gray-600">3 transactions</td>
              </tr>
              <tr className="bg-gray-50 font-medium">
                <td className="px-4 py-3 text-gray-900">
                  Total per issuance (new wallet)
                </td>
                <td className="px-4 py-3 font-mono text-gray-900">~0.203 ALGO</td>
                <td className="px-4 py-3 text-gray-600">
                  Includes one-time wallet funding
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-600">
          ALGO prices fluctuate. At typical market rates the per-issuance cost
          is a fraction of a US cent for existing wallets, or a few cents for a
          brand-new wallet. The 0.1 ALGO minimum balance is locked in the
          recipient's wallet (not burned) and can be recovered if the wallet is
          ever closed.
        </p>
      </section>

      {/* Portability */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Portability to Other Blockchains
        </h2>
        <p className="text-gray-700 mb-4">
          Algorand was chosen for its low transaction fees, fast finality (~3.3s
          blocks), and energy efficiency. However, the Cardless ID architecture
          does not depend on any Algorand-specific feature. The two chain-specific
          modules are:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2 mb-6">
          <li>
            <code className="bg-gray-100 px-1 rounded text-sm">
              app/utils/algorand.ts
            </code>{" "}
            — client setup, wallet funding, transaction helpers
          </li>
          <li>
            <code className="bg-gray-100 px-1 rounded text-sm">
              app/utils/nft-credentials.ts
            </code>{" "}
            — ASA mint, transfer, freeze, clawback, and metadata reads
          </li>
        </ul>
        <p className="text-gray-700 mb-4">
          All other code — the W3C credential format, the issuance API, the
          verification flow, and the wallet app — is chain-agnostic. Porting to
          another chain requires replacing these two modules with equivalents for
          the target platform:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Ethereum / L2s</h3>
            <p className="text-sm text-gray-600">
              Deploy an ERC-5484 "Soulbound Token" contract for non-transferable
              credentials. Use an ERC-1967 proxy for the issuer registry. Gas
              costs are higher but L2s (Polygon, Base, Arbitrum) bring them
              close to Algorand levels.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Solana</h3>
            <p className="text-sm text-gray-600">
              Use Metaplex's Non-Transferable Token standard or a custom SPL
              token with freeze authority held by the issuer. The Solana
              Programs layer maps directly to the AVM smart contract used here.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">
              Other AVM chains
            </h3>
            <p className="text-sm text-gray-600">
              Any AVM-compatible chain (Voi, etc.) can run the existing
              contracts with zero or minimal changes, since they share the same
              virtual machine and ASA standard.
            </p>
          </div>
        </div>
      </section>

      {/* Links */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Further Reading
        </h2>
        <ul className="space-y-2 text-gray-700">
          <li>
            <a
              href="https://algorand.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Algorand Blockchain
            </a>{" "}
            — consensus mechanism, fees, and developer docs
          </li>
          <li>
            <a
              href="https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0069.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              ARC-69
            </a>{" "}
            — the ASA metadata standard used for credential NFTs
          </li>
          <li>
            <a
              href="https://eips.ethereum.org/EIPS/eip-5484"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              EIP-5484 Soulbound Tokens
            </a>{" "}
            — Ethereum equivalent for non-transferable credentials
          </li>
          <li>
            <a
              href="https://www.w3.org/TR/vc-data-model/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              W3C Verifiable Credentials
            </a>{" "}
            — the off-chain credential format used alongside the on-chain token
          </li>
        </ul>
      </section>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </>
  );
}
