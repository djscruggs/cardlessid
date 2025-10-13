# Cardless ID Wallet App Developer Guide

This guide is for developers building mobile wallet applications that integrate with Cardless ID's age verification system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Deep Linking Setup](#deep-linking-setup)
- [API Integration](#api-integration)
- [User Flow](#user-flow)
- [Implementation Examples](#implementation-examples)
- [Testing](#testing)
- [Requirements](#requirements)

## Overview

Cardless ID provides a decentralized identity verification system built on the Algorand blockchain. Your wallet app will:

1. Store users' verifiable credentials (birth date, etc.)
2. Respond to age verification requests via QR codes
3. Provide zero-knowledge proofs (only answer "yes/no", not reveal actual age)

## Architecture

```
Verifier Site          Cardless ID API        Your Wallet App
     |                      |                       |
     |-- Creates ---------> |                       |
     |   Challenge          |                       |
     |                      |                       |
     |<-- Returns QR -------|                       |
     |                      |                       |
     | Shows QR Code        |                       |
     |================================================> User scans
     |                      |                       |
     |                      |                       | Fetches challenge
     |                      | <-------------------- | details
     |                      |                       |
     |                      | Returns minAge -----> |
     |                      |                       |
     |                      |                       | User approves/
     |                      |                       | rejects
     |                      |                       |
     |                      | <-------------------- | Submits response
     |                      |                       |
     |                      | Confirms -----------> |
     |                      |                       |
     | Polls for result --> |                       |
     |                      |                       |
     | <-- Verified --------|                       |
```

## Deep Linking Setup

Your app needs to handle incoming verification requests via deep links.

### Option 1: Universal Links / App Links (Recommended)

**URLs your app will receive:**

```
https://cardlessid.com/app/wallet-verify?challenge=chal_1234567890_abc
https://cardlessid.com/app/wallet-verify?session=age_1234567890_abc
```

#### iOS - Universal Links

1. **Add Associated Domains** capability in Xcode:

   ```
   applinks:cardlessid.com
   ```

2. **Handle incoming links:**

   ```swift
   // AppDelegate.swift or SceneDelegate.swift
   func application(_ application: UIApplication,
                   continue userActivity: NSUserActivity,
                   restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {

       guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
             let url = userActivity.webpageURL else {
           return false
       }

       // Parse URL
       let components = URLComponents(url: url, resolvingAgainstBaseURL: true)

       if url.path == "/app/wallet-verify" {
           // Get challenge or session ID
           if let challengeId = components?.queryItems?.first(where: { $0.name == "challenge" })?.value {
               // Handle integrator challenge
               handleVerificationRequest(challengeId: challengeId, type: .challenge)
               return true
           }
           else if let sessionId = components?.queryItems?.first(where: { $0.name == "session" })?.value {
               // Handle demo session
               handleVerificationRequest(sessionId: sessionId, type: .session)
               return true
           }
       }

       return false
   }
   ```

#### Android - App Links

1. **Add intent filter** in AndroidManifest.xml:

   ```xml
   <activity android:name=".VerificationActivity">
       <intent-filter android:autoVerify="true">
           <action android:name="android.intent.action.VIEW" />
           <category android:name="android.intent.category.DEFAULT" />
           <category android:name="android.intent.category.BROWSABLE" />

           <data
               android:scheme="https"
               android:host="cardlessid.com"
               android:pathPrefix="/app/wallet-verify" />
       </intent-filter>
   </activity>
   ```

2. **Handle incoming links:**

   ```kotlin
   // VerificationActivity.kt
   override fun onCreate(savedInstanceState: Bundle?) {
       super.onCreate(savedInstanceState)

       val data: Uri? = intent?.data

       if (data != null && data.path == "/app/wallet-verify") {
           val challengeId = data.getQueryParameter("challenge")
           val sessionId = data.getQueryParameter("session")

           when {
               challengeId != null -> handleVerificationRequest(challengeId, Type.CHALLENGE)
               sessionId != null -> handleVerificationRequest(sessionId, Type.SESSION)
           }
       }
   }
   ```

### Option 2: Custom URL Scheme (Fallback)

**URLs your app will receive:**

```
cardlessid://verify?challenge=chal_1234567890_abc
cardlessid://verify?session=age_1234567890_abc&minAge=21
```

#### iOS

1. **Add URL scheme** in Info.plist:

   ```xml
   <key>CFBundleURLTypes</key>
   <array>
       <dict>
           <key>CFBundleURLSchemes</key>
           <array>
               <string>cardlessid</string>
           </array>
       </dict>
   </array>
   ```

2. **Handle incoming URLs:**

   ```swift
   // AppDelegate.swift
   func application(_ app: UIApplication,
                   open url: URL,
                   options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {

       if url.scheme == "cardlessid" && url.host == "verify" {
           let components = URLComponents(url: url, resolvingAgainstBaseURL: true)

           if let challengeId = components?.queryItems?.first(where: { $0.name == "challenge" })?.value {
               handleVerificationRequest(challengeId: challengeId, type: .challenge)
               return true
           }
           else if let sessionId = components?.queryItems?.first(where: { $0.name == "session" })?.value {
               handleVerificationRequest(sessionId: sessionId, type: .session)
               return true
           }
       }

       return false
   }
   ```

#### Android

1. **Add intent filter:**

   ```xml
   <intent-filter>
       <action android:name="android.intent.action.VIEW" />
       <category android:name="android.intent.category.DEFAULT" />
       <category android:name="android.intent.category.BROWSABLE" />

       <data android:scheme="cardlessid" android:host="verify" />
   </intent-filter>
   ```

## API Integration

Your wallet app needs to integrate with two Cardless ID APIs:

### 1. Fetch Challenge/Session Details

**Get challenge details (Integrator mode):**

```http
GET https://cardlessid.com/api/integrator/challenge/details/{challengeId}
```

**Response:**

```json
{
  "challengeId": "chal_1234567890_abc123",
  "minAge": 21,
  "status": "pending",
  "expiresAt": 1234568490000
}
```

**Get session details (Demo mode):**

```http
GET https://cardlessid.com/api/age-verify/session/{sessionId}
```

**Response:**

```json
{
  "id": "age_1234567890_abc",
  "minAge": 21,
  "status": "pending",
  "createdAt": 1234567890000,
  "expiresAt": 1234568490000
}
```

### 2. Submit Verification Response

**Submit challenge response (Integrator mode):**

```http
POST https://cardlessid.com/api/integrator/challenge/respond
Content-Type: application/json

{
  "challengeId": "chal_1234567890_abc123",
  "approved": true,
  "walletAddress": "ALGORAND_WALLET_ADDRESS_HERE"
}
```

**Submit session response (Demo mode):**

```http
POST https://cardlessid.com/api/age-verify/respond
Content-Type: application/json

{
  "sessionId": "age_1234567890_abc",
  "approved": true,
  "walletAddress": "ALGORAND_WALLET_ADDRESS_HERE"
}
```

**Response:**

```json
{
  "success": true
}
```

## User Flow

### Step-by-step implementation:

1. **User scans QR code** → App opens via deep link

2. **Parse the URL** to extract `challengeId` or `sessionId`

3. **Fetch verification details:**

   ```
   GET /api/integrator/challenge/details/{challengeId}
   OR
   GET /api/age-verify/session/{sessionId}
   ```

4. **Retrieve user's credential** from local storage/blockchain:

   ```
   - Get user's birth date from stored credential
   - Calculate user's age
   ```

5. **Display consent screen:**

   ```
   "A service is requesting to verify:
   You were born before {requiredBirthYear}
   (Age {minAge} or older)

   Your wallet will only share whether you meet
   the age requirement. No personal information
   will be shared.

   [Approve] [Decline]"
   ```

6. **User makes decision:**
   - If user clicks "Approve" → Check if they meet requirement
   - If user clicks "Decline" → Submit rejection

7. **Submit response:**

   ```
   POST /api/integrator/challenge/respond
   OR
   POST /api/age-verify/respond

   Body: {
     "challengeId": "...",
     "approved": true/false,
     "walletAddress": "user's algorand address"
   }
   ```

8. **Show confirmation:**
   ```
   "✓ Verification complete!
   You can now return to the website."
   ```

## Implementation Examples

### iOS (Swift)

```swift
import Foundation
import UIKit

class VerificationService {
    let baseURL = "https://cardlessid.com"

    func handleVerificationRequest(challengeId: String) async throws {
        // 1. Fetch challenge details
        let details = try await fetchChallengeDetails(challengeId: challengeId)

        // 2. Get user's credential
        guard let userBirthDate = getUserBirthDate() else {
            throw VerificationError.noCredential
        }

        // 3. Calculate if user meets requirement
        let userAge = calculateAge(from: userBirthDate)
        let meetsRequirement = userAge >= details.minAge

        // 4. Show consent UI (implemented in your view controller)
        let approved = try await showConsentScreen(
            minAge: details.minAge,
            meetsRequirement: meetsRequirement
        )

        // 5. Submit response
        try await submitResponse(
            challengeId: challengeId,
            approved: approved && meetsRequirement,
            walletAddress: getUserWalletAddress()
        )

        // 6. Show success
        showSuccessMessage()
    }

    private func fetchChallengeDetails(challengeId: String) async throws -> ChallengeDetails {
        let url = URL(string: "\(baseURL)/api/integrator/challenge/details/\(challengeId)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(ChallengeDetails.self, from: data)
    }

    private func submitResponse(challengeId: String, approved: Bool, walletAddress: String) async throws {
        let url = URL(string: "\(baseURL)/api/integrator/challenge/respond")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = [
            "challengeId": challengeId,
            "approved": approved,
            "walletAddress": walletAddress
        ] as [String : Any]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw VerificationError.submitFailed
        }
    }

    private func calculateAge(from birthDate: Date) -> Int {
        let calendar = Calendar.current
        let now = Date()
        let ageComponents = calendar.dateComponents([.year], from: birthDate, to: now)
        return ageComponents.year ?? 0
    }

    private func getUserBirthDate() -> Date? {
        // TODO: Retrieve from stored credential
        // This should read from your local storage or blockchain
        return nil
    }

    private func getUserWalletAddress() -> String {
        // TODO: Return user's Algorand wallet address
        return ""
    }
}

struct ChallengeDetails: Codable {
    let challengeId: String
    let minAge: Int
    let status: String
    let expiresAt: Int64
}

enum VerificationError: Error {
    case noCredential
    case submitFailed
}
```

### Android (Kotlin)

```kotlin
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.*

class VerificationService(private val context: Context) {
    private val baseURL = "https://cardlessid.com"
    private val client = OkHttpClient()

    suspend fun handleVerificationRequest(challengeId: String) {
        try {
            // 1. Fetch challenge details
            val details = fetchChallengeDetails(challengeId)

            // 2. Get user's credential
            val userBirthDate = getUserBirthDate()
                ?: throw Exception("No credential found")

            // 3. Calculate if user meets requirement
            val userAge = calculateAge(userBirthDate)
            val meetsRequirement = userAge >= details.minAge

            // 4. Show consent UI (implemented in your activity)
            val approved = withContext(Dispatchers.Main) {
                showConsentScreen(details.minAge, meetsRequirement)
            }

            // 5. Submit response
            submitResponse(
                challengeId = challengeId,
                approved = approved && meetsRequirement,
                walletAddress = getUserWalletAddress()
            )

            // 6. Show success
            withContext(Dispatchers.Main) {
                showSuccessMessage()
            }

        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                showError(e.message ?: "Verification failed")
            }
        }
    }

    private suspend fun fetchChallengeDetails(challengeId: String): ChallengeDetails {
        return withContext(Dispatchers.IO) {
            val url = "$baseURL/api/integrator/challenge/details/$challengeId"
            val request = Request.Builder().url(url).build()

            val response = client.newCall(request).execute()
            val jsonString = response.body?.string() ?: throw Exception("Empty response")

            val json = JSONObject(jsonString)
            ChallengeDetails(
                challengeId = json.getString("challengeId"),
                minAge = json.getInt("minAge"),
                status = json.getString("status"),
                expiresAt = json.getLong("expiresAt")
            )
        }
    }

    private suspend fun submitResponse(
        challengeId: String,
        approved: Boolean,
        walletAddress: String
    ) {
        withContext(Dispatchers.IO) {
            val url = "$baseURL/api/integrator/challenge/respond"

            val json = JSONObject().apply {
                put("challengeId", challengeId)
                put("approved", approved)
                put("walletAddress", walletAddress)
            }

            val mediaType = "application/json; charset=utf-8".toMediaType()
            val body = json.toString().toRequestBody(mediaType)

            val request = Request.Builder()
                .url(url)
                .post(body)
                .build()

            val response = client.newCall(request).execute()

            if (!response.isSuccessful) {
                throw Exception("Submit failed: ${response.code}")
            }
        }
    }

    private fun calculateAge(birthDate: Date): Int {
        val calendar = Calendar.getInstance()
        val today = calendar.time

        calendar.time = birthDate
        val birthYear = calendar.get(Calendar.YEAR)
        val birthMonth = calendar.get(Calendar.MONTH)
        val birthDay = calendar.get(Calendar.DAY_OF_MONTH)

        calendar.time = today
        var age = calendar.get(Calendar.YEAR) - birthYear

        if (calendar.get(Calendar.MONTH) < birthMonth ||
            (calendar.get(Calendar.MONTH) == birthMonth &&
             calendar.get(Calendar.DAY_OF_MONTH) < birthDay)) {
            age--
        }

        return age
    }

    private fun getUserBirthDate(): Date? {
        // TODO: Retrieve from stored credential
        return null
    }

    private fun getUserWalletAddress(): String {
        // TODO: Return user's Algorand wallet address
        return ""
    }
}

data class ChallengeDetails(
    val challengeId: String,
    val minAge: Int,
    val status: String,
    val expiresAt: Long
)
```

### React Native

```typescript
import { Linking } from "react-native";

class VerificationService {
  private baseURL = "https://cardlessid.com";

  async setupDeepLinking() {
    // Handle app opened via deep link
    Linking.addEventListener("url", this.handleDeepLink);

    // Handle app already open when link clicked
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      this.handleDeepLink({ url: initialUrl });
    }
  }

  handleDeepLink = ({ url }: { url: string }) => {
    // Parse URL: https://cardlessid.com/app/wallet-verify?challenge=chal_123
    const urlObj = new URL(url);
    const challengeId = urlObj.searchParams.get("challenge");
    const sessionId = urlObj.searchParams.get("session");

    if (challengeId) {
      this.handleVerificationRequest(challengeId, "challenge");
    } else if (sessionId) {
      this.handleVerificationRequest(sessionId, "session");
    }
  };

  async handleVerificationRequest(id: string, type: "challenge" | "session") {
    try {
      // 1. Fetch details
      const details = await this.fetchDetails(id, type);

      // 2. Get user's credential
      const userBirthDate = await this.getUserBirthDate();
      if (!userBirthDate) throw new Error("No credential found");

      // 3. Calculate age
      const userAge = this.calculateAge(userBirthDate);
      const meetsRequirement = userAge >= details.minAge;

      // 4. Show consent screen (navigate to your component)
      const approved = await this.showConsentScreen(details, meetsRequirement);

      // 5. Submit response
      await this.submitResponse(id, type, approved && meetsRequirement);

      // 6. Show success
      this.showSuccessScreen();
    } catch (error) {
      console.error("Verification error:", error);
      this.showErrorScreen(error.message);
    }
  }

  async fetchDetails(id: string, type: "challenge" | "session") {
    const endpoint =
      type === "challenge"
        ? `/api/integrator/challenge/details/${id}`
        : `/api/age-verify/session/${id}`;

    const response = await fetch(`${this.baseURL}${endpoint}`);
    return await response.json();
  }

  async submitResponse(
    id: string,
    type: "challenge" | "session",
    approved: boolean
  ) {
    const endpoint =
      type === "challenge"
        ? "/api/integrator/challenge/respond"
        : "/api/age-verify/respond";

    const body =
      type === "challenge"
        ? {
            challengeId: id,
            approved,
            walletAddress: await this.getUserWalletAddress(),
          }
        : {
            sessionId: id,
            approved,
            walletAddress: await this.getUserWalletAddress(),
          };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Failed to submit response");
    }
  }

  calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  async getUserBirthDate(): Promise<Date | null> {
    // TODO: Retrieve from stored credential
    return null;
  }

  async getUserWalletAddress(): Promise<string> {
    // TODO: Return user's Algorand wallet address
    return "";
  }
}
```

## Testing

### Test with Demo Mode

1. Visit: https://cardlessid.com/app/age-verify
2. Set minimum age (e.g., 21)
3. Scan QR code with your app
4. Verify your app receives the deep link
5. Test approval/rejection flows

### Test URL Patterns

Test these URLs directly in your app:

**Challenge (Integrator mode):**

```
https://cardlessid.com/app/wallet-verify?challenge=chal_1234567890_abc
```

**Session (Demo mode):**

```
https://cardlessid.com/app/wallet-verify?session=age_1234567890_abc
```

### Testing Checklist

- [ ] Deep links open your app
- [ ] Parse challenge/session ID correctly
- [ ] Fetch verification details successfully
- [ ] Display consent screen with correct info
- [ ] Calculate user's age correctly
- [ ] Submit approval response
- [ ] Submit rejection response
- [ ] Handle expired challenges
- [ ] Handle network errors
- [ ] Show appropriate success/error messages

## Requirements

### Credential Storage

Your wallet must securely store:

- User's birth date (from their verified credential)
- Algorand wallet address
- Credential proofs/signatures

### Privacy Requirements

Your app MUST:

- ✅ Only share true/false (not actual birth date)
- ✅ Get explicit user consent before responding
- ✅ Display what information will be shared
- ✅ Allow user to decline verification

### Security Requirements

- ✅ Validate challenge/session is not expired
- ✅ Verify challenge/session status is "pending"
- ✅ Use HTTPS for all API calls
- ✅ Handle errors gracefully
- ✅ Implement timeout handling

## Credential Format

User credentials should follow the W3C Verifiable Credentials standard:

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "AgeCredential"],
  "issuer": "did:algo:...",
  "issuanceDate": "2024-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "did:algo:...",
    "birthDate": "2000-01-15"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-01-01T00:00:00Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:algo:...#key-1",
    "proofValue": "..."
  }
}
```

See: https://cardlessid.com/docs/credential-schema

## Support & Resources

- **Integration Guide**: https://cardlessid.com/docs/integration-guide
- **API Documentation**: https://cardlessid.com/docs
- **Credential Schema**: https://cardlessid.com/docs/credential-schema
- **Deep Linking Guide**: See DEEP_LINKING.md in repository
- **GitHub**: https://github.com/djscruggs/cardlessid
- **Support**: me@djscruggs.com

## License

MIT License - Feel free to build compatible wallet applications!

---

**Questions?** Open an issue on GitHub or email me@djscruggs.com
