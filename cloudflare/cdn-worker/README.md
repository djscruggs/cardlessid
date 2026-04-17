# cardlessid-cdn-worker

Cloudflare Worker that serves the Cardless ID browser SDK from `cdn.cardlessid.org`.

Requests are proxied to jsDelivr, which pulls directly from the `main` branch of this repo.

## Served files

| URL | Source |
|-----|--------|
| `https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js` | `sdk/browser/dist/iife/cardlessid-verify.js` |
| `https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js.map` | `sdk/browser/dist/iife/cardlessid-verify.js.map` |

## Cloudflare setup

- DNS: `cdn CNAME cdn.jsdelivr.net` — set to **Proxied (orange cloud)**
- Worker route: `cdn.cardlessid.org/*` bound to this Worker
- No Transform Rules on this hostname (they conflict with the Worker)

## Deployment

```bash
cd cloudflare/cdn-worker
npm install
npx wrangler login   # first time only
npx wrangler deploy
```

## Updating the SDK

Push changes to `sdk/browser/dist/iife/` on `main`. jsDelivr caches for up to 24 hours — to bust the cache immediately:

```
https://purge.jsdelivr.net/gh/djscruggs/cardlessid@main/sdk/browser/dist/iife/cardlessid-verify.js
```
