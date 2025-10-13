/**
 * Test AWS Setup
 * Validates AWS credentials and permissions for Textract and Rekognition
 *
 * Usage: node scripts/test-aws-setup.js
 */

import { TextractClient, AnalyzeIDCommand } from "@aws-sdk/client-textract";
import {
  RekognitionClient,
  CompareFacesCommand,
  DetectFacesCommand,
} from "@aws-sdk/client-rekognition";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) {
      console.error("❌ .env.local file not found");
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");

    lines.forEach((line) => {
      line = line.trim();
      if (line && !line.startsWith("#")) {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.error("❌ Error loading .env.local:", error.message);
    process.exit(1);
  }
}

// Check environment variables
function checkEnvVars() {
  console.log("\n📋 Checking Environment Variables...\n");

  const required = ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];

  const optional = [
    "AWS_REKOGNITION_THRESHOLD",
    "AWS_TEXTRACT_CONFIDENCE_THRESHOLD",
    "FACE_COMPARISON_PROVIDER",
  ];

  let allPresent = true;

  required.forEach((key) => {
    const value = process.env[key];
    if (
      !value ||
      value === "your_access_key_here" ||
      value === "your_secret_key_here"
    ) {
      console.log(`❌ ${key}: Missing or placeholder value`);
      allPresent = false;
    } else {
      // Mask sensitive values
      const display =
        key.includes("SECRET") || key.includes("KEY")
          ? value.substring(0, 8) + "..."
          : value;
      console.log(`✅ ${key}: ${display}`);
    }
  });

  optional.forEach((key) => {
    const value = process.env[key];
    if (value) {
      console.log(`✅ ${key}: ${value}`);
    } else {
      console.log(`⚠️  ${key}: Not set (will use default)`);
    }
  });

  if (!allPresent) {
    console.log(
      "\n❌ Please set all required environment variables in .env.local"
    );
    process.exit(1);
  }

  return true;
}

// Test AWS Textract
async function testTextract() {
  console.log("\n🔍 Testing AWS Textract...\n");

  try {
    const client = new TextractClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Create a minimal test image (1x1 white pixel PNG)
    const testImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64"
    );

    console.log("   → Attempting to call AnalyzeID API...");

    const command = new AnalyzeIDCommand({
      DocumentPages: [{ Bytes: testImage }],
    });

    try {
      await client.send(command);
      console.log("   ✅ Textract API accessible");
      console.log("   ✅ Permissions correct (textract:AnalyzeID)");
      console.log("   ⚠️  Note: Test image may not return data (expected)");
      return true;
    } catch (error) {
      if (error.name === "InvalidParameterException") {
        // This is actually good - it means we reached the API and have permissions
        console.log("   ✅ Textract API accessible");
        console.log("   ✅ Permissions correct (textract:AnalyzeID)");
        console.log(
          "   ℹ️  Invalid parameter error is expected with test image"
        );
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.log("   ❌ Textract test failed");
    console.log(`   Error: ${error.name}`);
    console.log(`   Message: ${error.message}`);

    if (
      error.name === "UnrecognizedClientException" ||
      error.name === "InvalidSignatureException"
    ) {
      console.log("\n   💡 This means your AWS credentials are incorrect");
      console.log(
        "   - Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local"
      );
      console.log("   - Verify they are from the correct AWS account");
    } else if (error.name === "AccessDeniedException") {
      console.log("\n   💡 Your credentials are valid but lack permissions");
      console.log("   - Go to AWS Console → IAM → Users → Your User");
      console.log("   - Ensure the user has textract:AnalyzeID permission");
      console.log(
        "   - You may need to attach AmazonTextractFullAccess policy"
      );
    } else if (error.name === "CredentialsProviderError") {
      console.log("\n   💡 Could not load AWS credentials");
      console.log(
        "   - Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set"
      );
    }

    return false;
  }
}

// Test AWS Rekognition
async function testRekognition() {
  console.log("\n👁️  Testing AWS Rekognition...\n");

  try {
    const client = new RekognitionClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Create a minimal test image (1x1 white pixel PNG)
    const testImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64"
    );

    // Test 1: DetectFaces
    console.log("   → Testing DetectFaces API (for liveness checks)...");
    try {
      const detectCommand = new DetectFacesCommand({
        Image: { Bytes: testImage },
        Attributes: ["ALL"],
      });

      await client.send(detectCommand);
      console.log("   ✅ DetectFaces API accessible");
      console.log("   ✅ Permissions correct (rekognition:DetectFaces)");
    } catch (error) {
      if (
        error.name === "InvalidImageFormatException" ||
        error.name === "InvalidParameterException"
      ) {
        console.log("   ✅ DetectFaces API accessible");
        console.log("   ✅ Permissions correct (rekognition:DetectFaces)");
        console.log("   ℹ️  Invalid image error is expected with test image");
      } else {
        throw error;
      }
    }

    // Test 2: CompareFaces
    console.log("\n   → Testing CompareFaces API (for face matching)...");
    try {
      const compareCommand = new CompareFacesCommand({
        SourceImage: { Bytes: testImage },
        TargetImage: { Bytes: testImage },
        SimilarityThreshold: 80,
      });

      await client.send(compareCommand);
      console.log("   ✅ CompareFaces API accessible");
      console.log("   ✅ Permissions correct (rekognition:CompareFaces)");
    } catch (error) {
      if (
        error.name === "InvalidImageFormatException" ||
        error.name === "InvalidParameterException"
      ) {
        console.log("   ✅ CompareFaces API accessible");
        console.log("   ✅ Permissions correct (rekognition:CompareFaces)");
        console.log("   ℹ️  Invalid image error is expected with test image");
      } else {
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.log("   ❌ Rekognition test failed");
    console.log(`   Error: ${error.name}`);
    console.log(`   Message: ${error.message}`);

    if (
      error.name === "UnrecognizedClientException" ||
      error.name === "InvalidSignatureException"
    ) {
      console.log("\n   💡 This means your AWS credentials are incorrect");
      console.log(
        "   - Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local"
      );
    } else if (error.name === "AccessDeniedException") {
      console.log("\n   💡 Your credentials are valid but lack permissions");
      console.log("   - Go to AWS Console → IAM → Users → Your User");
      console.log("   - Ensure the user has these permissions:");
      console.log("     - rekognition:CompareFaces");
      console.log("     - rekognition:DetectFaces");
      console.log(
        "   - You may need to attach AmazonRekognitionFullAccess policy"
      );
    }

    return false;
  }
}

// Main test function
async function runTests() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("   AWS Setup Test for Cardless ID Verification");
  console.log("═══════════════════════════════════════════════════════");

  // Load environment
  loadEnv();

  // Check env vars
  const envOk = checkEnvVars();
  if (!envOk) return;

  // Run tests
  const textractOk = await testTextract();
  const rekognitionOk = await testRekognition();

  // Summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("   Test Summary");
  console.log("═══════════════════════════════════════════════════════\n");

  if (textractOk && rekognitionOk) {
    console.log("✅ All tests passed!");
    console.log("\nYour AWS setup is correct. You can now:");
    console.log(
      "1. Set FACE_COMPARISON_PROVIDER=aws-rekognition in .env.local"
    );
    console.log("2. Run: npm run dev");
    console.log("3. Navigate to /app/custom-verify");
    console.log("4. Test the verification flow with real photos");
  } else {
    console.log("❌ Some tests failed");
    console.log("\nPlease fix the issues above and run this test again.");
    console.log("\nFor detailed setup instructions, see:");
    console.log("docs/AWS_SETUP.md");
    process.exit(1);
  }

  console.log("\n═══════════════════════════════════════════════════════\n");
}

// Run the tests
runTests().catch((error) => {
  console.error("\n❌ Unexpected error:", error);
  process.exit(1);
});
