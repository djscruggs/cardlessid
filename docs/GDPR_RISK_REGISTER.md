# GDPR Risk Register

Identified during review of the Yoti Ltd €950,000 AEPD enforcement action (March 2026).
Each risk maps to a Linear issue in the "Cardless ID server" project.

---

## DJS-11 · URGENT — Firebase verificationSessions: no retention policy

**Risk:** Session records at `verificationSessions/{id}` are never deleted. Each record contains
PII extracted from the user's government ID (`verifiedData`: name, DOB, address, document number)
plus face match confidence scores and fraud signals in `providerMetadata`. Records accumulate
indefinitely with no TTL or deletion policy.

**GDPR exposure:** Article 5.1(e) storage limitation principle. Directly analogous to Yoti's
€250k fine for retaining personal data beyond the period necessary for the original purpose.
Credential issuance completes within a single session, so there is no legitimate basis for
indefinite retention.

**Mitigation:** Add a 24-48 hour TTL. Implement via a scheduled Cloud Function (delete where
`createdAt < now - 48h`) or a delete-on-read check in `getVerificationSession()`.

**Files:** `app/utils/verification.server.ts`, `app/utils/firebase.server.ts`

---

## DJS-12 · URGENT — Firebase ageVerificationSessions: no retention policy

**Risk:** Age verification sessions at `ageVerificationSessions/{id}` store session state
including `walletAddress` and are never deleted. Sessions have a 10-minute validity window
but the records themselves persist forever, linking wallet addresses to age verification
events indefinitely.

**GDPR exposure:** Article 5.1(e) storage limitation. Once a session resolves (approved /
rejected / expired), there is no purpose served by retaining the record.

**Mitigation:** Delete sessions on completion or apply a short TTL (e.g. 1 hour). Same
implementation approach as DJS-11.

**Files:** `app/utils/age-verification.server.ts`

---

## DJS-13 · HIGH — Temp photo storage: no crash-safe cleanup

**Risk:** Government ID photos and selfies are written to `./storage/photos` during
processing and deleted immediately after. The code handles deletion in success and error
paths, but a server crash between save and delete leaves biometric identity images on disk
with no cleanup mechanism. These are Article 9 special category data (facial images from
government IDs).

**GDPR exposure:** Article 5.1(e) and Article 9. Persistent storage of biometric data
without a legal basis.

**Mitigation:** Add a startup sweep that deletes any files in `PHOTO_STORAGE_DIR` older
than 15 minutes. Optionally add a periodic background sweep every 5 minutes.

**Files:** `app/utils/temp-photo-storage.server.ts`, server entry point

---

## DJS-14 · MEDIUM — AWS Rekognition: undocumented international transfer of biometric data

**Risk:** Selfies and ID photos are sent to AWS Rekognition (US-based) for face comparison
and liveness detection. AWS does not retain the data after processing, but this constitutes
an international transfer of Article 9 biometric data to a third-country processor and must
be documented. The default AWS region is `us-east-1`; EU users' facial data is currently
routed outside the EU/EEA without explicit documentation.

**GDPR exposure:** Articles 9, 44-49 (international transfers), Article 28 (processor
agreements). Similar to Yoti's aggravating factor of processing on servers outside the EU.

**Mitigation:**
- Confirm AWS DPA/BAA is in place
- Disclose in privacy policy: facial images are processed by AWS Rekognition for identity
  verification and are not retained by AWS after processing
- Change default `AWS_REGION` to `eu-west-1` for EU compliance
- Document in a DPIA

**Files:** `app/utils/face-comparison.server.ts` (`AWS_REGION` defaults to `us-east-1`)

---

## Status

| Issue | Title | Status |
|-------|-------|--------|
| DJS-11 | Firebase verificationSessions TTL | Open |
| DJS-12 | Firebase ageVerificationSessions TTL | Open |
| DJS-13 | Crash-safe photo cleanup | Open |
| DJS-14 | AWS Rekognition DPIA / privacy policy | Mitigated (docs + eu-west-1 default) |
| DJS-15 | Public documentation page for privacy architecture | Blocked on above |
