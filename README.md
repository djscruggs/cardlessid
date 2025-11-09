---
{}
---

# Cardless ID

## Table of Contents

- [Documentation](#documentation "Documentation")
- [API Documentation](#api-documentation "API Documentation")
- [Privacy & Data Storage](#privacy--data-storage "Privacy & Data Storage")
- [How to Contribute](#how-to-contribute "How to Contribute")
- [Tech Stack](#tech-stack "Tech Stack")
- [Development Setup](#development-setup "Development Setup")
- [Firebase Setup](#firebase-setup "Firebase Setup")
- [Mobile Client](#mobile-client "Mobile Client")
- [License](#license "License")

## Documentation

- [Deep Linking Guide](docs/DEEP_LINKING.md "Deep Linking Guide")
- [Firebase Admin Setup](docs/FIREBASE-ADMIN-SETUP.md "Firebase Admin Setup")
- [Integrator README](docs/INTEGRATOR_README.md "Integrator README")
- [Mobile Client Testing](docs/MOBILE_CLIENT_TESTING.md "Mobile Client Testing")
- [NFT Credential Client Guide](docs/NFT-CREDENTIAL-CLIENT-GUIDE.md "NFT Credential Client Guide")
- [Algorand README](docs/README-ALGORAND.md "Algorand README")
- [Testing Verification](docs/TESTING_VERIFICATION.md "Testing Verification")
- [Verification API](docs/VERIFICATION_API.md "Verification API")
- [VPN Age Verification Risks](docs/VPN-AGE-VERIFICATION-RISKS.md "VPN Age Verification Risks")
- [Wallet App Guide](docs/WALLET_APP_GUIDE.md "Wallet App Guide")

## API Documentation

This project uses [**Bruno**](https://www.usebruno.com/) for API testing and documentation. Bruno is a fast, open-source API client that stores collections directly in your filesystem.

### Bruno Collections

API test collections and examples are located in the `/bruno` directory:

```
/bruno
  └── Cardless ID API/
      ├── Verification/
      ├── Credentials/
      ├── Age Verification/
      ├── Integrator/
      └── ...
```

### Getting Started with Bruno

1. **Install Bruno** from [usebruno.com](https://www.usebruno.com/)

2. **Open the collection:**
   - Launch Bruno
   - Click "Open Collection"
   - Navigate to the `/bruno` directory in this project

3. **Configure environment variables:**
   - Bruno will use the environment settings from the collection
   - Update the `baseUrl` if needed (default: `http://localhost:5173`)

### OpenAPI Specification

An OpenAPI 3.0.3 specification is available at [`openapi.yaml`](openapi.yaml) in the project root. This spec documents all API endpoints, request/response schemas, and authentication requirements.

**Import to Bruno:**

```bash
# Install Bruno CLI
npm install -g @usebruno/cli

# Import OpenAPI spec
bruno import openapi \
  --source openapi.yaml \
  --output ./bruno \
  --collection-name "Cardless ID API"
```

**Other tools:**
- **Postman**: Import `openapi.yaml` directly
- **Swagger UI**: Host the spec for interactive documentation
- **OpenAPI Generator**: Generate client SDKs in any language

### API Overview

The API provides endpoints for:
- **Identity Verification** - Document upload and verification workflows
- **Credential Issuance** - W3C Verifiable Credentials on Algorand blockchain
- **Age Verification** - QR code-based age challenges
- **Integrator API** - Third-party website integration (requires API key)

For detailed API flows and endpoint documentation, see [@scratchpad/api-flow-summary.md](@scratchpad/api-flow-summary.md).

24 US states and countries including the UK, France and Germany have passed laws requiring adult sites to verify age.

We agree that children should never have access to sexually explicit material. However, we also believe the verification process should be:

1.  Extremely private, and not require any information except birth date
2.  Only necessary to do one time across all _adult_ web sites
3.  Provided by a nonprofit that does not retain or monetize your data
4.  Free for end users and providers alike

We partner with content companies, technology providers, media and regulators to make this possible.

This project is in active development. We're collaborating with partners to integrate existing decentralized identity tools that give end users maximum control of what information is shared. This ensures compatibility with all major blockchain networks.

## Privacy & Data Storage

**Transient Data Model** - Identity data is never stored permanently on our servers:

- **Images**: Government ID and selfie photos are processed and immediately deleted (whether verification passes or fails)
- **Identity Data**: Verified information (name, birth date, etc.) is:
  - Returned once to the client during verification
  - **Not stored** in the session database (only an HMAC hash is kept)
  - Submitted by client during credential creation for hash verification
  - Immediately discarded after credential issuance
- **Hash-Based Verification**: Server keeps only HMAC hashes to verify data integrity without storing sensitive data
- **Session Storage**: Firebase stores only session metadata (status, timestamps) - not identity data
- **Blockchain Storage**: Credentials are issued as NFTs on Algorand with only cryptographic hashes in metadata
- **Zero Knowledge**: Only the credential holder has access to full identity data through their mobile client

**Security Features:**

- HMAC-SHA256 hash verification prevents data tampering
- Signed verification tokens prevent session hijacking
- Timing-safe hash comparison prevents timing attacks
- Server breach cannot expose identity data (not stored)

See [CUSTOM_VERIFICATION.md](./docs/CUSTOM_VERIFICATION.md) for complete security documentation.

## How to Contribute

This is an open-source project, and we welcome all contributions. Whether you're interested in documentation, front-end development, or anything else, we'd love to have you. Reach out to me by email ([me@djscruggs.com](mailto:me@djscruggs.com "me@djscruggs.com")) or on Telegram (@djscruggs) to discuss how you can get involved.

## Tech Stack

This project is built with the following technologies:

- [**React Router, framework version**](https://reactrouter.com/start/modes#framework "React Router, framework version")
- [**TypeScript**](https://www.typescriptlang.org/ "TypeScript")
- [**Tailwind CSS**](https://tailwindcss.com/ "Tailwind CSS")
- [**Firebase**](https://firebase.google.com/ "Firebase")
- [**EmailJS**](https://www.emailjs.com/ "EmailJS")

## Development Setup

### Prerequisites

1.  **Node.js** (v18 or higher)
2.  **Firebase Account** - Create a project at [Firebase Console](https://console.firebase.google.com "Firebase Console")
3.  **Algorand Wallet** - For issuing credentials on testnet/mainnet

### Environment Variables

1.  Copy the example environment file:
    ```bash
    cp env.example .env
    ```
2.  Configure the following variables in `.env`:

    **Security Configuration:**
    - `HMAC_SECRET` - Secret key for data integrity verification (see generation instructions below)

    **Algorand Configuration:**
    - `VITE_APP_WALLET_ADDRESS` - Your Algorand wallet address (issuer address)
    - `VITE_ALGORAND_NETWORK` - Network to use (`testnet` or `mainnet`)
    - `ISSUER_PRIVATE_KEY` - Your Algorand wallet private key

    **⚠️ SECURITY WARNING:** The `ISSUER_PRIVATE_KEY` and `HMAC_SECRET` are sensitive and should NEVER be shared or committed to version control. Keep these secure and never expose them publicly.

    **Firebase Configuration:**
    - `VITE_FIREBASE_API_KEY`
    - `VITE_FIREBASE_AUTH_DOMAIN`
    - `VITE_FIREBASE_PROJECT_ID`
    - `VITE_FIREBASE_STORAGE_BUCKET`
    - `VITE_FIREBASE_MESSAGING_SENDER_ID`
    - `VITE_FIREBASE_APP_ID`
    - `VITE_FIREBASE_MEASUREMENT_ID`

    Get these values from your Firebase project settings (Project Settings → General → Your apps → SDK setup and configuration).

### Generating HMAC_SECRET

The `HMAC_SECRET` is used for cryptographic data integrity verification. It must be a long, random, cryptographically secure string.

**Generate using Node.js:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Generate using OpenSSL:**

```bash
openssl rand -hex 32
```

**Generate using Python:**

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Any of these commands will generate a secure 64-character hexadecimal string. Copy the output and add it to your `.env` file:

```bash
HMAC_SECRET=your_generated_secret_here
```

**Important:**

- Use at least 32 bytes (64 hex characters)
- Generate a truly random value - don't use passwords or predictable patterns
- Keep it secret - never commit to version control
- Use different secrets for development and production environments

3.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Servers

This project uses two servers for development:

**Terminal 1 - Main Server:**

```bash
npm run dev
```

Runs on `http://localhost:5173`

**Terminal 2 - Mock Identity Provider (for testing):**

```bash
node scripts/mock-provider-server.cjs
```

Runs on `http://localhost:3001`

The mock provider server simulates a third-party identity verification service (like iDenfy) for testing the verification flow. See [MOBILE_CLIENT_TESTING.md](docs/MOBILE_CLIENT_TESTING.md "MOBILE_CLIENT_TESTING.md") for complete integration details.

**VS Code Users:** You can run both servers automatically using the task runner:

- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type "Tasks: Run Task"
- Select "Start Both Servers"

### Mobile Client

For a working React Native mobile wallet implementation, see the [**Cardless Mobile**](https://github.com/djscruggs/cardless-mobile "Cardless Mobile") repository (work in progress). It demonstrates:

- Wallet creation and management
- Identity verification flow
- Credential storage and retrieval
- QR code verification

## Firebase Setup

### Database Indexes

For optimal performance, add these indexes to your Firebase Realtime Database:

1.  Go to [Firebase Console](https://console.firebase.google.com "Firebase Console")
2.  Select your project
3.  Navigate to **Realtime Database** → **Rules** tab
4.  Add the following indexes:

```json
{
  "rules": {
    "verifications": {
      ".indexOn": ["compositeHash"]
    },
    "announcements": {
      ".indexOn": ["createdAt"]
    }
  }
}
```

These indexes are critical for:

- **compositeHash**: Efficient duplicate credential detection
- **createdAt**: Fast announcement sorting by date

## Deployment

### Deploying to Vercel

When deploying to serverless platforms like Vercel, you cannot use file-based credentials (`GOOGLE_APPLICATION_CREDENTIALS`). Instead, you must use the JSON string method:

#### Step 1: Prepare Your Credentials

Minify your Google credentials JSON to a single line to avoid issues with newline characters:

```bash
cat google-credentials.json | jq -c .
```

This outputs a single-line JSON string like:

```
{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n..."}
```

#### Step 2: Add to Vercel

**Via Vercel Dashboard:**

1. Go to your project's **Settings** → **Environment Variables**
2. Add a new variable:
   - Name: `GOOGLE_CREDENTIALS_JSON`
   - Value: Paste the entire minified JSON string from Step 1
   - Select which environments (Production, Preview, Development)
3. Click **Save**

**Via Vercel CLI:**

```bash
vercel env add GOOGLE_CREDENTIALS_JSON
```

When prompted, paste the minified JSON string.

#### Step 3: Redeploy

After adding the environment variable, redeploy your application:

- Push a new commit to trigger automatic deployment, or
- Go to **Deployments** tab and click **Redeploy** on the latest deployment

**Important Notes:**

- The minified JSON format prevents warnings about return characters in Vercel
- Your code already supports both `GOOGLE_CREDENTIALS_JSON` (JSON string) and `GOOGLE_APPLICATION_CREDENTIALS` (file path)
- Use `GOOGLE_CREDENTIALS_JSON` for serverless deployments (Vercel, AWS Lambda, etc.)
- Use `GOOGLE_APPLICATION_CREDENTIALS` for local development or traditional servers

See [document-ai.server.ts](app/utils/document-ai.server.ts) for implementation details.

## License

See [LICENSE](LICENSE.md "LICENSE") for details.
