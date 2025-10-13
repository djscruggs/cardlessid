# CardlessID Age Verification - Express.js Example

A simple, complete example of integrating CardlessID age verification into an Express.js application.

## Features

- ✅ Create age verification challenges
- ✅ Display QR code for scanning
- ✅ Real-time status polling
- ✅ Session management
- ✅ Complete UI flow

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Your API Key

```bash
export CARDLESSID_API_KEY=your_api_key_here
```

For local development against localhost:

```bash
export CARDLESSID_URL=http://localhost:5173
```

### 3. Run the Server

```bash
npm start
```

Or with auto-reload:

```bash
npm run dev
```

### 4. Open in Browser

Navigate to: http://localhost:3000

## How It Works

### Backend Flow

1. **Create Challenge** - POST `/api/verify/create`
   - Calls CardlessID API to create a verification challenge
   - Stores session with challenge ID
   - Returns QR code URL to frontend

2. **Check Status** - GET `/api/verify/status/:sessionId`
   - Polls CardlessID API for challenge status
   - Updates session with result
   - Returns verification status

3. **Webhook (Optional)** - POST `/api/verify/webhook`
   - Receives instant notification when verification completes
   - More efficient than polling

### Frontend Flow

1. User clicks "Start Verification"
2. Displays QR code from backend
3. Polls status endpoint every 2 seconds
4. Shows result when completed

## Security Notes

This example uses in-memory storage for simplicity. In production:

- ✅ Use Redis or database for session storage
- ✅ Add rate limiting to prevent abuse
- ✅ Implement CSRF protection
- ✅ Use HTTPS in production
- ✅ Validate all inputs
- ✅ Add authentication/authorization

## Project Structure

```
.
├── index.js          # Main server file
├── package.json      # Dependencies
└── README.md         # This file
```

## Environment Variables

| Variable             | Description             | Default                  |
| -------------------- | ----------------------- | ------------------------ |
| `CARDLESSID_API_KEY` | Your API key (required) | -                        |
| `CARDLESSID_URL`     | API base URL            | `https://cardlessid.com` |
| `PORT`               | Server port             | `3000`                   |

## API Endpoints

### POST /api/verify/create

Create a new verification challenge.

**Request:**

```json
{
  "minAge": 21
}
```

**Response:**

```json
{
  "sessionId": "1234567890",
  "qrCodeUrl": "https://cardlessid.com/app/age-verify?challenge=..."
}
```

### GET /api/verify/status/:sessionId

Check verification status.

**Response:**

```json
{
  "status": "approved",
  "verified": true,
  "walletAddress": "ALGORAND_ADDRESS..."
}
```

## Customization

### Change Minimum Age

Edit the `minAge` parameter in the frontend:

```javascript
body: JSON.stringify({ minAge: 18 }); // Change to your requirement
```

### Add Webhook

Set `callbackUrl` when creating challenge:

```javascript
const challenge = await verifier.createChallenge({
  minAge: 21,
  callbackUrl: "https://yourapp.com/api/verify/webhook",
});
```

### Style the UI

The HTML includes inline CSS. Extract to a separate file or use a framework like React/Vue.

## Troubleshooting

**"Invalid API key" error:**

- Make sure `CARDLESSID_API_KEY` is set correctly
- Contact Cardless ID support to obtain an API key

**QR code doesn't load:**

- Check that `CARDLESSID_URL` points to correct server
- Verify network connectivity
- Check browser console for errors

**Verification never completes:**

- Ensure wallet app is properly installed
- Check that challenge hasn't expired (10 minute limit)
- Verify polling is working in browser console

## Next Steps

- Add user authentication
- Store verification results in database
- Implement proper session management
- Add webhook handler for instant notifications
- Deploy to production with HTTPS

## License

MIT
