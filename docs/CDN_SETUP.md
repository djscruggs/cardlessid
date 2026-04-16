# CDN Setup for `cdn.cardlessid.org`

This documents how to serve the browser SDK via `cdn.cardlessid.org` using Cloudflare as a proxy in front of jsDelivr.

## Why this setup

- **jsDelivr** serves files directly from public GitHub repos — free, no account needed, global CDN
- **Cloudflare** sits in front and rewrites the path, so the public URL (`cdn.cardlessid.org/...`) is stable and independent of the underlying CDN
- **Namecheap** holds the domain registration; nameservers are delegated to Cloudflare

## Prerequisites

- Domain registered at Namecheap
- Cloudflare account (free tier is sufficient)
- Vercel continues to serve the main app — no Vercel changes needed

## Step 1 — Add site to Cloudflare

1. Log in to [cloudflare.com](https://cloudflare.com) and click **Add a Site**
2. Enter `cardlessid.org` and select the **Free** plan
3. Cloudflare scans existing DNS records — verify it found the Vercel records (`A` or `CNAME` for `@` and `www`)
4. Copy the two Cloudflare nameservers shown (e.g. `aria.ns.cloudflare.com`, `bob.ns.cloudflare.com`)

## Step 2 — Update nameservers in Namecheap

1. Log in to Namecheap → **Domain List** → **Manage** for `cardlessid.org`
2. Under **Nameservers**, select **Custom DNS**
3. Enter the two Cloudflare nameservers from Step 1
4. Save — propagation typically takes under an hour with Cloudflare

## Step 3 — Add `cdn` CNAME in Cloudflare

In Cloudflare DNS for `cardlessid.org`, add:

| Type  | Name | Target            | Proxy status |
|-------|------|-------------------|--------------|
| CNAME | cdn  | cdn.jsdelivr.net  | Proxied (orange cloud) |

The proxy must be **enabled** — this is what allows path rewriting in Step 4.

## Step 4 — Add URL rewrite rule

In Cloudflare: **Rules → Transform Rules → Rewrite URL → Create rule**

- **Rule name:** `CDN path rewrite`
- **When incoming requests match:** `hostname eq cdn.cardlessid.org`
- **Path → Rewrite to (static):**

```
/gh/djscruggs/cardlessid@main/sdk/browser/dist/iife/cardlessid-verify.js
```

This maps:
```
cdn.cardlessid.org/verify/latest/cardlessid-verify.js
  → cdn.jsdelivr.net/gh/djscruggs/cardlessid@main/sdk/browser/dist/iife/cardlessid-verify.js
```

## Vercel stays the same

Cloudflare will proxy `cardlessid.org` and `www.cardlessid.org` to Vercel using the CNAME/A records it scanned in Step 1. No changes needed in Vercel.

## Testing

Once propagated, the SDK should be available at:

```
https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js
```

To verify:
```bash
curl -I https://cdn.cardlessid.org/verify/latest/cardlessid-verify.js
# Expect: HTTP/2 200, content-type: application/javascript
```

## Pinning to a specific version

For production, prefer pinning to a git tag rather than `@main`:

```
/gh/djscruggs/cardlessid@v1.0.0/sdk/browser/dist/iife/cardlessid-verify.js
```

Update the Cloudflare rewrite rule when cutting a new release.
