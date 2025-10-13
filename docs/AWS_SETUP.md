# AWS Setup Guide for Identity Verification

This guide explains how to set up AWS Textract and Rekognition services for the custom identity verification flow.

## Overview

The custom verification system uses two AWS services:
- **AWS Textract**: Extract text data from government-issued ID photos
- **AWS Rekognition**: Compare faces and perform liveness detection

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [AWS Service Setup](#aws-service-setup)
3. [IAM Configuration](#iam-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Cost Considerations](#cost-considerations)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- AWS Account with billing enabled
- Access to AWS Console
- Node.js project with environment variables configured

---

## AWS Service Setup

### 1. Enable AWS Textract

AWS Textract is available in most regions and requires no additional setup beyond IAM permissions.

**Supported Regions:**
- US East (N. Virginia) - `us-east-1`
- US West (Oregon) - `us-west-2`
- Europe (Ireland) - `eu-west-1`
- Asia Pacific (Singapore) - `ap-southeast-1`
- [See full list](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)

**What we use:**
- `AnalyzeID` API - Specialized for extracting data from identity documents

### 2. Enable AWS Rekognition

AWS Rekognition is also available in most regions and requires no additional setup.

**What we use:**
- `CompareFaces` API - Compare face in ID photo with selfie
- `DetectFaces` API - Analyze face quality for liveness detection

---

## IAM Configuration

### Option A: Create IAM User (Recommended for Development)

1. **Navigate to IAM Console**
   - Go to [IAM Console](https://console.aws.amazon.com/iam/)
   - Click **Users** → **Create user**

2. **Configure User**
   - User name: `cardlessid-verification` (or your preferred name)
   - Select: **Programmatic access**
   - Click **Next**

3. **Set Permissions**

   **Option 1: Use Managed Policies (Quick Setup)**
   - Attach existing policies:
     - `AmazonTextractFullAccess`
     - `AmazonRekognitionFullAccess`

   **Option 2: Create Custom Policy (Recommended for Production)**
   - Click **Create policy**
   - Select **JSON** tab
   - Paste the following policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "TextractIDAnalysis",
         "Effect": "Allow",
         "Action": [
           "textract:AnalyzeID"
         ],
         "Resource": "*"
       },
       {
         "Sid": "RekognitionFaceOperations",
         "Effect": "Allow",
         "Action": [
           "rekognition:CompareFaces",
           "rekognition:DetectFaces"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

   - Name it: `CardlessIDVerificationPolicy`
   - Click **Create policy**
   - Return to user creation and attach this policy

4. **Save Credentials**
   - On the final step, **download the CSV** or copy:
     - Access Key ID (e.g., `AKIAIOSFODNN7EXAMPLE`)
     - Secret Access Key (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
   - ⚠️ **Important**: This is the only time you'll see the Secret Access Key

### Option B: Use IAM Role (Recommended for Production/EC2/Lambda)

If deploying to AWS infrastructure (EC2, ECS, Lambda), use IAM roles instead:

1. Create an IAM role for your service
2. Attach the same custom policy from Option A
3. Assign the role to your compute resource
4. No need for `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` - credentials are automatically provided

---

## Environment Configuration

### 1. Update `.env.local`

Add the following to your `.env.local` file:

```bash
# AWS Configuration for Rekognition and Textract
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REKOGNITION_THRESHOLD=85
AWS_TEXTRACT_CONFIDENCE_THRESHOLD=80

# Change face comparison provider from 'mock' to 'aws-rekognition'
FACE_COMPARISON_PROVIDER=aws-rekognition
```

### 2. Configuration Options

| Variable | Description | Default | Recommended |
|----------|-------------|---------|-------------|
| `AWS_REGION` | AWS region for API calls | `us-east-1` | Closest to your users |
| `AWS_ACCESS_KEY_ID` | IAM user access key | Required | From IAM setup |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key | Required | From IAM setup |
| `AWS_REKOGNITION_THRESHOLD` | Face match confidence (0-100) | `85` | 80-95 for security |
| `AWS_TEXTRACT_CONFIDENCE_THRESHOLD` | Text extraction confidence (0-100) | `80` | 75-90 |
| `FACE_COMPARISON_PROVIDER` | Which service to use | `mock` | `aws-rekognition` |

### 3. Security Best Practices

- ✅ **Never commit** `.env.local` to git
- ✅ Use separate IAM users for dev/staging/production
- ✅ Rotate credentials regularly (every 90 days)
- ✅ Use IAM roles instead of access keys when possible
- ✅ Monitor AWS CloudTrail for API usage
- ✅ Set up AWS Budgets alerts for unexpected costs

---

## Cost Considerations

### AWS Pricing (US East Region, as of 2025)

#### AWS Textract - AnalyzeID
- **Price**: $0.065 per page
- **What counts as usage**: Each ID photo analyzed
- **Free Tier**: 1,000 pages per month for first 3 months (new accounts)

#### AWS Rekognition
- **CompareFaces**: $0.001 per image pair compared
- **DetectFaces**: $0.001 per image analyzed
- **Free Tier**: 5,000 images per month for first 12 months (new accounts)

### Cost Examples

**Scenario 1: Development/Testing (100 verifications/month)**
- Textract: 100 IDs × $0.065 = **$6.50**
- Rekognition: 200 operations × $0.001 = **$0.20**
- **Total: ~$6.70/month** (or $0 with free tier)

**Scenario 2: Small Production (1,000 verifications/month)**
- Textract: 1,000 IDs × $0.065 = **$65.00**
- Rekognition: 2,000 operations × $0.001 = **$2.00**
- **Total: ~$67/month** (or $0-$2 with free tier)

**Scenario 3: Medium Production (10,000 verifications/month)**
- Textract: 10,000 IDs × $0.065 = **$650.00**
- Rekognition: 20,000 operations × $0.001 = **$20.00**
- **Total: ~$670/month**

**Scenario 4: Large Production (100,000 verifications/month)**
- Textract: 100,000 IDs × $0.065 = **$6,500.00**
- Rekognition: 200,000 operations × $0.001 = **$200.00**
- **Total: ~$6,700/month**

### Cost Optimization Tips

1. **Use the Free Tier** - Great for development and low-volume production
2. **Cache Results** - Store extracted ID data to avoid re-processing
3. **Implement Retry Logic** - Avoid double charges from failed requests
4. **Monitor Usage** - Set up CloudWatch alarms and AWS Budgets
5. **Consider Batch Processing** - If doing bulk verifications, batch requests can reduce overhead

### Setting Up Cost Alerts

1. Go to [AWS Budgets](https://console.aws.amazon.com/billing/home#/budgets)
2. Click **Create budget**
3. Choose **Cost budget**
4. Set your monthly limit (e.g., $100)
5. Configure alerts at 50%, 80%, and 100% of budget
6. Add your email for notifications

---

## Testing

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test ID Upload

1. Navigate to http://localhost:5173/app/verify
2. Upload a test ID photo (driver's license, passport, etc.)
3. Check browser console and server logs for:
   ```
   [Textract] Processing ID document...
   [Textract] Document processed successfully
   [Textract] Extracted data fields: firstName, lastName, birthDate...
   ```

### 3. Test Selfie & Face Comparison

1. Confirm the extracted data
2. Take a selfie
3. Check logs for:
   ```
   [Upload Selfie] Performing liveness check...
   [Rekognition] Checking liveness...
   [Rekognition] Liveness check result: { isLive: true, confidence: 0.95... }
   [Rekognition] Comparing faces...
   [Rekognition] Face comparison result: { match: true, confidence: 0.92 }
   ```

### 4. Verify Success Flow

- ID data should be extracted and displayed
- Selfie should pass liveness check
- Faces should match (if using same person's photos)
- Session should be marked as "approved"

---

## Troubleshooting

### Error: "AWS credentials not configured"

**Cause**: Missing or incorrect credentials in `.env.local`

**Solution**:
1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
2. Check for typos or extra spaces
3. Restart development server after changing `.env.local`

### Error: "UnrecognizedClientException" or "InvalidSignatureException"

**Cause**: Incorrect AWS credentials

**Solution**:
1. Verify credentials in IAM Console
2. Regenerate access keys if needed
3. Check that credentials are for the correct AWS account

### Error: "AccessDeniedException"

**Cause**: IAM user lacks necessary permissions

**Solution**:
1. Go to IAM Console → Users → Your user
2. Check attached policies
3. Ensure policy includes:
   - `textract:AnalyzeID`
   - `rekognition:CompareFaces`
   - `rekognition:DetectFaces`

### Error: "Liveness check failed"

**Common Issues**:
- **Image too dark**: Improve lighting
- **Image not sharp enough**: Hold camera steady
- **Face turned too far**: Face camera directly
- **Eyes appear closed**: Keep eyes open
- **Sunglasses detected**: Remove sunglasses

**Solution**: The error message will include specific issues. Address them and retake the photo.

### Error: "Face in selfie does not match ID photo"

**Cause**: Faces are genuinely different or photo quality is poor

**Solution**:
- Ensure the same person is in both photos
- Improve lighting and camera angle
- Ensure face is clearly visible in both images
- Lower `AWS_REKOGNITION_THRESHOLD` if false negatives occur (not recommended below 75)

### Error: "No face detected"

**Cause**: Face not visible or image quality too low

**Solution**:
- Ensure face is centered and clearly visible
- Improve lighting
- Make sure ID photo includes a face photo
- Check that image isn't corrupted

### High Costs

**Symptom**: Unexpected AWS charges

**Investigation**:
1. Go to [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home#/cost-explorer)
2. Filter by service: Textract and Rekognition
3. Check for:
   - Duplicate API calls (implement idempotency)
   - Failed verifications being retried excessively
   - Test traffic in production environment

**Prevention**:
- Implement request deduplication
- Add rate limiting
- Set up AWS Budgets alerts
- Monitor CloudWatch metrics

---

## Additional Resources

- [AWS Textract Documentation](https://docs.aws.amazon.com/textract/)
- [AWS Rekognition Documentation](https://docs.aws.amazon.com/rekognition/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS Pricing Calculator](https://calculator.aws/)

---

## Support

For issues specific to this implementation:
1. Check the console logs for detailed error messages
2. Review this documentation's troubleshooting section
3. Verify AWS service status at [AWS Service Health Dashboard](https://status.aws.amazon.com/)

For AWS-specific issues:
- [AWS Support Center](https://console.aws.amazon.com/support/)
- [AWS Community Forums](https://forums.aws.amazon.com/)
