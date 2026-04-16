import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import CodeBlock from "~/components/CodeBlock";
import MermaidDiagram from "~/components/MermaidDiagram";

export const meta: MetaFunction = () => {
  return [
    { title: "Verification Protocol - Cardless ID" },
    {
      name: "description",
      content:
        "How Cardless ID age verification works — blockchain-native signed proofs, the JS snippet, and a serverless verification path.",
    },
  ];
};

const FULL_FLOW_DIAGRAM = `
sequenceDiagram
  autonumber
  participant P as Integrator Page
  participant C as Cardless ID API
  participant U as User Wallet App
  participant A as Algorand Blockchain

  P->>C: GET /api/v/nonce
  C-->>P: signed nonce (short-lived JWT)

  P->>P: Render QR code encoding nonce + minAge

  Note over U: User scans QR with Cardless ID wallet

  U->>A: Read credential NFT from wallet address
  A-->>U: Credential + ARC-69 metadata (birthdate hash)

  Note over U: Check birthdate satisfies minAge

  U->>U: Sign proof with wallet private key

  U->>C: POST /api/v/submit
  Note right of U: {nonce, walletAddress, signedProof}
  C-->>U: {success: true}
  Note over C: Store proof in TTL cache (60s)

  P->>C: GET /api/v/result/{nonce}
  C-->>P: signedProof

  Note over P: Verify signature + check wallet on Algorand
`;

const ARCHITECTURE_DIAGRAM = `
flowchart LR
  subgraph Once["Credential Issuance (one-time per user)"]
    direction TB
    KYC[Identity Verification] --> W[Algorand Wallet Created]
    W --> N[Credential NFT minted]
    N --> F[NFT frozen — non-transferable]
  end

  subgraph Every["Every Age Verification"]
    direction TB
    QR[Snippet shows QR] --> SC[Wallet scans QR]
    SC --> AQ[Wallet reads Algorand]
    AQ --> SG[Wallet signs proof]
    SG --> RE[Proof relayed via API]
    RE --> VF[Integrator page verifies]
  end

  F -->|credential lives on-chain| AQ
`;

