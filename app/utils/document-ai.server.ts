/**
 * Google Document AI integration for ID document extraction
 * Processes ID photos and extracts structured data
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import type { VerifiedIdentity } from '~/types/verification';
import path from 'path';
import fs from 'fs';

const ID_FRAUD_ENDPOINT = process.env.ID_FRAUD_ENDPOINT;
const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const GOOGLE_CREDENTIALS_JSON = process.env.GOOGLE_CREDENTIALS_JSON;

if (!ID_FRAUD_ENDPOINT) {
  console.warn('Document AI fraud endpoint not set - ID_FRAUD_ENDPOINT is required for fraud detection');
}

if (!GOOGLE_CREDENTIALS_PATH && !GOOGLE_CREDENTIALS_JSON) {
  console.warn('Google credentials not configured - set either GOOGLE_APPLICATION_CREDENTIALS (file path) or GOOGLE_CREDENTIALS_JSON (JSON string)');
}

export interface FraudSignal {
  type: string;
  result: string;
}

export interface DocumentAIResult {
  success: boolean;
  extractedData?: Partial<VerifiedIdentity>;
  fraudSignals?: FraudSignal[];
  rawFraudResponse?: any;
  rawParseResponse?: any;
  error?: string;
}

export interface FraudCheckResult {
  success: boolean;
  fraudDetected: boolean;
  fraudSignals: FraudSignal[];
  rawResponse?: any;
  error?: string;
}

/**
 * Check for document fraud only (no data extraction)
 */
