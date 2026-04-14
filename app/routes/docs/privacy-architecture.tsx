import type { MetaFunction } from "react-router";
import { Link } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Architecture - Cardless ID" },
    {
      name: "description",
      content:
        "How Cardless ID collects, processes, and protects your identity data — and why we are designed to know as little about you as possible.",
    },
  ];
};

export default function PrivacyArchitecture() {
  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link to="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Documentation
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Architecture</h1>
        <p className="text-lg text-gray-600">
          How Cardless ID collects, processes, and protects your identity data —
          and why we are designed to know as little about you as possible.
        </p>
      </div>

      {/* ToC */}
      <nav className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Contents</h2>
        <ol className="space-y-1 text-blue-700 list-decimal list-inside text-sm">
          <li><a href="#what-we-collect" className="hover:underline">What data is collected</a></li>
          <li><a href="#how-long" className="hover:underline">How long it is retained</a></li>
          <li><a href="#where-processed" className="hover:underline">Where it is processed</a></li>
          <li><a href="#permanent-storage" className="hover:underline">What is stored permanently</a></li>
          <li><a href="#third-parties" className="hover:underline">Third-party processors</a></li>
          <li><a href="#zero-knowledge" className="hover:underline">Zero-knowledge credential design</a></li>
          <li><a href="#user-rights" className="hover:underline">Your rights and how to exercise them</a></li>
          <li><a href="#geographic-scope" className="hover:underline">Geographic scope</a></li>
        </ol>
      </nav>

      {/* 1 */}
      <section id="what-we-collect" className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What data is collected</h2>
        <p className="text-gray-700 mb-4">
          Verification requires three pieces of data, all of which are processed transiently
          and never stored long-term on our servers:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-900 border-b">Data</th>
                <th className="text-left p-3 font-semibold text-gray-900 border-b">Purpose</th>
                <th className="text-left p-3 font-semibold text-gray-900 border-b">Stored?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-3 text-gray-700">Government ID photo (front &amp; back)</td>
                <td className="p-3 text-gray-600">Extract identity fields; fraud detection</td>
                <td className="p-3 text-red-700 font-medium">Deleted immediately after processing</td>
              </tr>
              <tr>
                <td className="p-3 text-gray-700">Selfie photo</td>
                <td className="p-3 text-gray-600">Face matching against ID photo; liveness check</td>
                <td className="p-3 text-red-700 font-medium">Deleted immediately after processing</td>
              </tr>
              <tr>
                <td className="p-3 text-gray-700">Extracted identity fields (name, date of birth, document number, address)</td>
                <td className="p-3 text-gray-600">Returned to your device for credential creation; HMAC hash kept for integrity verification</td>
                <td className="p-3 text-orange-700 font-medium">Fields deleted after 48 hours; only an HMAC hash is retained</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 text-sm mt-3">
          We collect only what is necessary to issue a credential. Once issuance is complete,
          the original identity data is not needed and is not kept.
        </p>
      </section>

      {/* 2 */}
      <section id="how-long" className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How long data is retained</h2>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-1">ID &amp; selfie photos — deleted immediately</h3>
            <p className="text-green-800 text-sm">
              Photos are saved to a temporary directory only for the duration of processing
              (typically a few seconds). They are deleted in both the success and error paths.
              A background sweep runs every 5 minutes and deletes any files older than 15 minutes,
              protecting against data being left behind by a server crash.
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-1">Verification session records — deleted after 48 hours</h3>
            <p className="text-yellow-800 text-sm">
              Firebase stores a session record while your verification is in progress (status,
              timestamps, HMAC hash). This record is automatically deleted 48 hours after creation.
              Sessions are valid for 30 minutes; the 48-hour window exists only as a grace period
              for credential issuance to complete.
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-1">Age verification sessions — deleted after 1 hour</h3>
            <p className="text-yellow-800 text-sm">
              Age verification challenge records are deleted after 1 hour, or immediately when the
              session reaches a terminal state (approved or rejected) — whichever comes first.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-1">Credential (on-chain) — permanent</h3>
            <p className="text-blue-800 text-sm">
              The Algorand NFT credential is permanent by design — it is what you use to prove
              your age. It contains only a cryptographic hash and your wallet address. No
              personally identifiable information is stored on the blockchain.
            </p>
          </div>
        </div>
      </section>

      {/* 3 */}
      <section id="where-processed" className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Where data is processed</h2>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-900 border-b">System</th>
                <th className="text-left p-3 font-semibold text-gray-900 border-b">What it processes</th>
                <th className="text-left p-3 font-semibold text-gray-900 border-b">Region</th>
                <th className="text-left p-3 font-semibold text-gray-900 border-b">Retains data?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-3 font-medium text-gray-800">AWS Rekognition</td>
                <td className="p-3 text-gray-600">Face comparison, liveness detection</td>
                <td className="p-3 text-gray-600">EU (Ireland) by default</td>
                <td className="p-3 text-red-700 font-medium">No</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-gray-800">AWS Textract</td>
                <td className="p-3 text-gray-600">ID document text extraction</td>
                <td className="p-3 text-gray-600">EU (Ireland) by default</td>
                <td className="p-3 text-red-700 font-medium">No</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-gray-800">Google Document AI</td>
                <td className="p-3 text-gray-600">Document fraud detection</td>
                <td className="p-3 text-gray-600">Google Cloud (varies by region config)</td>
                <td className="p-3 text-red-700 font-medium">No</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-gray-800">Firebase Realtime Database</td>
                <td className="p-3 text-gray-600">Ephemeral session state only (no PII)</td>
                <td className="p-3 text-gray-600">Per your Firebase project region</td>
                <td className="p-3 text-yellow-700 font-medium">48h TTL</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-gray-800">Algorand blockchain</td>
                <td className="p-3 text-gray-600">Credential NFT issuance</td>
                <td className="p-3 text-gray-600">Decentralised</td>
                <td className="p-3 text-blue-700 font-medium">Permanent (no PII)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4 */}
      <section id="permanent-storage" className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. What is stored permanently</h2>
        <p className="text-gray-700 mb-3">
          The only data stored permanently is on the Algorand blockchain:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
          <li>Your <strong>wallet address</strong> (issued at the time of verification)</li>
          <li>A <strong>cryptographic hash</strong> of your identity data (not reversible to PII)</li>
          <li>The <strong>credential issuance date</strong></li>
        </ul>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
          The blockchain record contains no name, date of birth, document number, address, or
          photo. It cannot be used to identify you without your cooperation. Even Cardless ID
          cannot read your identity data from the blockchain.
        </div>
      </section>

      {/* 5 */}
      <section id="third-parties" className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Third-party processors</h2>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Amazon Web Services (AWS)</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="font-medium">Services used:</span> Rekognition (face match, liveness), Textract (ID extraction)</li>
              <li><span className="font-medium">Data sent:</span> ID photo and selfie as base64 images, per verification request</li>
              <li><span className="font-medium">Retention by AWS:</span> None — images are processed in-memory and not stored</li>
              <li><span className="font-medium">Data processing agreement:</span> Covered by AWS standard DPA (included in Customer Agreement)</li>
              <li><span className="font-medium">Transfer mechanism (if applicable):</span> EU–US Data Privacy Framework; default region is EU (Ireland)</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Google Cloud (Document AI)</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="font-medium">Services used:</span> Document AI for ID fraud detection</li>
              <li><span className="font-medium">Data sent:</span> ID photo per verification request</li>
              <li><span className="font-medium">Retention by Google:</span> None — processed transiently</li>
              <li><span className="font-medium">Data processing agreement:</span> Covered by Google Cloud DPA</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Google Firebase</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="font-medium">Services used:</span> Realtime Database for ephemeral session state</li>
              <li><span className="font-medium">Data stored:</span> Session ID, status, timestamps, HMAC hash — <strong>no PII</strong></li>
              <li><span className="font-medium">Retention:</span> 48 hours maximum, then automatically deleted</li>
              <li><span className="font-medium">Data processing agreement:</span> Covered by Google Cloud DPA</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6 */}
      <section id="zero-knowledge" className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Zero-knowledge credential design</h2>
        <p className="text-gray-700 mb-4">
          Once your credential is issued, Cardless ID does not need to know anything about you
          to verify your age. The verification flow works as follows:
        </p>
        <ol className="list-decimal list-inside space-y-3 text-gray-700 mb-4">
          <li>
            A website or service presents a QR code asking: <em>"Is this person born before [date]?"</em>
          </li>
          <li>
            Your mobile wallet reads the QR code and evaluates the question locally against
            your stored credential.
          </li>
          <li>
            Your wallet responds with <strong>true</strong> or <strong>false</strong> plus your
            wallet address — nothing else.
          </li>
          <li>
            The website verifies the response against the Algorand blockchain. No PII is
            transmitted at any point.
          </li>
        </ol>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>What this means in practice:</strong> A site that checks your age using
          Cardless ID learns only that you hold a valid credential and were born before the
          specified date. It does not learn your name, exact date of birth, address, or any
          other identity information.
        </div>
      </section>

      {/* 7 */}
      <section id="user-rights" className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your rights and how to exercise them</h2>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Deletion of session data</h3>
            <p className="text-sm text-gray-700">
              Verification session records are automatically deleted within 48 hours. If you
              would like earlier deletion, contact us at{" "}
              <a href="mailto:me@djscruggs.com" className="text-blue-600 underline">
                me@djscruggs.com
              </a>{" "}
              with your session ID (shown on your receipt screen after verification).
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">On-chain credential</h3>
            <p className="text-sm text-gray-700">
              The Algorand blockchain is immutable — once issued, the credential NFT cannot be
              deleted. However, it contains no PII. You can abandon the associated wallet at any
              time, and the on-chain record becomes effectively orphaned.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Photos and identity fields</h3>
            <p className="text-sm text-gray-700">
              Photos are deleted immediately after processing and are not accessible after the
              verification session ends. Extracted identity fields exist only transiently in
              session state and are deleted with the session.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
            <p className="text-sm text-gray-700">
              For any privacy questions or requests:{" "}
              <a href="mailto:me@djscruggs.com" className="text-blue-600 underline">
                me@djscruggs.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* 8 */}
      <section id="geographic-scope" className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Geographic scope</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h3 className="font-semibold text-amber-900 mb-2">US users only (currently)</h3>
          <p className="text-amber-800 text-sm mb-3">
            Cardless ID currently supports US-issued identity documents only. Users in the
            EU and EEA are not able to use the verification service at this time.
          </p>
          <p className="text-amber-800 text-sm">
            This is a deliberate scoping decision while we focus on the US market. See the{" "}
            <a
              href="https://github.com/djscruggs/cardlessid/blob/main/docs/NON_US_DEPLOYMENT.md"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              non-US deployment guide
            </a>{" "}
            for details on what would be required to extend support to other jurisdictions.
          </p>
        </div>
      </section>

      {/* Footer nav */}
      <div className="border-t border-gray-200 pt-6 mt-8">
        <Link to="/docs" className="text-blue-600 hover:text-blue-800">
          ← Back to Documentation
        </Link>
      </div>
    </>
  );
}
