#!/usr/bin/env node
/**
 * Mock verification provider server
 * Simulates a provider SDK that sends webhooks after "verification"
 *
 * Usage:
 *   node scripts/mock-provider-server.cjs
 *
 * Modes:
 *   AUTO_APPROVE=true - Automatically approve after 3 seconds (default)
 *   AUTO_APPROVE=false - Wait for manual input to approve/reject
 *
 * Then in your mobile app testing:
 *   1. Call /api/verification/start
 *   2. Instead of launching real SDK, call this script's /verify endpoint
 *   3. This script will "verify" the user and send webhook to your server
 */

const http = require('http');
const readline = require('readline');

const PORT = 3001;
const YOUR_SERVER_URL = process.env.SERVER_URL || 'http://localhost:5173';
const AUTO_APPROVE = process.env.AUTO_APPROVE === 'true'; // Default false (manual mode)

// Store pending verifications
const pendingVerifications = new Map();

// Setup readline interface for manual approval
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to prompt for manual decision
function promptForDecision(providerSessionId, identityData) {
  return new Promise((resolve) => {
    console.log(`\n🤔 Manual decision required for session: ${providerSessionId}`);
    console.log(`   User: ${identityData?.firstName || 'Unknown'} ${identityData?.lastName || ''}`);
    console.log(`   Options:`);
    console.log(`     [a] Approve - Verification passed`);
    console.log(`     [r] Reject - Verification failed`);
    console.log(`     [d] Delay - Simulate user still taking photos (ask again in 30s)`);
    console.log(``);
    process.stdout.write(`   👉 Enter your choice (a/r/d) and press ENTER: `);

    rl.question('', (answer) => {
      const choice = answer.toLowerCase().trim();

      // Echo what was entered
      console.log(`\n   >> You entered: "${choice}"`);

      if (choice === 'a') {
        console.log(`\n✅ Decision: APPROVE`);
        console.log(`   Processing approval...`);
        resolve({ decision: 'approve' });
      } else if (choice === 'r') {
        console.log(`\n❌ Decision: REJECT`);
        console.log(`   Processing rejection...`);
        resolve({ decision: 'reject' });
      } else if (choice === 'd') {
        console.log(`\n⏳ Decision: DELAY`);
        console.log(`   Simulating delay... User is still verifying identity...`);
        console.log(`   Will prompt again in 30 seconds...`);
        setTimeout(() => {
          resolve(promptForDecision(providerSessionId, identityData));
        }, 30000);
      } else if (choice === '') {
        console.log(`\n❌ No input detected - you must type a letter and press ENTER`);
        console.log(`   Please try again...`);
        resolve(promptForDecision(providerSessionId, identityData));
      } else {
        console.log(`\n❌ Invalid choice!`);
        console.log(`   You entered: "${choice}"`);
        console.log(`   Valid options are: 'a', 'r', or 'd'`);
        console.log(`   Please try again...`);
        resolve(promptForDecision(providerSessionId, identityData));
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // POST /verify - Simulate starting verification
  if (req.method === 'POST' && req.url === '/verify') {
    console.log(`\n📥 Received ${req.method} ${req.url}`);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        console.log(`📦 Request body: ${body}`);
        const { authToken, providerSessionId, identityData, approved = true } = JSON.parse(body);

        console.log(`\n📱 STEP 1: Verification session created`);
        console.log(`   Session ID: ${providerSessionId}`);
        console.log(`   User: ${identityData?.firstName || 'Unknown'} ${identityData?.lastName || ''}`);
        console.log(`   Mode: ${AUTO_APPROVE ? 'AUTO (3s delay)' : 'MANUAL (awaiting input)'}`);

        // Handle verification based on mode
        const handleVerification = async () => {
          let finalApproved = approved;

          if (AUTO_APPROVE) {
            console.log(`\n⏳ Simulating user verification process (3 seconds)...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            console.log(`\n📸 Simulating user verification UI...`);
            console.log(`   User is now taking photos, scanning documents, etc.`);
            const result = await promptForDecision(providerSessionId, identityData);
            finalApproved = result.decision === 'approve';
          }

          console.log(`\n📱 STEP 2: User completed ID verification`);
          console.log(`   Result: ${finalApproved ? '✅ APPROVED' : '❌ REJECTED'}`);

          // Send webhook to your server
          const webhookUrl = `${YOUR_SERVER_URL}/api/verification/webhook?provider=mock`;
          const webhookData = {
            providerSessionId,
            status: finalApproved ? 'approved' : 'rejected',
            ...(finalApproved ? identityData : {}),
          };

          console.log(`\n📱 STEP 3: Sending webhook to your server`);
          console.log(`   URL: ${webhookUrl}`);
          console.log(`   Payload: ${JSON.stringify(webhookData, null, 2)}`);

          try {
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookData),
            });

            const responseText = await response.text();

            if (response.ok) {
              console.log(`\n✅ STEP 4: Webhook delivered successfully!`);
              console.log(`   Response: ${responseText}`);
            } else {
              console.error(`\n❌ STEP 4: Webhook delivery failed!`);
              console.error(`   Status: ${response.status}`);
              console.error(`   Response: ${responseText}`);
            }
          } catch (fetchError) {
            console.error(`\n❌ STEP 4: Webhook request failed!`);
            console.error(`   Error: ${fetchError.message}`);
          }

          if (!AUTO_APPROVE) {
            console.log(`\n✓ Verification complete. Ready for next session.\n`);
          }
        };

        // Run verification asynchronously
        handleVerification().catch(error => {
          console.error(`\n❌ Verification process error:`, error);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        const responseData = {
          success: true,
          message: 'Verification started, webhook will be sent in 3 seconds',
          providerSessionId,
        };
        console.log(`\n📤 Response sent to client: ${JSON.stringify(responseData)}`);
        res.end(JSON.stringify(responseData));
      } catch (error) {
        console.error(`\n❌ Error processing request:`, error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // POST /sdk - Simulates the provider SDK
  // Mobile app calls this instead of a real provider SDK
  if (req.method === 'POST' && req.url === '/sdk') {
    console.log(`\n📱 Received ${req.method} ${req.url}`);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        console.log(`📦 SDK request body: ${body}`);
        const { authToken, sessionId } = JSON.parse(body);

        console.log(`\n📱 [SDK] Mobile app launched verification SDK`);
        console.log(`   Auth Token: ${authToken}`);
        console.log(`   Session: ${sessionId || 'unknown'}`);

        // Immediately respond to mobile app (SDK is "running")
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Verification SDK launched. Complete verification on server console.',
        }));

        console.log(`\n✓ [SDK] Responded to mobile app - SDK is "running"`);
        console.log(`\n📸 Verification UI would now be shown to user...`);
        console.log(`   (Waiting for manual approval on this console)`);

        // Now we need the actual verification data
        // The mobile app should have sent this, or we ask for it
        console.log(`\n⚠️  Note: Mobile app should call /verify with full identity data`);
        console.log(`   This /sdk endpoint just simulates SDK launch`);

      } catch (error) {
        console.error(`\n❌ Error processing SDK request:`, error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // GET /health
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', provider: 'mock' }));
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🎭 Mock Provider Server`);
  console.log(`═══════════════════════════════════════════════════`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Webhook target: ${YOUR_SERVER_URL}`);
  console.log(`   Mode: ${AUTO_APPROVE ? 'AUTO-APPROVE (3s delay)' : 'MANUAL APPROVAL (interactive)'}`);
  console.log(`═══════════════════════════════════════════════════\n`);

  if (!AUTO_APPROVE) {
    console.log(`💡 Manual mode active - you'll be prompted to approve/reject each verification`);
    console.log(`   Press 'a' to approve, 'r' to reject, 'd' to delay\n`);
  } else {
    console.log(`💡 Auto-approve mode - verifications will auto-approve after 3 seconds\n`);
  }

  console.log(`Test it:`);
  console.log(`  curl -X POST http://localhost:${PORT}/verify \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"providerSessionId": "test123", "identityData": {"firstName": "John", "lastName": "Doe", "birthDate": "1990-01-01", "governmentId": "D123", "idType": "government_id", "state": "CA"}}'`);
  console.log('\nWaiting for verification requests...\n');
});
