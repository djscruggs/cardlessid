# CardlessID Web Widget Package - Implementation Plan

Based on analysis of the Blockpass Web Widget, here's how to create a similar package for CardlessID.

## 1. Project Structure

Create a separate repository (NOT in this repo) with a monorepo structure:

```
cardlessid-web-widget/
├── packages/
│   └── web-widget/              # Core widget package
│       ├── src/
│       │   ├── index.ts         # Main export
│       │   ├── widget.ts        # Widget implementation
│       │   └── types.ts         # TypeScript types
│       ├── tests/               # Unit tests
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── examples/
│   ├── react-example/           # React integration example
│   ├── vanilla-js-example/      # Plain JS example
│   └── nextjs-example/          # Next.js example
├── package.json                 # Workspace root
├── tsconfig.base.json
├── README.md
└── LICENSE
```

## 2. Core Widget Implementation

### Package Metadata (`packages/web-widget/package.json`)

```json
{
  "name": "@cardlessid/web-widget",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "check": "tsc --noEmit",
    "build": "npm run check && tsc",
    "test": "vitest",
    "pack": "npm run build && npm pack"
  },
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5",
    "vitest": "^1"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### Widget API Design (`packages/web-widget/src/widget.ts`)

```typescript
// Configuration options
export interface CardlessIDWidgetConfig {
  // Required
  clientId?: string;              // API key for authentication
  mode: 'verification' | 'age-check';
  
  // Age verification specific
  minAge?: number;                // Required for age-check mode
  
  // Identity verification specific
  walletAddress?: string;         // Algorand wallet for credential
  
  // Optional customization
  url?: string;                   // Custom CardlessID instance URL
  theme?: {
    primaryColor?: string;
    borderRadius?: string;
  };
  
  // Session management
  sessionId?: string;             // Resume existing session
}

// Event types
export type WidgetEvent =
  | 'VerificationStarted'
  | 'VerificationCompleted'
  | 'VerificationFailed'
  | 'VerificationCancelled'
  | 'WidgetLoaded'
  | 'WidgetClosed'
  | 'AgeVerified'
  | 'AgeRejected';

// Verification result data
export interface VerificationResult {
  sessionId: string;
  verificationToken?: string;     // For credential issuance
  verified: boolean;
  credentialId?: string;          // If credential was issued
  assetId?: string;               // NFT asset ID on Algorand
}

export interface AgeVerificationResult {
  verified: boolean;              // true/false for age requirement
  minAge: number;
  timestamp: string;
}

// Event callbacks
export type WidgetCallback = () => void;
export type VerificationCallback = (result: VerificationResult) => void;
export type AgeVerificationCallback = (result: AgeVerificationResult) => void;

type WidgetEventMap = {
  VerificationStarted: WidgetCallback;
  VerificationCompleted: VerificationCallback;
  VerificationFailed: WidgetCallback;
  VerificationCancelled: WidgetCallback;
  WidgetLoaded: WidgetCallback;
  WidgetClosed: WidgetCallback;
  AgeVerified: AgeVerificationCallback;
  AgeRejected: WidgetCallback;
};

export class CardlessIDWidget {
  private config: CardlessIDWidgetConfig;
  private container: HTMLDivElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private callbacks: Map<WidgetEvent, Function> = new Map();
  private iframeUrl: string;
  
  constructor(config: CardlessIDWidgetConfig) {
    this.config = config;
    this.validateConfig();
    this.iframeUrl = this.buildIframeUrl();
  }
  
  // Start the verification flow
  start(): void {
    this.createIframe();
    this.attachEventListeners();
  }
  
  // Close the widget
  close(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    window.removeEventListener('message', this.handleMessage);
  }
  
  // Register event callbacks
  on<T extends WidgetEvent>(event: T, callback: WidgetEventMap[T]): void {
    this.callbacks.set(event, callback);
  }
  
  // Unregister event callbacks
  off(event: WidgetEvent): void {
    this.callbacks.delete(event);
  }
  
