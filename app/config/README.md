# Configuration Directory

This directory contains configuration files for the Cardless ID application.

## Files

### api-keys.example.ts

Example template for API key configuration. This file is committed to version control and serves as documentation for the API key system.

**Do not modify this file.** Copy it to create your actual configuration.

### api-keys.config.ts (not committed)

Your actual API key configuration with real keys and issuer credentials.

**This file is gitignored** and should never be committed to version control.

## Setup

To set up API keys for mobile client integrations:

1. Copy the example file:

   ```bash
   cp api-keys.example.ts api-keys.config.ts
   ```

2. Edit `api-keys.config.ts` and add your API keys

3. See detailed setup instructions: `docs/API_KEY_SETUP.md`

## Security

- **Never commit** `api-keys.config.ts` to version control
- **Keep backups** of your API keys configuration (encrypted)
- **Rotate keys** if they are compromised
- API keys contain sensitive issuer private keys that can sign credentials

## Mobile Client Integration

For mobile developers who want to integrate Cardless ID:

- See: `docs/MOBILE_CLIENT_INTEGRATION.md`
- Contact us: https://cardlessid.org/contact
