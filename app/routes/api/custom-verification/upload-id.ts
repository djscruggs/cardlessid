/**
 * API endpoint for uploading ID photos and processing with Google Document AI fraud detection + AWS Textract
 * Flow: Google fraud check first (fast), then AWS Textract extraction if valid
 * Supports both front-only and front+back images
 */

import type { ActionFunctionArgs } from 'react-router';
import { processIdDocument as extractWithTextract, processIdDocumentBothSides as extractBothSidesWithTextract, validateExtractedData } from '~/utils/textract.server';
import { checkDocumentFraud, checkDocumentFraudBothSides } from '~/utils/document-ai.server';
import { createVerificationSession, updateVerificationSession } from '~/utils/verification.server';
import { saveIdPhoto, deletePhoto } from '~/utils/temp-photo-storage.server';
import { generateDataHMAC, createVerificationToken } from '~/utils/data-integrity.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let photoUrl: string | null = null;
  let backPhotoUrl: string | null = null;

  try {
    const formData = await request.formData();
    const imageData = formData.get('image') as string;
    const backImageData = formData.get('backImage') as string | null;
    const mimeType = formData.get('mimeType') as string || 'image/jpeg';

    if (!imageData) {
      return Response.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const base64BackData = backImageData?.replace(/^data:image\/\w+;base64,/, '');

    // Create verification session first
    const session = await createVerificationSession(
      'custom',
      `custom_${Date.now()}`
    );

    // Save the ID photo(s) temporarily
    photoUrl = await saveIdPhoto(session.id, base64Data);
    if (base64BackData) {
      backPhotoUrl = await saveIdPhoto(session.id, base64BackData);
    }

    // Determine if we're processing both sides or just front
    const hasBothSides = !!base64BackData;
    console.log(`[Upload ID] Processing ${hasBothSides ? 'front and back' : 'front only'} of ID`);

    let fraudCheck: any;
    let result: any;

    if (hasBothSides) {
      // Step 1: Check both sides with Google Document AI (fraud only)
      console.log('[Upload ID] Step 1: Checking fraud on both sides...');
      fraudCheck = await checkDocumentFraudBothSides(base64Data, base64BackData!, mimeType);

      if (!fraudCheck.success) {
        console.error('[Upload ID] Fraud check failed:', fraudCheck.error);
        // Continue with Textract if Google is not configured
        if (fraudCheck.error?.includes('not configured')) {
          console.warn('[Upload ID] Google Document AI not configured, skipping fraud check');
        } else {
          if (photoUrl) await deletePhoto(photoUrl);
          if (backPhotoUrl) await deletePhoto(backPhotoUrl);
          return Response.json({
            success: false,
            error: fraudCheck.error || 'Failed to validate document'
          }, { status: 400 });
        }
      } else if (fraudCheck.fraudDetected) {
        // Fraud detected - block immediately
        console.warn('[Upload ID] Fraud detected on one or both sides:', fraudCheck.fraudSignals);
        if (photoUrl) await deletePhoto(photoUrl);
        if (backPhotoUrl) await deletePhoto(backPhotoUrl);
        return Response.json({
          success: false,
          error: 'Document verification failed - potential fraud detected',
          fraudDetected: true,
          fraudSignals: fraudCheck.fraudSignals,
        }, { status: 400 });
      }

      console.log('[Upload ID] Fraud check passed on both sides');

      // Step 2: Extract data with AWS Textract (both sides in single call)
      console.log('[Upload ID] Step 2: Extracting data from both sides with AWS Textract...');
      result = await extractBothSidesWithTextract(base64Data, base64BackData!, mimeType);
    } else {
      // Single side processing (original flow)
      // Step 1: Check for fraud with Google Document AI (fast, fails early)
      console.log('[Upload ID] Step 1: Checking document fraud...');
      fraudCheck = await checkDocumentFraud(base64Data, mimeType);

      if (!fraudCheck.success) {
        console.error('[Upload ID] Fraud check failed:', fraudCheck.error);
        // Continue anyway if Google is not configured, will use Textract only
        if (fraudCheck.error?.includes('not configured')) {
          console.warn('[Upload ID] Google Document AI not configured, skipping fraud check');
        } else {
          if (photoUrl) await deletePhoto(photoUrl);
          return Response.json({
            success: false,
            error: fraudCheck.error || 'Failed to validate document'
          }, { status: 400 });
        }
      } else if (fraudCheck.fraudDetected) {
        // Fraud detected - block immediately without calling AWS
        console.warn('[Upload ID] Fraud detected by Google Document AI:', fraudCheck.fraudSignals);
        if (photoUrl) await deletePhoto(photoUrl);
        return Response.json({
          success: false,
          error: 'Document verification failed - potential fraud detected',
          fraudDetected: true,
          fraudSignals: fraudCheck.fraudSignals,
        }, { status: 400 });
      }

      console.log('[Upload ID] Fraud check passed, proceeding to data extraction');

      // Step 2: Extract data with AWS Textract (only if fraud check passed)
      console.log('[Upload ID] Step 2: Extracting data with AWS Textract...');
      result = await extractWithTextract(base64Data, mimeType);
    }

    if (!result.success) {
      // Delete photos immediately on failure
      if (photoUrl) await deletePhoto(photoUrl);
      if (backPhotoUrl) await deletePhoto(backPhotoUrl);
      return Response.json({
        success: false,
        error: result.error || 'Failed to extract document data'
      }, { status: 400 });
    }

    // Validate extracted data
    const validation = validateExtractedData(result.extractedData || {});

    if (!validation.valid) {
      // Delete photos immediately on validation failure
      if (photoUrl) await deletePhoto(photoUrl);
      if (backPhotoUrl) await deletePhoto(backPhotoUrl);
      return Response.json({
        success: false,
        error: 'Unable to extract required information from ID',
        missingFields: validation.missingFields,
        extractedData: result.extractedData,
      }, { status: 400 });
    }

    // Check for expired ID (warning, not blocking)
    if (validation.isExpired) {
      console.warn('[Upload ID] Warning: Expired ID detected', validation.warnings);
    }

    // Generate HMAC for data integrity verification
    const dataHmac = generateDataHMAC(result.extractedData || {});
    const verificationToken = createVerificationToken(session.id, dataHmac);
    
    console.log('[Upload ID] Generated data integrity HMAC');

    // Update session with extracted data and HMAC
    try {
      await updateVerificationSession(session.id, {
        verifiedData: result.extractedData as any,
        providerMetadata: {
          lowConfidenceFields: result.lowConfidenceFields || [],
          fraudCheckPassed: true,
          extractionMethod: 'aws-textract',
          bothSidesProcessed: hasBothSides,
          dataHmac // Store HMAC in session for verification during credential issuance
        }
      });
    } catch (error) {
      console.error('Update verification session error:', error);
    }

    // Delete photos immediately after successful processing
    console.log(`[Upload ID] Deleting ID photo${hasBothSides ? 's' : ''} from disk - base64 stays on client`);
    if (photoUrl) await deletePhoto(photoUrl);
    if (backPhotoUrl) await deletePhoto(backPhotoUrl);

    return Response.json({
      success: true,
      sessionId: session.id,
      verificationToken, // Signed token containing sessionId + dataHmac + signature
      extractedData: result.extractedData,
      lowConfidenceFields: result.lowConfidenceFields || [],
      isExpired: validation.isExpired,
      warnings: validation.warnings,
      bothSidesProcessed: hasBothSides,
      // Fraud check info (passed, but worth surfacing)
      fraudCheck: {
        passed: true,
        signals: fraudCheck.fraudSignals || fraudCheck.signals || []  // Empty if no issues
      }
    });
  } catch (error) {
    console.error('Upload ID error:', error);
    // Delete photos on any unexpected error
    if (photoUrl) await deletePhoto(photoUrl);
    if (backPhotoUrl) await deletePhoto(backPhotoUrl);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


