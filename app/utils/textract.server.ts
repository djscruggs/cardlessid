/**
 * AWS Textract integration for ID document extraction
 * Processes ID photos and extracts structured data
 */

import { TextractClient, AnalyzeIDCommand, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import type { VerifiedIdentity } from '~/types/verification';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const CONFIDENCE_THRESHOLD = parseFloat(process.env.AWS_TEXTRACT_CONFIDENCE_THRESHOLD || '80');

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.warn('AWS credentials not configured - set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
}

export interface TextractResult {
  success: boolean;
  extractedData?: Partial<VerifiedIdentity>;
  rawResponse?: any;
  error?: string;
  lowConfidenceFields?: string[];
}

/**
 * Process ID document image with AWS Textract
 * Uses AnalyzeID API for identity documents
 * @param imageBase64 Base64 encoded image data (without data:image prefix)
 * @param mimeType Image MIME type (e.g., 'image/jpeg', 'image/png')
 */
export async function processIdDocument(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<TextractResult> {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return {
      success: false,
      error: 'AWS credentials not configured'
    };
  }

  try {
    const client = new TextractClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    const imageBuffer = Buffer.from(imageBase64, 'base64');

    console.log('[Textract] Processing ID document...');

    // Use AnalyzeID API for identity documents
    const command = new AnalyzeIDCommand({
      DocumentPages: [
        {
          Bytes: imageBuffer,
        },
      ],
    });

    const response = await client.send(command);
    console.log('[Textract] Document processed successfully');

    // Extract identity fields from response
    const { extractedData, lowConfidenceFields } = extractIdentityFields(response);
    console.log('[Textract] Extracted data fields:', Object.keys(extractedData));

    if (lowConfidenceFields.length > 0) {
      console.warn('[Textract] Low confidence fields (quality warnings):', lowConfidenceFields);
    }

    return {
      success: true,
      extractedData,
      lowConfidenceFields,
      rawResponse: response,
    };
  } catch (error) {
    console.error('Textract processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing document',
    };
  }
}

/**
 * Extract identity fields from Textract AnalyzeID response
 */
function extractIdentityFields(response: any): {
  extractedData: Partial<VerifiedIdentity>;
  lowConfidenceFields: string[];
} {
  const identityData: Partial<VerifiedIdentity> = {};
  const lowConfidenceFields: string[] = [];

  if (!response.IdentityDocuments || response.IdentityDocuments.length === 0) {
    return { extractedData: identityData, lowConfidenceFields };
  }

  const document = response.IdentityDocuments[0];
  const fields = document.IdentityDocumentFields || [];

  for (const field of fields) {
    const fieldType = field.Type?.Text || '';
    const value = field.ValueDetection?.Text || '';
    const confidence = field.ValueDetection?.Confidence || 0;
    const normalized = field.ValueDetection?.NormalizedValue;

    if (!value) continue;

    // Debug: Show raw AWS data for each field
    console.log(`[Textract Debug] Field: ${fieldType}`);
    console.log(`  Raw value: "${value}"`);
    console.log(`  Confidence: ${confidence.toFixed(1)}%`);
    if (normalized) {
      console.log(`  Normalized value: "${normalized.Value}"`);
      console.log(`  Value type: ${normalized.ValueType}`);
    }

    // Track low confidence fields (quality warnings only)
    if (confidence < CONFIDENCE_THRESHOLD) {
      lowConfidenceFields.push(`${fieldType} (${confidence.toFixed(1)}%)`);
      console.log(`  ⚠️ Quality Warning: Low OCR confidence (${confidence.toFixed(1)}%)`);
    }

    // Map Textract field types to our identity fields
    switch (fieldType) {
      case 'FIRST_NAME':
        identityData.firstName = value;
        break;

      case 'MIDDLE_NAME':
        identityData.middleName = value;
        break;

      case 'LAST_NAME':
      case 'SURNAME':
        identityData.lastName = value;
        break;

      case 'DATE_OF_BIRTH':
        identityData.birthDate = normalizeDateFormat(value);
        break;

      case 'DATE_OF_EXPIRY':
      case 'EXPIRATION_DATE':
        identityData.expirationDate = normalizeDateFormat(value);
        break;

      case 'ID_NUMBER':
      case 'DOCUMENT_NUMBER':
        identityData.governmentId = value;
        break;

      case 'ID_TYPE':
      case 'DOCUMENT_TYPE':
        identityData.idType = normalizeIdType(value);
        break;

      case 'STATE':
      case 'STATE_NAME':
      case 'ISSUING_STATE':
        identityData.state = value;
        break;

      case 'ADDRESS':
        // Store full address, can extract state from it if needed
        if (!identityData.state) {
          const stateFromAddress = extractStateFromAddress(value);
          if (stateFromAddress) {
            identityData.state = stateFromAddress;
          }
        }
        break;
    }
  }

  // Infer document type if not explicitly provided
  if (!identityData.idType) {
    identityData.idType = 'government_id';
  }

  // Debug summary
  console.log(`[Textract Debug Summary]`);
  console.log(`  Total fields processed: ${fields.length}`);
  console.log(`  Low confidence fields: ${lowConfidenceFields.length}`);

  return { extractedData: identityData, lowConfidenceFields };
}

/**
 * Normalize date format to ISO (YYYY-MM-DD)
 * Handles various input formats from Textract
 */
function normalizeDateFormat(dateStr: string): string {
  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // MM/DD/YYYY
  const slashFormat = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashFormat) {
    const [, month, day, year] = slashFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // DD-MM-YYYY or MM-DD-YYYY
  const dashFormat = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashFormat) {
    const [, first, second, year] = dashFormat;
    // Assume MM-DD-YYYY for US IDs
    return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
  }

  // YYYYMMDD
  const compactFormat = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactFormat) {
    const [, year, month, day] = compactFormat;
    return `${year}-${month}-${day}`;
  }

  // Return as-is if no format matches
  return dateStr;
}