export async function checkDocumentFraud(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<FraudCheckResult> {
  if (!ID_FRAUD_ENDPOINT) {
    return {
      success: false,
      fraudDetected: false,
      fraudSignals: [],
      error: 'Document AI fraud endpoint not configured'
    };
  }

  try {
    const clientConfig = await getClientConfig();
    if ('error' in clientConfig) {
      return {
        success: false,
        fraudDetected: false,
        fraudSignals: [],
        error: clientConfig.error
      };
    }
    
    const client = new DocumentProcessorServiceClient(clientConfig);
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const fraudResult = await processWithEndpoint(
      client,
      ID_FRAUD_ENDPOINT,
      imageBuffer,
      mimeType
    );

    if (!fraudResult.success) {
      return {
        success: false,
        fraudDetected: true,
        fraudSignals: [],
        error: 'Document validation failed'
      };
    }

    const fraudSignals = extractFraudSignals(fraudResult.response);
    const fraudDetected = fraudSignals.some(signal => 
      signal.result && signal.result.toUpperCase() !== 'PASS'
    );

    return {
      success: true,
      fraudDetected,
      fraudSignals,
      rawResponse: fraudResult.response,
    };
  } catch (error) {
    return {
      success: false,
      fraudDetected: false,
      fraudSignals: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check fraud on both front and back of ID
 * Checks both sides and aggregates fraud signals
 */
export async function checkDocumentFraudBothSides(
  frontImageBase64: string,
  backImageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<FraudCheckResult> {
  if (!ID_FRAUD_ENDPOINT) {
    return {
      success: false,
      fraudDetected: false,
      fraudSignals: [],
      error: 'Document AI fraud endpoint not configured'
    };
  }

  // Check both sides in parallel
  const [frontCheck, backCheck] = await Promise.all([
    checkDocumentFraud(frontImageBase64, mimeType),
    checkDocumentFraud(backImageBase64, mimeType)
  ]);

  // If either check failed (not configured), return error
  if (!frontCheck.success || !backCheck.success) {
    return {
      success: false,
      fraudDetected: false,
      fraudSignals: [],
      error: frontCheck.error || backCheck.error || 'Fraud check failed'
    };
  }

  // Combine fraud signals from both sides
  const allSignals = [
    ...frontCheck.fraudSignals.map(s => ({ ...s, side: 'front' })),
    ...backCheck.fraudSignals.map(s => ({ ...s, side: 'back' }))
  ];

  const fraudDetected = frontCheck.fraudDetected || backCheck.fraudDetected;

  console.log('[Document AI] Both sides checked:', {
    frontFraudDetected: frontCheck.fraudDetected,
    backFraudDetected: backCheck.fraudDetected,
    totalSignals: allSignals.length
  });

  return {
    success: true,
    fraudDetected,
    fraudSignals: allSignals,
  };
}

/**
 * Process ID document image with Google Document AI (LEGACY - NOT USED)
 * @deprecated Use checkDocumentFraud() + AWS Textract instead
 * This function is kept for backward compatibility but is not used in the current flow
 */
export async function processIdDocument(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<DocumentAIResult> {
  if (!ID_FRAUD_ENDPOINT) {
    return {
      success: false,
      error: 'Document AI fraud endpoint not configured - ID_FRAUD_ENDPOINT is required'
    };
  }

  try {
    // Initialize Document AI client with credentials
    const clientConfig = await getClientConfig();
    if ('error' in clientConfig) {
      return {
        success: false,
        error: clientConfig.error
      };
    }
    
    const client = new DocumentProcessorServiceClient(clientConfig);
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Step 1: Check for fraud
    console.log('[Document AI] Step 1: Checking for fraud signals');
    const fraudResult = await processWithEndpoint(
      client,
      ID_FRAUD_ENDPOINT,
      imageBuffer,
      mimeType
    );

    if (!fraudResult.success) {
      return {
        success: false,
        error: `This is not a valid ID`
      };
    }

    const fraudSignals = extractFraudSignals(fraudResult.response);
    console.log('[Document AI] Fraud signals found:', fraudSignals.length);
    console.log(fraudSignals)

    // NOTE: This function no longer extracts data (use AWS Textract instead)
    // It only checks for fraud and returns signals
    return {
      success: true,
      extractedData: {},
      fraudSignals,
      rawFraudResponse: fraudResult.response,
    };
  } catch (error) {
    console.error('Document AI processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing document',
    };
  }
}

/**
 * Get Document AI client configuration from credentials
 */
async function getClientConfig(): Promise<any | { error: string }> {
  if (GOOGLE_CREDENTIALS_JSON) {
    console.log('[Document AI] Using GOOGLE_CREDENTIALS_JSON');
    try {
      const credentials = JSON.parse(GOOGLE_CREDENTIALS_JSON);
      return { credentials };
    } catch (parseError) {
      return { error: 'Invalid GOOGLE_CREDENTIALS_JSON format' };
    }
  } else if (GOOGLE_CREDENTIALS_PATH) {
    const resolvedPath = path.isAbsolute(GOOGLE_CREDENTIALS_PATH) 
      ? GOOGLE_CREDENTIALS_PATH 
      : path.resolve(process.cwd(), GOOGLE_CREDENTIALS_PATH);
    
    console.log('[Document AI] Using credentials file:', resolvedPath);
    
    if (!fs.existsSync(resolvedPath)) {
      return { error: `Credentials file not found at: ${resolvedPath}` };
    }
    
    try {
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      const credentials = JSON.parse(fileContent);
      
      if (!credentials.type || !credentials.project_id || !credentials.private_key) {
        return { error: 'Invalid credentials file - missing required fields' };
      }
      
      console.log('[Document AI] Credentials loaded successfully for project:', credentials.project_id);
      return { credentials };
    } catch (readError) {
      return { 
        error: `Failed to read credentials file: ${readError instanceof Error ? readError.message : 'Unknown error'}`
      };
    }
  }
  
  return { error: 'Google credentials not configured' };
}

/**
 * Process document with a specific endpoint
 */
async function processWithEndpoint(
  client: DocumentProcessorServiceClient,
  endpoint: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ success: true; response: any } | { success: false; error: string }> {
  try {
    const processorMatch = endpoint.match(/projects\/(.+?)\/locations\/(.+?)\/processors\/(.+?):process/);
    
    if (!processorMatch) {
      return {
        success: false,
        error: `Invalid endpoint format: ${endpoint}`
      };
    }

    const [, projectId, location, processorId] = processorMatch;
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    console.log('[Document AI] Processing with:', name);

    const [result] = await client.processDocument({
      name,
      rawDocument: {
        content: imageBuffer,
        mimeType,
      },
    });

    return {
      success: true,
      response: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extract fraud signals from fraud detection response
 */
function extractFraudSignals(result: any): FraudSignal[] {
  const document = result.document;
  if (!document || !document.entities) {
    return [];
  }

  const fraudSignals: FraudSignal[] = [];
  
  for (const entity of document.entities) {
    const entityType = entity.type || '';
    
    // Look for fraud-related entities
    if (entityType.toLowerCase().includes('fraud_signal')) {
      fraudSignals.push({
        type: entityType,
        result: entity.mentionText || entity.normalizedValue?.text || 'Unknown'
      });
    }
  }

  return fraudSignals;
}

/**
 * Extract identity fields from Document AI parse response
 */
function extractIdentityFields(result: any): Partial<VerifiedIdentity> {
  const document = result.document;
  if (!document || !document.entities) {
    return {};
  }

  const identityData: Partial<VerifiedIdentity> = {};
  let givenNames: string | undefined;
  let address: string | undefined;
  
  // Process entities - Google returns types with spaces and proper case
  for (const entity of document.entities) {
    const entityType = entity.type || '';
    // Prefer normalizedValue.text when available (especially for dates)
    const value = entity.normalizedValue?.text || entity.mentionText || '';
    
    if (!value) continue;
    
    // Map entity types to our identity fields
    switch (entityType.toLowerCase()) {
      case 'date of birth':
        identityData.birthDate = value; // Already in ISO format from normalizedValue
        break;
      
      case 'expiration date':
      case 'expiry date':
        identityData.expirationDate = value; // Already in ISO format from normalizedValue
        break;
      
      case 'document id':
      case 'id number':
      case 'license number':
        identityData.governmentId = value;
        break;
      
      case 'family name':
      case 'surname':
      case 'last name':
        identityData.lastName = value;
        break;
      
      case 'given names':
      case 'given name':
      case 'first name':
        // "Given Names" may contain both first and middle names
        givenNames = value;
        break;
      
      case 'middle name':
        identityData.middleName = value;
        break;
      
      case 'document type':
        identityData.idType = normalizeIdType(value);
        break;
      
      case 'state':
      case 'issuing state':
        identityData.state = value;
        break;
      
      case 'address':
        address = value;
        break;
    }
  }

  // Parse "Given Names" into firstName and possibly middleName
  if (givenNames) {
    const nameParts = givenNames.trim().split(/\s+/);
    if (nameParts.length === 1) {
      identityData.firstName = nameParts[0];
    } else if (nameParts.length >= 2) {
      identityData.firstName = nameParts[0];
      // If middleName not already set, use remaining parts as middle name
      if (!identityData.middleName) {
        identityData.middleName = nameParts.slice(1).join(' ');
      }
    }
  }

  // Extract state from address if not already set
  if (!identityData.state && address) {
    const stateFromAddress = extractStateFromAddress(address);
    if (stateFromAddress) {
      identityData.state = stateFromAddress;
    }
  }

  // Infer document type if not explicitly provided
  if (!identityData.idType) {
      identityData.idType = 'government_id';
  }


  return identityData;
}

/**
 * Extract state code from address string
 * Handles formats like "FAYETTEVILLE, AR 72701" or "City, ST ZIP"
 */
function extractStateFromAddress(address: string): string | null {
  // Common pattern: City, STATE ZIP
  // Look for 2-letter state code followed by zip code
  const stateZipPattern = /,\s*([A-Z]{2})\s+\d{5}/;
  const match = address.match(stateZipPattern);
  
  if (match) {
    return match[1];
  }
  
  // Fallback: look for any 2 uppercase letters that could be a state
  // This is less reliable but better than nothing
  const lines = address.split('\n');
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 2) {
      // Check the last part for state code
      const lastPart = parts[parts.length - 1].trim();
      const stateMatch = lastPart.match(/^([A-Z]{2})\s/);
      if (stateMatch) {
        return stateMatch[1];
      }
    }
  }
  
  return null;
}

/**
 * Split full name into firstName, middleName, lastName
 */
function splitFullName(fullName: string): {
  firstName?: string;
  middleName?: string;
  lastName?: string;
} {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 0) {
    return {};
  } else if (parts.length === 1) {
    return { firstName: parts[0] };
  } else if (parts.length === 2) {
    return { 
      firstName: parts[0],
      lastName: parts[1]
    };
  } else {
    // 3 or more parts: first, middle(s), last
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(' '),
      lastName: parts[parts.length - 1]
    };
  }
}

/**
 * Format birth date to ISO format (YYYY-MM-DD)
 */
function formatBirthDate(dateStr: string): string {
  // Try to parse various date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // Already in correct format
        return match[0];
      } else {
        // Convert MM/DD/YYYY or MM-DD-YYYY to YYYY-MM-DD
        const [, month, day, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }

  return dateStr; // Return as-is if no format matches
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
  console.log("data to validate")
  console.log(data)
  
  const requiredFields: (keyof VerifiedIdentity)[] = [
    'firstName',
    'lastName',
    'birthDate',
    'governmentId',
    // 'idType',
  ];

  const missingFields = requiredFields.filter(field => !data[field]);
  console.log("missingFields")
  console.log(missingFields)
  
  // Check if ID is expired
  let isExpired = false;
  const warnings: string[] = [];
  
  if (data.expirationDate) {
    const expirationDate = new Date(data.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare at midnight
    
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


