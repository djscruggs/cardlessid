---
{}
---
# Custom Verification Platform

This document describes the custom identity verification platform that uses **AWS Textract** for ID text extraction, **AWS Rekognition** for face comparison and liveness detection.

> **Note**: This platform was migrated from Google Document AI to AWS services. For legacy Google Document AI setup, see the git history. For current AWS setup, see [AWS_SETUP.md](./AWS_SETUP.md).

## Overview

The custom verification platform provides a complete end-to-end identity verification flow:

1.  **ID Photo Capture**: User photographs their government-issued ID
2.  **Text Extraction**: AWS Textract extracts identity information (name, DOB, ID number, etc.)
3.  **Data Confirmation**: User reviews and confirms extracted data (read-only)
4.  **Selfie Capture**: User takes a selfie with face centering guide
5.  **Liveness Detection**: AWS Rekognition analyzes face quality to ensure live person
6.  **Face Comparison**: AWS Rekognition compares ID photo with selfie
7.  **Credential Issuance**: If verified, user receives their NFT credential

## Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       ├──1. Upload ID Photo
       │
┌──────▼──────────────────┐
│  /api/custom-           │
│  verification/upload-id │
└──────┬──────────────────┘
       │
       ├──2. Extract ID data
       │
┌──────▼─────────────────┐
│  AWS Textract          │
│  (AnalyzeID)           │
└──────┬─────────────────┘
       │
       ├──3. Return extracted data
       │
┌──────▼──────┐
│   Client    │
│  (Review)   │
└──────┬──────┘
       │
       ├──4. Upload Selfie
       │
┌──────▼──────────────────────┐
│  /api/custom-verification/  │
│  upload-selfie               │
└──────┬──────────────────────┘
       │
       ├──5a. Check Liveness
       │
┌──────▼────────────────┐
│  AWS Rekognition      │
│  (DetectFaces)        │
└──────┬────────────────┘
       │
       ├──5b. Compare Faces
       │
┌──────▼────────────────┐
│  AWS Rekognition      │
│  (CompareFaces)       │
└──────┬────────────────┘
       │
       ├──6. Return match result
       │
┌──────▼──────────┐
│  Credential     │
│  Issuance       │
└─────────────────┘
```

## Setup

**📚 For detailed AWS setup instructions, see [AWS_SETUP.md](./AWS_SETUP.md)**

This section provides a quick overview. Refer to the dedicated AWS setup guide for complete instructions, IAM configuration, and troubleshooting.

### 1\. AWS Services Configuration

#### Required Services
- **AWS Textract** - ID text extraction
- **AWS Rekognition** - Face comparison and liveness detection

#### Quick Start

1. Create an AWS account
2. Create IAM user with these permissions:
   - `textract:AnalyzeID`
   - `rekognition:CompareFaces`
   - `rekognition:DetectFaces`
3. Get access key and secret key
4. Install SDKs (already included in this project):
   - `@aws-sdk/client-textract`
   - `@aws-sdk/client-rekognition`

#### Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REKOGNITION_THRESHOLD=85
AWS_TEXTRACT_CONFIDENCE_THRESHOLD=80

# Enable AWS services
FACE_COMPARISON_PROVIDER=aws-rekognition
```

**For development/testing only:**
```bash
# Use mock services (no AWS account needed)
FACE_COMPARISON_PROVIDER=mock
```

### 2\. Photo Storage Configuration

```bash
PHOTO_STORAGE_DIR=./storage/photos
```

Create the storage directory:

```bash
mkdir -p storage/photos
```

**Important**: Add `storage/` to `.gitignore` to prevent committing user photos.

## API Endpoints

### Upload ID Photo

**POST** `/api/custom-verification/upload-id`

Uploads and processes an ID photo with AWS Textract.

**Request Body** (FormData):

```
image: string (base64 data URL)
mimeType: string (e.g., 'image/jpeg')
```

**Response**:

```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123",
  "extractedData": {
    "firstName": "John",
    "middleName": "Michael",
    "lastName": "Doe",
    "birthDate": "1990-01-15",
    "governmentId": "D1234567",
    "idType": "drivers_license",
    "state": "CA",
    "expirationDate": "2028-01-15"
  },
  "lowConfidenceFields": [],
  "photoUrl": "./storage/photos/session_1234567890_abc123_id.jpg",
  "isExpired": false,
  "warnings": []
}
```