/**
 * Extract state code from address string
 */
function extractStateFromAddress(address: string): string | null {
  // Common pattern: City, STATE ZIP
  const stateZipPattern = /,\s*([A-Z]{2})\s+\d{5}/;
  const match = address.match(stateZipPattern);

  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Normalize ID type to standard values
 */
function normalizeIdType(typeStr: string): string {
  const lower = typeStr.toLowerCase();

  if (lower.includes('passport')) {
    return 'passport';
  }

  if (lower.includes('driver') || lower.includes('license') || lower.includes('dl')) {
    return 'drivers_license';
  }

  if (lower.includes('state') || lower.includes('government')) {
    return 'government_id';
  }

  return 'government_id'; // Default
}

/**
 * Validate extracted identity data
 */
export function validateExtractedData(data: Partial<VerifiedIdentity>): {
  valid: boolean;
  missingFields: string[];
  isExpired?: boolean;
  warnings?: string[];
} {
  console.log('[Textract] Validating extracted data:', data);

  const requiredFields: (keyof VerifiedIdentity)[] = [
    'firstName',
    'lastName',
    'birthDate',
    'governmentId',
  ];

  const missingFields = requiredFields.filter(field => !data[field]);
  console.log('[Textract] Missing fields:', missingFields);

  // Check if ID is expired
  let isExpired = false;
  const warnings: string[] = [];

  if (data.expirationDate) {
    const expirationDate = new Date(data.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expirationDate < today) {
      isExpired = true;
      warnings.push(`ID expired on ${data.expirationDate}`);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    isExpired,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate that Textract service is properly configured
 */
export function validateTextractConfig(): { valid: boolean; error?: string } {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return { valid: false, error: 'AWS credentials not configured' };
  }

  if (!AWS_REGION) {
    return { valid: false, error: 'AWS region not configured' };
  }

  return { valid: true };
}