  private validateConfig(): void {
    if (this.config.mode === 'age-check' && !this.config.minAge) {
      throw new Error('minAge is required for age-check mode');
    }
    if (this.config.mode === 'verification' && !this.config.walletAddress) {
      throw new Error('walletAddress is required for verification mode');
    }
  }
  
  private buildIframeUrl(): string {
    const baseUrl = this.config.url || 'https://cardlessid.org';
    const params = new URLSearchParams();
    
    if (this.config.mode === 'age-check') {
      params.set('mode', 'age-verify');
      params.set('minAge', this.config.minAge!.toString());
    } else {
      params.set('mode', 'verify');
      params.set('wallet', this.config.walletAddress!);
    }
    
    if (this.config.clientId) {
      params.set('apiKey', this.config.clientId);
    }
    
    if (this.config.sessionId) {
      params.set('session', this.config.sessionId);
    }
    
    if (this.config.theme?.primaryColor) {
      params.set('color', this.config.theme.primaryColor);
    }
    
    return `${baseUrl}/app/verify?${params.toString()}`;
  }
  
  private createIframe(): void {
    // Create overlay container
    this.container = document.createElement('div');
    this.container.setAttribute('id', 'cardlessid-widget-overlay');
    this.container.setAttribute('style', `
      z-index: 99999999;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      position: fixed;
      top: 0;
      left: 0;
      background: rgba(0, 0, 0, 0.5);
    `);
    
    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.setAttribute('src', this.iframeUrl);
    this.iframe.setAttribute('id', 'cardlessid-widget');
    this.iframe.setAttribute('allow', 'camera; microphone');
    this.iframe.setAttribute('allowfullscreen', 'true');
    this.iframe.setAttribute('style', `
      width: 100%;
      height: 100%;
      max-width: 600px;
      max-height: 90vh;
      margin: 5vh auto;
      border: none;
      border-radius: 12px;
      background: white;
      display: block;
    `);
    
    this.container.appendChild(this.iframe);
    document.body.appendChild(this.container);
    
    // Focus on iframe
    this.iframe.focus();
  }
  
  private attachEventListeners(): void {
    window.addEventListener('message', this.handleMessage);
  }
  
  private handleMessage = (event: MessageEvent) => {
    // Verify origin
    const allowedOrigin = this.config.url || 'https://cardlessid.org';
    if (!event.origin.startsWith(allowedOrigin)) {
      console.warn('CardlessID: Ignoring message from unauthorized origin:', event.origin);
      return;
    }
    
    const { type, payload } = event.data;
    
    switch (type) {
      case 'WidgetLoaded':
        this.triggerCallback('WidgetLoaded');
        break;
        
      case 'VerificationStarted':
        this.triggerCallback('VerificationStarted');
        break;
        
      case 'VerificationCompleted':
        this.triggerCallback('VerificationCompleted', payload);
        break;
        
      case 'VerificationFailed':
        this.triggerCallback('VerificationFailed');
        break;
        
      case 'VerificationCancelled':
        this.close();
        this.triggerCallback('VerificationCancelled');
        break;
        
      case 'WidgetClosed':
        this.close();
        this.triggerCallback('WidgetClosed');
        break;
        
      case 'AgeVerified':
        this.triggerCallback('AgeVerified', payload);
        break;
        
      case 'AgeRejected':
        this.close();
        this.triggerCallback('AgeRejected');
        break;
    }
  };
  
  private triggerCallback(event: WidgetEvent, data?: any): void {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(data);
    }
  }
}
```

## 3. Integration with CardlessID Server

The widget needs the CardlessID server to support iframe embedding. Add these endpoints/features:

### A. Create Widget-Friendly Routes

In `app/routes/app/verify.tsx`, add support for widget mode:

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const isWidget = url.searchParams.get('mode') !== null;
  const minAge = url.searchParams.get('minAge');
  const walletAddress = url.searchParams.get('wallet');
  
  return json({
    isWidget,
    widgetMode: url.searchParams.get('mode'),
    minAge: minAge ? parseInt(minAge) : null,
    walletAddress,
    theme: {
      primaryColor: url.searchParams.get('color') || '#3B82F6'
    }
  });
}
```

### B. Add PostMessage Communication

