# Deploying Outside the United States

## Current Scope

Cardless ID is designed and tested for **US users with US-issued identity documents** (driver's licenses, passports, state IDs). The verification pipeline — AWS Textract ID extraction and AWS Rekognition face comparison — is optimised for AAMVA-format US documents.

**Non-US deployments are not officially supported.** This document explains why and what your options are if you want to run Cardless ID for non-US users.

---

## Why Non-US Deployments Are Restricted

### 1. Document support

AWS Textract's `AnalyzeID` API supports a defined set of document types, weighted toward US formats. Non-US government IDs (EU national ID cards, non-US passports in non-Latin scripts, etc.) may yield poor or incomplete extraction results.

### 2. GDPR and EU/EEA data protection law

Identity verification involves collecting **special category biometric data** under GDPR Article 9 (facial images used for 1:1 matching). Serving EU/EEA residents triggers significant legal obligations:

| Requirement | Status for this codebase |
|-------------|--------------------------|
| Explicit consent or alternative legal basis (Art. 9) | Not implemented |
| Data subject rights (access, erasure, portability) (Art. 15–22) | Not implemented |
| Data Protection Impact Assessment (DPIA) | Not completed for production |
| Records of processing activities (Art. 30) | Not implemented |
| Breach notification within 72 hours (Art. 33) | Not implemented |
| Privacy policy in user's language | Not implemented |

The Yoti Ltd enforcement action (Spain AEPD, March 2026, €950,000 fine) confirmed that biometric identity verification services are held to an extremely high standard under GDPR. Operating without the above in place creates serious regulatory exposure.

### 3. International data transfers

Even if the above were addressed, sending EU residents' biometric data to AWS Rekognition (a US-based service) requires a documented lawful transfer mechanism under GDPR Articles 44–49. AWS participates in the EU–US Data Privacy Framework, which provides a valid basis — but this must be disclosed in a DPIA and privacy policy, and EU-region AWS endpoints must be used.

---

## Geo-blocking (Current Mitigation)

The codebase includes (or will include — see Linear issue DJS-16) a loader-level geo-block that rejects requests from EU/EEA IP addresses before any identity data is collected. This is a **scoping control**, not a compliance solution — it prevents EU residents from accidentally using a service that is not designed for them.

The block uses Vercel's built-in `x-vercel-ip-country` header (no API key required). The following country codes are blocked:

```
AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IS IT LI LT LU LV MT NL NO PL PT RO SE SI SK
```

*(EU member states + Iceland, Liechtenstein, Norway — the full EEA)*

---

## If You Want to Support EU/EEA Users

You would need to:

1. **Implement full GDPR compliance** — consent management, data subject rights, breach notification, privacy policy, DPIA.
2. **Deploy AWS services to EU regions** — set `AWS_REGION=eu-west-1` (Ireland) or `eu-central-1` (Frankfurt). This is already the code default.
3. **Validate document extraction** — test Textract and Rekognition accuracy against your target document types.
4. **Engage a GDPR legal advisor** — the regulatory risk is material. Do not self-certify compliance.
5. **Remove or conditionally disable the EU geo-block** (DJS-16).

This is a significant undertaking. A future Linear project can track this work if EU support becomes a product goal.

---

## If You Want to Support Other Non-EU Countries

Countries outside the EU/EEA generally do not have GDPR-equivalent obligations, but you should:

1. Verify local data protection law for your target jurisdiction.
2. Test document extraction accuracy for your target document types.
3. Ensure AWS services are available and performant in a region close to your users.
4. Review and update the privacy policy to reflect your jurisdiction.

The geo-block only covers EU/EEA — non-EU non-US countries are not blocked by default.

---

## Related

- [AWS Setup Guide](./AWS_SETUP.md) — AWS region configuration and GDPR compliance notes
- [GDPR Risk Register](./GDPR_RISK_REGISTER.md) — known risks and mitigation status
- Linear DJS-16 — geo-blocking implementation