**Note**: The system automatically:

- Extracts state from address if not directly provided
- Infers document type (passport vs drivers_license vs government_id)
- Checks for expired IDs and returns warnings
- Tracks fields with low confidence scores (< 80%)

### Upload Selfie

**POST** `/api/custom-verification/upload-selfie`

Uploads a selfie, performs liveness detection, and compares it with the ID photo using AWS Rekognition.

**Request Body** (FormData):

```
sessionId: string
image: string (base64 data URL)
```

**Response (Success)**:

```json
{
  "success": true,
  "match": true,
  "confidence": 0.92,
  "livenessResult": {
    "isLive": true,
    "confidence": 0.95,
    "qualityScore": 0.88
  },
  "sessionId": "session_1234567890_abc123"
}
```

**Response (Liveness Check Failed)**:

```json
{
  "success": false,
  "error": "Liveness check failed",
  "issues": [
    "Image too dark",
    "Face turned too far to the side"
  ],
  "livenessResult": {
    "isLive": false,
    "confidence": 0.42,
    "qualityScore": 0.55
  }
}
```

### Get Session

**GET** `/api/custom-verification/session/:sessionId`

Retrieves verification session data. This endpoint returns the complete verification session including all extracted data, fraud signals, and verification results.

**Response**:

```json
{
  "success": true,
  "session": {
    "id": "session_1760055469389_xvmuj",
    "provider": "custom",
    "providerSessionId": "custom_1760055469389",
    "status": "approved",
    "createdAt": 1760055469389,
    "expiresAt": 1760057269389,
    "verifiedData": {
      "firstName": "JOHN",
      "middleName": "MICHAEL",
      "lastName": "DOE",
      "birthDate": "1990-05-15",
      "governmentId": "D1234567",
      "idType": "drivers_license",
      "state": "CA",
      "expirationDate": "2030-05-15"
    },
    "textractData": {
      "lowConfidenceFields": [],
      "hasData": true
    },
    "idPhotoUrl": "storage/photos/session_1760055469389_xvmuj_id.jpg",
    "selfiePhotoUrl": "storage/photos/session_1760055469389_xvmuj_selfie.jpg",
    "faceMatchResult": {
      "match": true,
      "confidence": 0.92
    },
    "livenessResult": {
      "isLive": true,
      "confidence": 0.95,
      "qualityScore": 0.88,
      "issues": []
    }
  }
}
```

**Field Descriptions:**

- `textractData.lowConfidenceFields`: Array of fields extracted with confidence below threshold (e.g., `["state (72.3%)"]`)
- `faceMatchResult`: Face comparison result from AWS Rekognition
- `livenessResult`: Liveness detection result including quality checks for brightness, sharpness, eye detection, and face pose

## Client Usage

### React Component

Navigate to `/app/custom-verify` to start the verification flow.

The verification process is handled by these components:

- `IdPhotoCapture`: Camera/upload interface for ID photo
- `IdentityForm`: Read-only form showing extracted data
- `SelfieCapture`: Camera interface with face guide overlay
- `VerificationResult`: Shows result and handles credential issuance

### Example Flow

```tsx
// 1. Start verification
navigate('/app/custom-verify');

// 2. User takes ID photo
// 3. System extracts data automatically
// 4. User confirms data
// 5. User takes selfie with face guide
// 6. System compares faces
// 7. If match: redirect to credential creation
// 8. If no match: restart process
```

## Security Considerations

### Photo Storage

- Photos are stored temporarily on the server filesystem
- Photos should be deleted after credential issuance
- On verification failure, photos are immediately deleted
- Never commit the `storage/` directory to git

### API Keys

- Keep all service account JSON files in `.gitignore`
- Never commit API keys or credentials
- Use environment variables for all sensitive data
- Rotate keys regularly in production

### Data Privacy

- Extract only necessary fields from ID documents
- Don't store raw Document AI responses long-term
- Implement proper session expiration
- Follow GDPR/CCPA requirements for user data

## Error Handling

### AWS Textract Errors

Common errors and solutions:

- **AWS credentials not configured**: Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- **AccessDeniedException**: IAM user lacks `textract:AnalyzeID` permission
- **InvalidParameterException**: Image format or size issue - check image is valid JPEG/PNG
- **ProvisionedThroughputExceededException**: Too many requests - implement rate limiting
- **Low quality image**: Ask user to retake photo with better lighting
- **Missing required fields**: Textract couldn't extract firstName, lastName, birthDate, or governmentId

