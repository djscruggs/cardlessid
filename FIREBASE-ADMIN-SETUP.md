# Firebase Admin SDK Setup

This app now uses Firebase Admin SDK for server-side API operations.

## Getting Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file

## Local Development Setup

### Option 1: Environment Variable (Recommended for deployment)

1. Open the downloaded service account JSON file
2. Convert it to a single line (remove newlines)
3. Add to `.env` file:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"cardlessid",...entire JSON here...}'
FIREBASE_DATABASE_URL=https://cardlessid-default-rtdb.firebaseio.com
```

### Option 2: Application Default Credentials (Easier for local dev)

1. Install Google Cloud SDK
2. Run: `gcloud auth application-default login`
3. The Admin SDK will automatically use these credentials

## Database Rules

Make sure your Firebase Realtime Database has rules that allow server-side access:

```json
{
  "rules": {
    "verifications": {
      ".read": false,
      ".write": false
    },
    "announcements": {
      ".read": true,
      ".write": false
    }
  }
}
```

Admin SDK bypasses these rules, but they protect client-side access.

## Testing

Start the dev server:
```bash
npm run dev
```

Test the API endpoints:
- `POST /api/verify-webhook` - Record verification
- `POST /api/credentials` - Issue credential
- `GET /api/announcements` - Fetch announcements
- `GET /api/credentials/schema` - Get credential schema

## Deployment

For Vercel/production deployment, add `FIREBASE_SERVICE_ACCOUNT_JSON` as an environment variable in your hosting platform's dashboard.

## Rollback

If you need to rollback to client SDK:
```bash
git reset --hard 8509018
```
