// This file contains the inlined llms.txt content for serving via the web route
// It's generated from the root llms.txt file to avoid filesystem issues in serverless environments

import fs from "fs";
import path from "path";

// Try to read at build time, fallback to placeholder
let LLMS_TXT_CONTENT: string;

try {
  // This will work during build time when the file system is available
  LLMS_TXT_CONTENT = fs.readFileSync(
    path.join(process.cwd(), "llms.txt"),
    "utf-8"
  );
} catch (error) {
  // Fallback content if file can't be read
  LLMS_TXT_CONTENT = `# Cardless ID

Error: llms.txt content could not be loaded.
Please check the deployment configuration.
`;
}

export { LLMS_TXT_CONTENT };