### AWS Rekognition Errors

- **No face detected in ID photo**: Ensure ID includes a clear face photo
- **No face detected in selfie**: Ensure face is centered and clearly visible
- **Liveness check failed**: User will see specific issues (too dark, eyes closed, sunglasses, etc.)
- **Face in selfie does not match ID photo**: Faces are genuinely different or quality too low
- **AccessDeniedException**: IAM user lacks `rekognition:CompareFaces` or `rekognition:DetectFaces` permission
- **InvalidParameterException**: Image format or size issue

**See [AWS_SETUP.md](./AWS_SETUP.md#troubleshooting) for detailed troubleshooting steps.**

## Development & Testing

### Mock Mode

For development without external services:

```bash
FACE_COMPARISON_PROVIDER=mock
```

This provides:

- Simulated face comparison (80% success rate)
- No external API calls
- Adjustable via `FACE_MATCH_THRESHOLD`

### Testing the Flow

1.  Start the development server: `npm run dev`
2.  Navigate to `/app/custom-verify`
3.  Use test ID photos from `public/test-ids/` (if available)
4.  Complete the verification flow
5.  Check console for detailed logs

## Production Deployment

### Pre-deployment Checklist

- Google Document AI processor created and tested
- Service account credentials configured
- Face comparison service configured (AWS or Azure)
- Photo storage directory created with proper permissions
- All API keys added to production environment
- `.gitignore` includes credentials and storage directory
- Session cleanup cron job configured
- Error monitoring configured
- Rate limiting implemented

### Monitoring

Monitor these metrics:

- Document AI success rate
- Face match success rate
- API response times
- Storage usage
- Session expiration cleanup

### Cost Optimization

**Current AWS Pricing (US East region):**
- AWS Textract AnalyzeID: ~$0.065 per ID
- AWS Rekognition CompareFaces: ~$0.001 per comparison
- AWS Rekognition DetectFaces: ~$0.001 per detection

**Per verification costs:**
- 1 Textract call: $0.065
- 1 Liveness check (DetectFaces): $0.001
- 1 Face comparison: $0.001
- **Total: ~$0.067 per complete verification**

**Free Tier Benefits:**
- Textract: 1,000 pages/month for first 3 months
- Rekognition: 5,000 images/month for first 12 months

**Optimization Tips:**
- Cache extracted ID data to avoid re-processing
- Implement request deduplication
- Use image compression before upload (maintains quality)
- Monitor usage with AWS CloudWatch and Budgets
- Consider batch operations for high-volume scenarios

**See [AWS_SETUP.md](./AWS_SETUP.md#cost-considerations) for detailed cost analysis and examples.**

## Troubleshooting

### "AWS credentials not configured"

Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your `.env.local` file. Restart the development server after making changes.

### "Unable to access camera"

Ensure:

- HTTPS is enabled (required for camera access)
- User has granted camera permissions
- Camera is not in use by another app

### "Liveness check failed"

The error message will include specific issues:
- **Image too dark/bright**: Improve lighting conditions
- **Image not sharp enough**: Hold device steady, ensure camera is focused
- **Eyes appear closed**: Keep eyes open during photo
- **Face turned too far**: Face camera directly
- **Sunglasses detected**: Remove sunglasses or eyewear

### "Face comparison failed" or "Face does not match"

Check:
- Same person in both photos
- Good lighting in both images
- Face clearly visible (not obscured)
- ID photo includes face (not just back of ID)
- Consider adjusting `AWS_REKOGNITION_THRESHOLD` (default 85)

### "Session not found"

- Session may have expired (30 minute default)
- Check Firebase Realtime Database connection
- Verify session ID is correct

**For more troubleshooting, see [AWS_SETUP.md](./AWS_SETUP.md#troubleshooting)**

## Future Enhancements

Potential improvements:

- ✅ Liveness detection for selfies (implemented)
- ✅ ID expiration date detection (implemented)
- Multi-language support for Textract
- Video-based liveness with head movement detection
- Progressive image quality checks
- Webhook notifications for verification events
- Admin dashboard for verification review and audit
- Fraud detection integration (third-party service)
- Custom confidence threshold configuration per field
- Support for international IDs and passports