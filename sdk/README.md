# CardlessID Integrator SDK

Secure, privacy-preserving age verification for your applications.

## 📦 What's Included

- **Node.js SDK** - Easy-to-use JavaScript/TypeScript library
- **REST API** - Direct HTTP API access
- **Documentation** - Complete integration guide
- **Examples** - Working sample applications

## 🚀 Quick Start

### 1. Install SDK

```bash
npm install @cardlessid/verifier
```

### 2. Get API Key

Contact CardlessID to receive your API key.

### 3. Start Verifying

```javascript
const CardlessID = require("@cardlessid/verifier");

const verifier = new CardlessID({
  apiKey: process.env.CARDLESSID_API_KEY,
});

// Create verification challenge
const challenge = await verifier.createChallenge({ minAge: 21 });

// Show QR code to user
console.log("Scan:", challenge.qrCodeUrl);

// Check result
const result = await verifier.pollChallenge(challenge.challengeId);

if (result.verified) {
  console.log("✅ User is 21+");
}
```

## 📖 Documentation

- **[Integration Guide](./INTEGRATION_GUIDE.md)** - Complete setup and usage guide
- **[API Reference](./node/cardlessid-verifier.d.ts)** - TypeScript type definitions
- **[Example App](./examples/simple-express/)** - Working Express.js example

## 🔒 Security Model

CardlessID uses a **challenge-response flow** that prevents tampering:

1. Your backend creates a challenge with required age
2. User scans QR code with their wallet
3. Wallet verifies age and responds
4. Your backend confirms the result

**Security features:**

- ✅ Single-use challenges
- ✅ 10-minute expiration
- ✅ Cryptographically signed
- ✅ No PII shared (only true/false)
- ✅ Blockchain-backed credentials

## 🏗️ Architecture

```
Your App         CardlessID        User's Wallet
   |                 |                    |
   |-- Create ------>|                    |
   |                 |                    |
   |<-- Challenge ---|                    |
   |                 |                    |
   | Show QR         |                    |
   |=================================>    |
   |                 |                    |
   |                 |<--- Verify --------|
   |                 |                    |
   |                 |--- Response ------>|
   |                 |                    |
   |-- Poll -------->|                    |
   |<-- Result ------|                    |
```

## 📁 Directory Structure

```
sdk/
├── README.md                    # This file
├── INTEGRATION_GUIDE.md         # Complete integration docs
├── node/                        # Node.js SDK
│   ├── cardlessid-verifier.js   # Main SDK file
│   ├── cardlessid-verifier.d.ts # TypeScript definitions
│   └── package.json             # Package metadata
└── examples/                    # Example integrations
    └── simple-express/          # Express.js example
        ├── index.js             # Server code
        ├── package.json         # Dependencies
        └── README.md            # Setup guide
```

## 🎯 Use Cases

- **E-commerce** - Age-restricted product sales
- **Content Platforms** - Age-gated content access
- **Gaming** - Age verification for online games
- **Events** - Ticket sales for 18+/21+ events
- **Financial Services** - Compliance requirements
- **Healthcare** - Age verification for services

## 🌟 Features

| Feature               | Description                                   |
| --------------------- | --------------------------------------------- |
| **Privacy-First**     | Only returns yes/no, never reveals actual age |
| **Blockchain-Backed** | Credentials stored on Algorand blockchain     |
| **Zero-Knowledge**    | No personal data shared with your app         |
| **Fast**              | Verification completes in seconds             |
| **Secure**            | Challenge-response prevents tampering         |
| **Easy Integration**  | Simple SDK, clear documentation               |

## 🔧 API Endpoints

### Create Challenge

```
POST /api/integrator/challenge/create
```

### Verify Challenge

```
GET /api/integrator/challenge/verify/:challengeId
```

See [Integration Guide](./INTEGRATION_GUIDE.md) for full API documentation.

## 📱 Client Libraries

- ✅ Node.js (available now)
- 🚧 Python (coming soon)
- 🚧 Ruby (coming soon)
- 🚧 PHP (coming soon)
- 🚧 Go (coming soon)

## 💡 Example Integration

```javascript
// Express.js route
app.post("/verify-age", async (req, res) => {
  const challenge = await verifier.createChallenge({
    minAge: 21,
    callbackUrl: "https://yourapp.com/webhook",
  });

  res.json({ qrCodeUrl: challenge.qrCodeUrl });
});

app.get("/verify-status/:id", async (req, res) => {
  const result = await verifier.verifyChallenge(req.params.id);
  res.json({ verified: result.verified });
});
```

## 🤝 Support

- **Documentation**: [Integration Guide](./INTEGRATION_GUIDE.md)
- **Examples**: See [examples/](./examples/) directory
- **Issues**: https://github.com/djscruggs/cardlessid/issues
- **Email**: me@djscruggs.com

## 📄 License

MIT License - see LICENSE file for details

## 🚦 Getting Started

1. Read the [Integration Guide](./INTEGRATION_GUIDE.md)
2. Check out the [Express example](./examples/simple-express/)
3. Get your API key
4. Start building!

---

**Built with ❤️ by the CardlessID team**