export default function VerificationProtocol() {
  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/docs"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Verification Protocol
        </h1>
        <p className="text-lg text-gray-600">
          How Cardless ID age verification works — blockchain-native signed
          proofs, stateless relay, and a verification path that never touches
          a database.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Table of Contents
        </h2>
        <ul className="space-y-1 text-blue-700">
          <li><a href="#overview" className="hover:underline">1. Overview</a></li>
          <li><a href="#snippet" className="hover:underline">2. The JS Snippet</a></li>
          <li><a href="#flow" className="hover:underline">3. Verification Flow</a></li>
          <li><a href="#diagram" className="hover:underline">4. Full Sequence Diagram</a></li>
          <li><a href="#proof" className="hover:underline">5. The Signed Proof</a></li>
          <li><a href="#scalability" className="hover:underline">6. Scalability</a></li>
          <li><a href="#security" className="hover:underline">7. Security Properties</a></li>
          <li><a href="#partner-wallets" className="hover:underline">8. Partner Wallet Apps</a></li>
          <li><a href="#standards" className="hover:underline">9. Standards Compatibility</a></li>
        </ul>
      </nav>

      {/* 1. Overview */}
      <section id="overview" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">1. Overview</h2>
        <p className="text-gray-700 mb-4">
          Cardless ID separates two distinct operations that happen at very
          different frequencies:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
            <h3 className="font-semibold text-indigo-900 mb-2">
              Credential Issuance — once per user
            </h3>
            <p className="text-indigo-800 text-sm">
              A user goes through identity verification once. A W3C Verifiable
              Credential is issued and anchored to Algorand as a
              non-transferable NFT. This is the only step that requires
              Cardless ID's backend to do significant work.
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="font-semibold text-green-900 mb-2">
              Age Verification — every time a site checks
            </h3>
            <p className="text-green-800 text-sm">
              The integrator embeds a JS snippet. The user scans a QR code.
              The wallet reads the credential directly from Algorand and
              produces a cryptographically signed proof. The Cardless ID server
              relays the proof — it never queries the blockchain or a database.
            </p>
          </div>
        </div>
        <p className="text-gray-700 mb-4">
          This is analogous to Web3 login (Sign-In with Ethereum): the site
          asks a question, the wallet proves something using an on-chain asset,
          and the site gets a signed, verifiable answer. The blockchain is the
          source of truth; the API is just a lightweight relay.
        </p>
        <div className="flex justify-center">
          <MermaidDiagram chart={ARCHITECTURE_DIAGRAM} className="w-full" />
        </div>
      </section>

      {/* 2. The JS Snippet */}
      <section id="snippet" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          2. The JS Snippet
        </h2>
        <p className="text-gray-700 mb-4">
          Integrators add age verification with a single script tag. No backend
          required.
        </p>

        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            CDN embed
          </p>
          <CodeBlock language="html">
            {`<script src="https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js"></script>
<div id="age-gate"></div>
<script>
  const verify = new CardlessIDVerify({
    minAge: 21,
    onVerified: function({ meetsRequirement }) {
      if (meetsRequirement) {
        // User is 21+ — grant access
      }
    }
  });
  verify.mount('#age-gate');
</script>`}
          </CodeBlock>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            npm / ES module
          </p>
          <CodeBlock language="typescript">
            {`import { CardlessIDVerify } from '@cardlessid/verify';

const verify = new CardlessIDVerify({
  minAge: 21,
  onVerified({ meetsRequirement }) {
    if (meetsRequirement) {
      // grant access
    }
  },
});

verify.mount('#age-gate'); // renders QR code`}
          </CodeBlock>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>No API key needed for verification.</strong> The JS snippet
          is public — the security comes from the wallet's cryptographic
          signature, not from a secret on the integrator's page. API keys are
          only required for the credential issuance flow.
        </div>
      </section>

      {/* 3. Verification Flow */}
      <section id="flow" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          3. Verification Flow
        </h2>
        <ol className="space-y-6">
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Snippet fetches a nonce</h3>
              <p className="text-gray-700 text-sm">
                On load, the snippet calls{" "}
                <code className="bg-gray-100 px-1 rounded">GET /api/v/nonce</code>.
                The server returns a short-lived signed nonce (expires in 5
                minutes). No database write happens — the nonce is a signed
                JWT the server can verify later without storing anything.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Snippet displays a QR code</h3>
              <p className="text-gray-700 text-sm">
                The QR encodes{" "}
                <code className="bg-gray-100 px-1 rounded">{`{ nonce, minAge, returnUrl }`}</code>.
                On mobile, a deep link opens the wallet app directly. The{" "}
                <code className="bg-gray-100 px-1 rounded">minAge</code> is
                embedded in the QR — the user cannot modify it.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Wallet reads the credential from Algorand</h3>
              <p className="text-gray-700 text-sm">
                The wallet app queries Algorand directly — no Cardless ID
                server involved. It reads the credential NFT held by the user's
                wallet address, inspects the ARC-69 metadata, and checks
                whether the birthdate satisfies{" "}
                <code className="bg-gray-100 px-1 rounded">minAge</code>. This
                is a read-only operation; no transaction is created and no gas
                is spent.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Wallet signs a proof</h3>
              <p className="text-gray-700 text-sm mb-2">
                If the credential exists and the age requirement is met, the
                wallet signs a proof with the user's Algorand private key:
              </p>
              <CodeBlock language="json">
                {`{
  "nonce":            "eyJ...",
  "walletAddress":    "XYZAQ5E3...",
  "minAge":           21,
  "meetsRequirement": true,
  "timestamp":        1744829470000
}`}
              </CodeBlock>
              <p className="text-gray-700 text-sm mt-2">
                The private key never leaves the wallet. The signature proves
                the holder of that wallet address made this assertion.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">5</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Wallet submits proof to Cardless ID API</h3>
              <p className="text-gray-700 text-sm">
                The wallet POSTs the signed proof to{" "}
                <code className="bg-gray-100 px-1 rounded">POST /api/v/submit</code>.
                The server verifies the nonce signature (stateless check), then
                stores{" "}
                <code className="bg-gray-100 px-1 rounded">nonce → signedProof</code>{" "}
                in a TTL cache for 60 seconds. That's the only "storage" that
                happens — it evicts automatically and contains no personal data.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">6</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Snippet retrieves and delivers the proof</h3>
              <p className="text-gray-700 text-sm">
                The snippet polls{" "}
                <code className="bg-gray-100 px-1 rounded">GET /api/v/result/{"{nonce}"}</code>{" "}
                every 1–2 seconds. Once found, it delivers the signed proof to
                the integrator's{" "}
                <code className="bg-gray-100 px-1 rounded">onResult</code>{" "}
                callback. The integrator can verify the Algorand signature
                client-side or pass it to their backend.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* 4. Full Sequence Diagram */}
      <section id="diagram" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          4. Full Sequence Diagram
        </h2>
        <p className="text-gray-700 mb-6">
          The Cardless ID API appears twice: once as a stateless nonce issuer,
          and once as a 60-second proof relay. It never queries Algorand. The
          integrator's backend is entirely optional.
        </p>
        <div className="flex justify-center">
          <MermaidDiagram chart={FULL_FLOW_DIAGRAM} className="w-full" />
        </div>
      </section>

      {/* 5. The Signed Proof */}
      <section id="proof" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          5. The Signed Proof
        </h2>
        <p className="text-gray-700 mb-4">
          The proof is the only thing that crosses the wire between the wallet
          and the integrator. It contains no personal data — only a boolean
          assertion and the wallet address.
        </p>

        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Proof structure
          </p>
          <CodeBlock language="json">
            {`{
  "payload": {
    "nonce":            "eyJhbGciOiJIUzI1NiJ9...",
    "walletAddress":    "XYZAQ5E3EQFWMH3MQVK2BX...",
    "minAge":           21,
    "meetsRequirement": true,
    "timestamp":        1744829470000
  },
  "signature": "base64url-encoded-ed25519-signature"
}`}
          </CodeBlock>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Verifying the proof (client-side)
          </p>
          <CodeBlock language="typescript">
            {`import { verifyProof } from '@cardlessid/verify';

const result = verifyProof(proof);

if (result.valid && result.payload.meetsRequirement) {
  // Age verified — ed25519 signature and timestamp confirmed
}`}
          </CodeBlock>
        </div>

        <div className="space-y-3">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">
              What the signature proves
            </h3>
            <p className="text-gray-700 text-sm">
              The Ed25519 signature was produced by the private key corresponding
              to <code className="bg-gray-100 px-1 rounded">walletAddress</code>.
              Since only the wallet holds that key, the signature proves the
              wallet owner made this assertion — it cannot be forged by the
              integrator page, Cardless ID's server, or anyone else.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">
              What the on-chain check adds
            </h3>
            <p className="text-gray-700 text-sm">
              The signature proves the wallet made the assertion. For higher
              assurance, an integrator can independently query Algorand to
              confirm the wallet holds a valid credential from a registered
              issuer. Without this check, someone could generate a fresh
              Algorand keypair and self-sign a proof with no credential backing it.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Scalability */}
      <section id="scalability" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          6. Scalability
        </h2>
        <p className="text-gray-700 mb-6">
          Every component in the verification path is either stateless or
          ephemeral. There is no database bottleneck.
        </p>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Operation</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Where</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Frequency</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Storage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-gray-700">Identity verification (KYC)</td>
                <td className="px-4 py-2">Third-party + Algorand</td>
                <td className="px-4 py-2 text-gray-500">Once per user</td>
                <td className="px-4 py-2 text-gray-500">On-chain permanent</td>
              </tr>
              <tr className="bg-green-50">
                <td className="px-4 py-2 font-medium text-green-900">Nonce generation</td>
                <td className="px-4 py-2 text-green-800">Cardless ID API</td>
                <td className="px-4 py-2 text-green-700">Every verification</td>
                <td className="px-4 py-2 text-green-700"><strong>None</strong> — signed JWT</td>
              </tr>
              <tr className="bg-green-50">
                <td className="px-4 py-2 font-medium text-green-900">Credential read</td>
                <td className="px-4 py-2 text-green-800">Wallet → Algorand</td>
                <td className="px-4 py-2 text-green-700">Every verification</td>
                <td className="px-4 py-2 text-green-700"><strong>None</strong> — read-only</td>
              </tr>
              <tr className="bg-green-50">
                <td className="px-4 py-2 font-medium text-green-900">Proof relay</td>
                <td className="px-4 py-2 text-green-800">Cardless ID API</td>
                <td className="px-4 py-2 text-green-700">Every verification</td>
                <td className="px-4 py-2 text-green-700"><strong>TTL cache, 60s</strong> — auto-evicts</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-sm text-blue-800">
          <strong>No database writes on the verification path.</strong> The
          Cardless ID server's only persistent storage is for credential
          issuance (one-time per user) and integrator account management.
          Age verifications themselves leave no trace.
        </div>
      </section>

      {/* 7. Security Properties */}
      <section id="security" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          7. Security Properties
        </h2>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Replay prevention</h3>
            <p className="text-gray-700 text-sm">
              Each nonce is a signed JWT with a 5-minute expiry. The TTL cache
              evicts proofs after 60 seconds. A captured proof cannot be
              reused — the nonce will be expired or already consumed.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Forgery prevention</h3>
            <p className="text-gray-700 text-sm">
              The proof is signed with the wallet's Ed25519 private key. No
              one — not the integrator, not Cardless ID's server, not a
              network observer — can produce a valid signature without that key.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-1">No personal data in transit</h3>
            <p className="text-gray-700 text-sm">
              The proof contains only a wallet address and a boolean. No name,
              birthdate, or document information is transmitted during
              verification. The integrator learns only that the wallet address
              meets the age requirement.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Tamper-proof age requirement</h3>
            <p className="text-gray-700 text-sm">
              The <code className="bg-gray-100 px-1 rounded">minAge</code> is
              embedded in the nonce when it's issued and echoed back in the
              signed proof. The wallet signs the minAge it was asked to check —
              the integrator page cannot lower the requirement after the fact.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-1">No integrator secret required</h3>
            <p className="text-gray-700 text-sm">
              Unlike the legacy challenge/response flow, the JS snippet needs
              no API key. There is no secret to leak from the browser. Security
              is provided entirely by the wallet's private key and the on-chain
              credential.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Partner Wallet Apps */}
      <section id="partner-wallets" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          8. Partner Wallet Apps
        </h2>
        <p className="text-gray-700 mb-4">
          Third parties may build wallet apps that are compatible with the
          Cardless ID verification protocol. Because the wallet is responsible
          for reading the on-chain credential and producing the signed proof,
          a malicious wallet could lie about the result.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-4">
          <h3 className="font-semibold text-red-900 mb-2">
            Partner wallets require audit and review
          </h3>
          <p className="text-red-800 text-sm">
            All partner wallet apps must be reviewed and approved by Cardless
            ID before deployment. The review verifies that the wallet correctly
            reads the on-chain credential, checks the age requirement honestly,
            and signs only truthful proofs.
          </p>
        </div>
        <p className="text-gray-700 text-sm">
          Integrators who require stronger guarantees should independently query
          Algorand to confirm the wallet holds a valid credential issued by a
          registered issuer — regardless of what the wallet app claims. The
          wallet address in the signed proof is the lookup key.
        </p>
      </section>

      {/* 9. Standards Compatibility */}
      <section id="standards" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          9. Standards Compatibility
        </h2>
        <p className="text-gray-700 mb-4">
          The Cardless ID verification protocol is designed to align with{" "}
          <strong>SIOPv2</strong> (Self-Issued OpenID Provider v2) and{" "}
          <strong>OID4VP</strong> (OpenID for Verifiable Presentations) — the
          W3C and OpenID Foundation standards for decentralized identity
          presentation. This positions Cardless ID for interoperability with
          SSI ecosystem pilots including eIDAS 2.0 wallet programs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
            <h3 className="font-semibold text-blue-900 mb-2">Current: Custom flow</h3>
            <p className="text-blue-800 text-sm">
              The verification flow described in this document uses a custom
              nonce + Algorand ed25519 signed proof format. This ships first
              and has no external dependencies.
            </p>
          </div>
          <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-5">
            <h3 className="font-semibold text-indigo-900 mb-2">Planned: SIOP-OID4VP envelope</h3>
            <p className="text-indigo-800 text-sm">
              A future update will wrap the same cryptographic proof in a
              standard W3C Verifiable Presentation, enabling any
              SIOP-OID4VP–compliant wallet to participate after audit and review.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">
            Algorand wallets as DIDs
          </h3>
          <p className="text-gray-700 text-sm mb-2">
            SIOP-OID4VP uses{" "}
            <strong>Decentralized Identifiers (DIDs)</strong> as wallet
            identifiers. Algorand wallet addresses map to DIDs via the{" "}
            <code className="bg-gray-100 px-1 rounded">did:algo</code> method:
          </p>
          <code className="block bg-gray-100 px-3 py-2 rounded text-sm font-mono">
            did:algo:XYZAQ5E3EQFWMH3MQVK2BX...
          </code>
          <p className="text-gray-700 text-sm mt-2">
            A <code className="bg-gray-100 px-1 rounded">did:algo</code>{" "}
            resolver reads the Algorand account state and produces a W3C DID
            Document containing the wallet's ed25519 public key. No transaction
            or gas required — it's a read-only node query.
          </p>
        </div>

        <p className="text-gray-700 text-sm">
          The underlying infrastructure (stateless nonce, TTL cache proof relay)
          is unchanged between the custom flow and the SIOP-OID4VP flow. Only
          the message format changes — from a custom JSON proof to a standard
          Verifiable Presentation.
        </p>
      </section>

      {/* Related */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Related Documentation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/docs/integration-guide"
            className="border border-blue-200 bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors block"
          >
            <h3 className="font-semibold text-blue-900 mb-1">Integration Guide</h3>
            <p className="text-blue-700 text-sm">
              Full SDK reference, code examples, and security best practices
              for integrators.
            </p>
          </Link>
          <Link
            to="/docs/smart-contracts"
            className="border border-indigo-200 bg-indigo-50 rounded-lg p-4 hover:bg-indigo-100 transition-colors block"
          >
            <h3 className="font-semibold text-indigo-900 mb-1">
              Smart Contract Architecture
            </h3>
            <p className="text-indigo-700 text-sm">
              How credentials are anchored to Algorand and the issuer registry
              design.
            </p>
          </Link>
          <Link
            to="/docs/privacy-architecture"
            className="border border-green-200 bg-green-50 rounded-lg p-4 hover:bg-green-100 transition-colors block"
          >
            <h3 className="font-semibold text-green-900 mb-1">
              Privacy Architecture
            </h3>
            <p className="text-green-700 text-sm">
              Data retention, zero-knowledge design, and privacy rights.
            </p>
          </Link>
          <Link
            to="/docs/credential-schema"
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors block"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Credential Schema</h3>
            <p className="text-gray-700 text-sm">
              W3C Verifiable Credential field definitions and structure.
            </p>
          </Link>
        </div>
      </section>
    </>
  );
}
