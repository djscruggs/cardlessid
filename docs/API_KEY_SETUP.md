# API Key Setup Guide (Simplified)

> **Note**: This guide has been simplified. We now use a single API key stored in environment variables instead of a config file system.

## Quick Start (2 Minutes)

### 1. Generate API Key

```bash
openssl rand -hex 32
```

**Your key**: `ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58`

### 2. Add to `.env` File

```bash
# Mobile Client API Key
MOBILE_API_KEY=ead6b3d0327886a731c82c96281719d8a06bd5cb82e0c609a95b62c3b9e01a58
```

### 3. Restart Server

```bash
npm run dev
```

Done! ✅

## That's It!

No config files, no complex setup. Just one environment variable.

See [MOBILE_API_KEY_SIMPLE.md](./MOBILE_API_KEY_SIMPLE.md) for complete documentation.