In the verification flow components, send messages to parent window:

```typescript
// In app/routes/app/verify.tsx

useEffect(() => {
  if (!isWidget) return;
  
  // Notify parent that widget loaded
  window.parent.postMessage({
    type: 'WidgetLoaded'
  }, '*');
}, [isWidget]);

function handleVerificationComplete(result: VerificationResult) {
  window.parent.postMessage({
    type: 'VerificationCompleted',
    payload: result
  }, '*');
}

function handleCancel() {
  window.parent.postMessage({
    type: 'VerificationCancelled'
  }, '*');
}
```

### C. Widget-Optimized UI

Add styles for widget mode:

```typescript
// In verify.tsx
{isWidget && (
  <style>{`
    body {
      overflow: hidden;
    }
    .widget-mode {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }
  `}</style>
)}
```

## 4. Usage Examples

### React Example

```typescript
import { CardlessIDWidget } from '@cardlessid/web-widget';
import { useState, useEffect } from 'react';

function AgeVerification() {
  const [widget, setWidget] = useState<CardlessIDWidget | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  
  useEffect(() => {
    const w = new CardlessIDWidget({
      mode: 'age-check',
      minAge: 21
    });
    
    w.on('AgeVerified', (result) => {
      console.log('Age verified:', result);
      setVerified(true);
      w.close();
    });
    
    w.on('AgeRejected', () => {
      setVerified(false);
    });
    
    w.on('VerificationCancelled', () => {
      console.log('User cancelled');
    });
    
    setWidget(w);
    
    return () => w.close();
  }, []);
  
  return (
    <div>
      <button onClick={() => widget?.start()}>
        Verify Age (21+)
      </button>
      {verified === true && <p>✅ Age verified!</p>}
      {verified === false && <p>❌ Age verification failed</p>}
    </div>
  );
}

function IdentityVerification() {
  const [widget, setWidget] = useState<CardlessIDWidget | null>(null);
  const [credential, setCredential] = useState<any>(null);
  
  useEffect(() => {
    const w = new CardlessIDWidget({
      mode: 'verification',
      walletAddress: 'ALGORAND_ADDRESS_HERE',
      clientId: 'YOUR_API_KEY',
      theme: {
        primaryColor: '#FF6B6B'
      }
    });
    
    w.on('VerificationCompleted', (result) => {
      console.log('Credential issued:', result);
      setCredential(result);
      w.close();
    });
    
    setWidget(w);
    
    return () => w.close();
  }, []);
  
  return (
    <button onClick={() => widget?.start()}>
      Get Verified
    </button>
  );
}
```

### Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>CardlessID Widget Demo</title>
  <script type="module">
    import { CardlessIDWidget } from 'https://unpkg.com/@cardlessid/web-widget';
    
    const widget = new CardlessIDWidget({
      mode: 'age-check',
      minAge: 18
    });
    
    widget.on('AgeVerified', (result) => {
      console.log('Verified!', result);
      document.getElementById('status').textContent = '✅ Age Verified';
      widget.close();
    });
    
    document.getElementById('verify-btn').addEventListener('click', () => {
      widget.start();
    });
  </script>
</head>
<body>
  <button id="verify-btn">Verify Age</button>
  <div id="status"></div>
</body>
</html>
```

## 5. Testing Strategy

### Unit Tests (`packages/web-widget/tests/widget.test.ts`)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CardlessIDWidget } from '../src/widget';

describe('CardlessIDWidget', () => {
  let widget: CardlessIDWidget;
  
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  
  afterEach(() => {
    widget?.close();
  });
  
  it('should throw error if minAge missing in age-check mode', () => {
    expect(() => {
      new CardlessIDWidget({ mode: 'age-check' });
    }).toThrow('minAge is required');
  });
  
  it('should create iframe when started', () => {
    widget = new CardlessIDWidget({
      mode: 'age-check',
      minAge: 21
    });
    
    widget.start();
    
    const iframe = document.querySelector('#cardlessid-widget');
    expect(iframe).toBeTruthy();
    expect(iframe?.tagName).toBe('IFRAME');
  });
  
  it('should build correct URL with parameters', () => {
    widget = new CardlessIDWidget({
      mode: 'age-check',
      minAge: 18,
      theme: { primaryColor: '#FF0000' }
    });
    
    widget.start();
    
    const iframe = document.querySelector('#cardlessid-widget') as HTMLIFrameElement;
    const url = new URL(iframe.src);
    
    expect(url.searchParams.get('minAge')).toBe('18');
    expect(url.searchParams.get('color')).toBe('#FF0000');
  });
});
```

