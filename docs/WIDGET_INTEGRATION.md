# Widget Mode Integration

CardlessID supports iframe embedding for third-party websites to integrate age verification and identity verification.

## Overview

The widget mode allows external applications to embed CardlessID verification flows in an iframe with PostMessage communication for secure, privacy-preserving verification.

## Widget Modes

### 1. Age Verification Mode

Users verify they meet an age requirement without revealing their birthdate.

**URL Pattern:**
```
https://cardlessid.org/app/verify?widget=true&mode=age-verify&minAge=21
```

**Events:**
- `WidgetLoaded` - Widget iframe loaded
- `AgeVerified` - User passed age check
- `AgeRejected` - User failed age check
- `WidgetClosed` - User closed widget (X button or Escape key)

### 2. Identity Verification Mode

Users complete full identity verification and receive a credential.

**URL Pattern:**
```
https://cardlessid.org/app/verify?widget=true&mode=verify&wallet=ALGORAND_ADDRESS&apiKey=YOUR_API_KEY
```

**Events:**
- `WidgetLoaded` - Widget iframe loaded
- `VerificationStarted` - Verification process started
- `VerificationCompleted` - Credential issued (includes credential data)
- `VerificationFailed` - Verification failed
- `VerificationCancelled` - User cancelled
- `WidgetClosed` - User closed widget (X button or Escape key)

## API Key Behavior

### Without API Key (Demo Mode)
- ✅ Creates W3C Verifiable Credential
- ✅ Uses testnet
- ❌ No NFT created on blockchain
- ✅ Returns credential in demo format
- ✅ Perfect for testing integration

### With API Key (Production Mode)
- ✅ Creates W3C Verifiable Credential
- ✅ Uses mainnet (or testnet if configured)
- ✅ Creates NFT on Algorand blockchain
- ✅ Returns full credential with asset ID
- ✅ Rate-limited per API key

## PostMessage API

### Outgoing Messages (CardlessID → Parent)

```typescript
// Widget loaded and ready
{
  type: 'WidgetLoaded'
}

// Age verification result
{
  type: 'AgeVerified',
  payload: {
    verified: true,
    minAge: 21,
    timestamp: '2025-10-29T12:00:00Z'
  }
}

// Identity verification complete
{
  type: 'VerificationCompleted',
  payload: {
    sessionId: 'session_xxx',
    verificationToken: 'token_xxx',
    verified: true,
    credentialId: 'urn:uuid:xxx',
    assetId: '12345678',  // Only if NFT created
    credential: { /* W3C credential */ },
    personalData: {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1990-01-01',
      // ...
    }
  }
}

// Verification failed
{
  type: 'VerificationFailed'
}

// User closed widget
{
  type: 'WidgetClosed'
}
```

### Security

All PostMessage communications validate origin:
- Widget validates parent origin matches allowed list
- Parent should validate messages come from `cardlessid.org`

**Example parent-side validation:**
```javascript
window.addEventListener('message', (event) => {
  // Verify origin
  if (!event.origin.startsWith('https://cardlessid.org')) {
    return;
  }
  
  const { type, payload } = event.data;
  // Handle events...
});
```

## Network Selection

| API Key | Network | NFT Created | Use Case |
|---------|---------|-------------|----------|
| None | testnet | No | Testing, demos, development |
| Valid | mainnet* | Yes | Production, real credentials |

*Network can be configured via `VITE_ALGORAND_NETWORK` environment variable

## Credential Display

The widget shows credentials in two formats:

### Table View (Default)
Clean, readable table showing:
- First Name, Middle Name, Last Name
- Birth Date
- ID Type (Government ID, Passport, Driver's License)
- Government ID Number
- State
- Credential ID
- NFT Asset ID (if created)
- Network (mainnet/testnet)

### JSON View
Complete raw credential data:
- W3C Verifiable Credential structure
- Personal data object
- Blockchain metadata
- Verification quality metrics

**Toggle:** Click "View JSON" button to switch between views

## URL Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `widget` | Yes | Enable widget mode | `true` |
| `mode` | Yes | Verification type | `age-verify` or `verify` |
| `minAge` | Conditional | Required age (age-verify mode) | `21` |
| `wallet` | Conditional | Algorand address (verify mode) | `ALGORAND_ADDRESS` |
| `apiKey` | No | API key for production | `sk_live_xxx` |
| `color` | No | Theme color (hex) | `%23FF6B6B` |
| `session` | No | Resume session ID | `session_xxx` |

## Example Integration

See the [@cardlessid/web-widget](https://github.com/djscruggs/cardlessid-web-widget) package for a simple JavaScript wrapper that handles iframe creation and PostMessage communication.

```typescript
import { CardlessIDWidget } from '@cardlessid/web-widget';

const widget = new CardlessIDWidget({
  mode: 'verification',
  walletAddress: 'ALGORAND_ADDRESS',
  clientId: 'YOUR_API_KEY'  // Optional - omit for demo mode
});

widget.on('VerificationCompleted', (result) => {
  console.log('Credential:', result.credential);
  console.log('Asset ID:', result.assetId);
});

widget.start();
```

## CORS Configuration

Widget mode requires proper CORS headers. The CardlessID server automatically:
- Validates origin against whitelist
- Sets appropriate CORS headers for allowed origins
- Blocks unauthorized origins

To allow your origin, it must be configured in the server's `ALLOWED_MOBILE_ORIGIN` environment variable.

## Testing

### Local Testing

```html
<!DOCTYPE html>
<html>
<body>
  <button id="start">Verify Age</button>
  <div id="result"></div>
  
  <script>
    const button = document.getElementById('start');
    const result = document.getElementById('result');
    
    button.addEventListener('click', () => {
      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = 'http://localhost:5173/app/verify?widget=true&mode=age-verify&minAge=21';
      iframe.style.cssText = 'width:100%; height:600px; border:1px solid #ccc;';
      document.body.appendChild(iframe);
      
      // Listen for messages
      window.addEventListener('message', (event) => {
        if (event.data.type === 'AgeVerified') {
          result.textContent = '✅ Age Verified!';
          iframe.remove();
        }
      });
    });
  </script>
</body>
</html>
```

## Production Checklist

- [ ] Obtain API key from https://cardlessid.org/contact
- [ ] Configure CORS origin in server
- [ ] Test demo mode (no API key)
- [ ] Test production mode (with API key)
- [ ] Verify PostMessage events
- [ ] Handle all error cases
- [ ] Test on mobile devices
- [ ] Verify NFT creation on blockchain

## User Controls

### Close Widget

Users can close the widget in three ways:
1. **X button** - Top right corner of widget
2. **Escape key** - Press Esc to close
3. **Cancel buttons** - During verification flow

All methods trigger the `WidgetClosed` event.

## Limitations

- Tokens expire after 10 minutes
- Single-use verification sessions
- Camera access required on user device
- HTTPS required in production
- Iframe must be > 400px wide for optimal UX

## Support

For widget integration support:
- GitHub Issues: https://github.com/djscruggs/cardlessid/issues
- Widget Package: https://github.com/djscruggs/cardlessid-web-widget
- Contact: https://cardlessid.org/contact
