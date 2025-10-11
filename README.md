---
{}
---

# Cardless ID

## Table of Contents

- [Documentation](#documentation "Documentation")
- [Privacy & Data Storage](#privacy--data-storage "Privacy & Data Storage")
- [How to Contribute](#how-to-contribute "How to Contribute")
- [Tech Stack](#tech-stack "Tech Stack")
- [Development Setup](#development-setup "Development Setup")
- [Firebase Setup](#firebase-setup "Firebase Setup")
- [Mobile Client](#mobile-client "Mobile Client")
- [License](#license "License")

## Documentation

- [Deep Linking Guide](docs/DEEP_LINKING.md "Deep Linking Guide")
- [DID Comparison](docs/DID_COMPARISON.md "DID Comparison")
- [Firebase Admin Setup](docs/FIREBASE-ADMIN-SETUP.md "Firebase Admin Setup")
- [Integrator README](docs/INTEGRATOR_README.md "Integrator README")
- [Mobile Client Testing](docs/MOBILE_CLIENT_TESTING.md "Mobile Client Testing")
- [NFT Credential Client Guide](docs/NFT-CREDENTIAL-CLIENT-GUIDE.md "NFT Credential Client Guide")
- [Algorand README](docs/README-ALGORAND.md "Algorand README")
- [Testing Verification](docs/TESTING_VERIFICATION.md "Testing Verification")
- [Verification API](docs/VERIFICATION_API.md "Verification API")
- [VPN Age Verification Risks](docs/VPN-AGE-VERIFICATION-RISKS.md "VPN Age Verification Risks")
- [Wallet App Guide](docs/WALLET_APP_GUIDE.md "Wallet App Guide")

24 US states and countries including the UK, France and Germany have passed laws requiring adult sites to verify age.

We agree that children should never have access to sexually explicit material. However, we also believe the verification process should be:

1.  Extremely private, and not require any information except birth date
2.  Only necessary to do one time across all _adult_ web sites
3.  Provided by a nonprofit that does not retain or monetize your data
4.  Free for end users and providers alike

We partner with content companies, technology providers, media and regulators to make this possible.

This project is in active development. We're collaborating with partners to integrate existing decentralized identity tools that give end users maximum control of what information is shared. This ensures compatibility with all major blockchain networks.

## Privacy & Data Storage

- **Images and personal data are transient**: During the initial verification, government ID and selfie images are submitted to the verification provider, then immmediately deleted whether the verification passes, fails or stops mid-process
- **Blockchain Storage**: Credentials are issued as an NFT on the Algorand blockchain with verification data hashed and stored in the metadata
- **Duplicate Detection**: Prevents duplicate credentials by checking transaction history using a composite hash (full name + birth date)
- **Zero Knowledge**: Only the credential holder has access to the full identity data in through their mobile client; the blockchain only contains cryptographic hashes

Firebase is used temporarily during the verification session (typically under 5 minutes) and only stores session state. Once a credential is issued, all session data is marked as consumed and cannot be reused.

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
2.  Configure the following variables in `.env`:**Algorand Configuration:**
    - `VITE_APP_WALLET_ADDRESS` - Your Algorand wallet address (issuer address)
    - `VITE_ALGORAND_NETWORK` - Network to use (`testnet` or `mainnet`)
    - `ISSUER_PRIVATE_KEY` - Your Algorand wallet private key

    **⚠️ SECURITY WARNING:** The `ISSUER_PRIVATE_KEY` is sensitive and should NEVER be shared or committed to version control. Keep this secure and never expose it publicly.**Firebase Configuration:**
    - `VITE_FIREBASE_API_KEY`
    - `VITE_FIREBASE_AUTH_DOMAIN`
    - `VITE_FIREBASE_PROJECT_ID`
    - `VITE_FIREBASE_STORAGE_BUCKET`
    - `VITE_FIREBASE_MESSAGING_SENDER_ID`
    - `VITE_FIREBASE_APP_ID`
    - `VITE_FIREBASE_MEASUREMENT_ID`

    Get these values from your Firebase project settings (Project Settings → General → Your apps → SDK setup and configuration).

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

## License

See [LICENSE](LICENSE.md "LICENSE") for details.