## 6. Distribution Strategy

### NPM Publishing

```bash
# Build the package
cd packages/web-widget
npm run build

# Create tarball
npm pack

# Publish to NPM (requires npm account)
npm publish --access public
```

### CDN Distribution

Set up unpkg.com or jsDelivr to serve the package:

```html
<!-- UMD build for browsers -->
<script src="https://unpkg.com/@cardlessid/web-widget@latest/dist/widget.umd.js"></script>
<script>
  const widget = new CardlessIDWidget.CardlessIDWidget({
    mode: 'age-check',
    minAge: 21
  });
</script>
```

## 7. Documentation

### README.md Structure

```markdown
# @cardlessid/web-widget

Official JavaScript widget for CardlessID age verification and identity credentials.

## Features

- 🎯 Simple iframe-based integration
- 🔐 Privacy-preserving age verification
- 📱 Mobile responsive
- 🎨 Customizable theme
- 📦 TypeScript support
- ⚡ Framework agnostic (React, Vue, Angular, vanilla JS)

## Installation

\`\`\`bash
npm install @cardlessid/web-widget
\`\`\`

## Quick Start

[Usage examples here]

## API Reference

[Complete API documentation]

## Examples

- [React Example](./examples/react-example)
- [Next.js Example](./examples/nextjs-example)
- [Vanilla JS Example](./examples/vanilla-js-example)

## Security

[Security considerations]

## License

MIT
```

## 8. Key Differences from Blockpass

1. **Two modes**: Age verification vs. full identity verification
2. **Algorand integration**: Returns wallet address and asset IDs
3. **Session resumption**: Support for continuing partial verifications
4. **Privacy focus**: Minimal data exposure, zero-knowledge age proofs
5. **Open source**: Unlike Blockpass, this can be fully open source

## 9. Roadmap

### Phase 1 (MVP)
- ✅ Basic widget structure
- ✅ Age verification mode
- ✅ Identity verification mode
- ✅ Event system
- ✅ React example

### Phase 2
- [ ] Mobile SDK (React Native)
- [ ] Advanced theming
- [ ] Multi-language support
- [ ] Analytics integration

### Phase 3
- [ ] Credential presentation (verifier mode)
- [ ] QR code scanning
- [ ] Offline verification support

## 10. Implementation Checklist

**In new repository:**
- [ ] Initialize monorepo with workspaces
- [ ] Create core widget package
- [ ] Implement TypeScript widget class
- [ ] Add PostMessage communication
- [ ] Create React example
- [ ] Create vanilla JS example
- [ ] Write unit tests
- [ ] Create documentation
- [ ] Set up CI/CD for publishing

**In CardlessID server (this repo):**
- [ ] Add widget mode support to /app/verify
- [ ] Add PostMessage events for widget communication
- [ ] Add CORS headers for iframe embedding
- [ ] Add widget-optimized UI mode
- [ ] Test iframe security (origin validation)
- [ ] Document widget integration in API docs

## 11. Security Considerations

1. **Origin validation**: Always verify postMessage origin
2. **HTTPS only**: Enforce HTTPS for widget mode
3. **CSP headers**: Configure Content-Security-Policy for iframe
4. **No sensitive data in URL**: Use POST for credential data
5. **Session timeout**: 10-minute verification token expiration
6. **API key validation**: Server-side authentication required

## Next Steps

1. Create separate git repository: `cardlessid-web-widget`
2. Copy Blockpass structure but adapt for CardlessID use cases
3. Implement widget class with age verification first
4. Add widget mode to CardlessID server
5. Create working React example
6. Test end-to-end flow
7. Publish v1.0.0 to NPM
