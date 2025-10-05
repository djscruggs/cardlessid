# Testing Verification Flow

## Option 1: Web UI (Easiest)

Navigate to `http://localhost:5173/app/mock-verification`

This simulates the entire flow including the provider webhook.

## Option 2: Mock Provider Server (Most Realistic)

Simulates a real provider that sends webhooks asynchronously.

### Setup

1. Start your main server:
   ```bash
   npm run dev
   ```

2. In another terminal, start the mock provider server:
   ```bash
   node scripts/mock-provider-server.cjs
   ```

### Test Flow

```bash
# 1. Start verification session
SESSION=$(curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -d '{"provider": "mock"}' | jq -r '.sessionId')

PROVIDER_SESSION=$(curl -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -d '{"provider": "mock"}' | jq -r '.providerSessionId')

echo "Session ID: $SESSION"
echo "Provider Session ID: $PROVIDER_SESSION"

# 2. Simulate SDK verification (send to mock provider)
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d "{
    \"providerSessionId\": \"$PROVIDER_SESSION\",
    \"identityData\": {
      \"firstName\": \"John\",
      \"lastName\": \"Doe\",
      \"birthDate\": \"1990-01-15\",
      \"governmentId\": \"D1234567\",
      \"idType\": \"government_id\",
      \"state\": \"CA\"
    },
    \"approved\": true
  }"

# 3. Wait 3 seconds for webhook
sleep 3

# 4. Check status
curl http://localhost:5173/api/verification/status/$SESSION | jq

# 5. Issue credential (if approved)
curl -X POST http://localhost:5173/api/credentials \
  -H "Content-Type: application/json" \
  -d "{
    \"verificationSessionId\": \"$SESSION\",
    \"walletAddress\": \"YOUR_ALGORAND_ADDRESS_HERE\"
  }" | jq
```

## Option 3: Direct Webhook Call

For quick testing, call the webhook endpoint directly:

```bash
# 1. Create session
RESPONSE=$(curl -s -X POST http://localhost:5173/api/verification/start \
  -H "Content-Type: application/json" \
  -d '{"provider": "mock"}')

SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')
PROVIDER_SESSION_ID=$(echo $RESPONSE | jq -r '.providerSessionId')

echo "Session: $SESSION_ID"
echo "Provider Session: $PROVIDER_SESSION_ID"

# 2. Send webhook directly (simulates what provider does)
curl -X POST "http://localhost:5173/api/verification/webhook?provider=mock" \
  -H "Content-Type: application/json" \
  -d "{
    \"providerSessionId\": \"$PROVIDER_SESSION_ID\",
    \"status\": \"approved\",
    \"firstName\": \"John\",
    \"lastName\": \"Doe\",
    \"birthDate\": \"1990-01-15\",
    \"governmentId\": \"D1234567\",
    \"idType\": \"government_id\",
    \"state\": \"CA\"
  }" | jq

# 3. Check status
curl http://localhost:5173/api/verification/status/$SESSION_ID | jq
```

## Mobile App Testing

In your React Native app, you would:

```typescript
// 1. Start session
const { sessionId, authToken, providerSessionId } = await fetch(
  'http://localhost:5173/api/verification/start',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'mock' }),
  }
).then(r => r.json());

// 2. Instead of real SDK, call mock provider
await fetch('http://localhost:3001/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    providerSessionId,
    identityData: {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1990-01-15',
      governmentId: 'D1234567',
      idType: 'government_id',
      state: 'CA',
    },
    approved: true,
  }),
});

// 3. Poll for completion (same as production)
let status;
do {
  const response = await fetch(
    `http://localhost:5173/api/verification/status/${sessionId}`
  );
  status = await response.json();
  if (status.status !== 'pending') break;
  await new Promise(r => setTimeout(r, 2000));
} while (true);

// 4. Issue credential if approved
if (status.ready) {
  const credential = await fetch('http://localhost:5173/api/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      verificationSessionId: sessionId,
      walletAddress: yourWalletAddress,
    }),
  }).then(r => r.json());
}
```
