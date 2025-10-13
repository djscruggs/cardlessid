/**
 * Simple Express.js example for Cardless ID age verification
 *
 * This example demonstrates a complete integration with:
 * - Age verification flow
 * - QR code display
 * - Status polling
 * - Session management
 *
 * To run:
 * 1. npm install express @cardlessid/verifier
 * 2. Set CARDLESSID_API_KEY environment variable
 * 3. node index.js
 * 4. Open http://localhost:3000
 */

const express = require('express');
const Cardless ID = require('../../node/cardlessid-verifier');

const app = express();
app.use(express.json());

// Initialize verifier
const verifier = new Cardless ID({
  apiKey: process.env.CARDLESSID_API_KEY || 'demo_key',
  baseUrl: process.env.CARDLESSID_URL || 'http://localhost:5173'
});

// In-memory session storage (use Redis/DB in production)
const sessions = new Map();

// Serve static HTML
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Age Verification Demo</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
        }
        .container {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
        }
        button {
          background: #007bff;
          color: white;
          border: none;
          padding: 15px 30px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background: #0056b3;
        }
        #qrcode {
          margin: 20px 0;
          display: none;
        }
        #qrcode img {
          border: 4px solid #007bff;
          border-radius: 8px;
        }
        .status {
          margin: 20px 0;
          padding: 15px;
          border-radius: 4px;
        }
        .status.pending {
          background: #fff3cd;
          color: #856404;
        }
        .status.approved {
          background: #d4edda;
          color: #155724;
        }
        .status.rejected {
          background: #f8d7da;
          color: #721c24;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔒 Age Verification Demo</h1>
        <p>This demo requires you to verify you are 21 years or older.</p>

        <div id="start-section">
          <button onclick="startVerification()">Start Verification</button>
        </div>

        <div id="qrcode" style="display: none;">
          <h3>Scan this QR code with your Cardless ID wallet:</h3>
          <img id="qrcode-img" src="" alt="QR Code" width="300" height="300">
          <div id="status" class="status pending">
            <p>⏳ Waiting for verification...</p>
          </div>
        </div>

        <div id="result" style="display: none;">
          <h2 id="result-title"></h2>
          <p id="result-message"></p>
          <button onclick="location.reload()">Try Again</button>
        </div>
      </div>

      <script>
        let pollInterval;

        async function startVerification() {
          try {
            // Call backend to create challenge
            const response = await fetch('/api/verify/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ minAge: 21 })
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to create verification');
            }

            // Hide start button, show QR code
            document.getElementById('start-section').style.display = 'none';
            document.getElementById('qrcode').style.display = 'block';

            // Generate QR code URL (using quickchart.io for simplicity)
            const qrCodeDataUrl = 'https://quickchart.io/qr?text=' +
              encodeURIComponent(data.qrCodeUrl) + '&size=300';
            document.getElementById('qrcode-img').src = qrCodeDataUrl;

            // Start polling for status
            startPolling(data.sessionId);

          } catch (error) {
            alert('Error: ' + error.message);
          }
        }

        function startPolling(sessionId) {
          pollInterval = setInterval(async () => {
            try {
              const response = await fetch(\`/api/verify/status/\${sessionId}\`);
              const data = await response.json();

              if (data.status === 'approved') {
                clearInterval(pollInterval);
                showResult(true, 'Verification Successful!',
                  'You have been verified as 21 or older.');
              } else if (data.status === 'rejected') {
                clearInterval(pollInterval);
                showResult(false, 'Verification Failed',
                  'You do not meet the age requirement.');
              } else if (data.status === 'expired') {
                clearInterval(pollInterval);
                showResult(false, 'Verification Expired',
                  'The verification request has expired. Please try again.');
              }
            } catch (error) {
              console.error('Polling error:', error);
            }
          }, 2000);
        }

        function showResult(success, title, message) {
          document.getElementById('qrcode').style.display = 'none';
          document.getElementById('result').style.display = 'block';
          document.getElementById('result-title').textContent = success ? '✅ ' + title : '❌ ' + title;
          document.getElementById('result-message').textContent = message;
        }
      </script>
    </body>
    </html>
  `);
});

// API: Create verification challenge
app.post('/api/verify/create', async (req, res) => {
  try {
    const { minAge } = req.body;

    // Create challenge with Cardless ID
    const challenge = await verifier.createChallenge({
      minAge: minAge || 21
    });

    // Create session
    const sessionId = Date.now().toString();
    sessions.set(sessionId, {
      challengeId: challenge.challengeId,
      status: 'pending',
      createdAt: Date.now()
    });

    // Clean up old sessions (older than 15 minutes)
    cleanupSessions();

    res.json({
      sessionId,
      qrCodeUrl: challenge.qrCodeUrl
    });

  } catch (error) {
    console.error('Error creating verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Check verification status
app.get('/api/verify/status/:sessionId', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check challenge status with Cardless ID
    const result = await verifier.verifyChallenge(session.challengeId);

    // Update session
    session.status = result.status;
    session.verified = result.verified;
    session.walletAddress = result.walletAddress;

    res.json({
      status: result.status,
      verified: result.verified,
      walletAddress: result.walletAddress
    });

  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optional: Webhook endpoint
app.post('/api/verify/webhook', (req, res) => {
  const { challengeId, approved, walletAddress, timestamp } = req.body;

  console.log('Webhook received:', {
    challengeId,
    approved,
    walletAddress,
    timestamp
  });

  // TODO: Update session status, trigger business logic, etc.

  res.sendStatus(200);
});

// Helper: Clean up old sessions
function cleanupSessions() {
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  for (const [sessionId, session] of sessions.entries()) {
    if (session.createdAt < fifteenMinutesAgo) {
      sessions.delete(sessionId);
    }
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`
🚀 Cardless ID Age Verification Demo

Server running at: http://localhost:\${PORT}

Make sure to set your API key:
export CARDLESSID_API_KEY=your_api_key_here

For local development:
export CARDLESSID_URL=http://localhost:5173
  \`);
});
