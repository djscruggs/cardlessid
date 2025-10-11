/**
 * API endpoint for uploading ID photos and processing with AWS Textract
 */

import type { ActionFunctionArgs } from 'react-router';
import { processIdDocument, validateExtractedData } from '~/utils/textract.server';
import { createVerificationSession, updateVerificationSession } from '~/utils/verification.server';
import { saveIdPhoto, deletePhoto } from '~/utils/temp-photo-storage.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let photoUrl: string | null = null;

  try {
    const formData = await request.formData();
    const imageData = formData.get('image') as string;
    const mimeType = formData.get('mimeType') as string || 'image/jpeg';

    if (!imageData) {
      return Response.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Create verification session first
    const session = await createVerificationSession(
      'custom',
      `custom_${Date.now()}`
    );

    // Save the ID photo temporarily
    photoUrl = await saveIdPhoto(session.id, base64Data);

    // Process with AWS Textract
    const result = await processIdDocument(base64Data, mimeType);

    if (!result.success) {
      // Delete photo immediately on failure
      if (photoUrl) await deletePhoto(photoUrl);
      return Response.json({
        success: false,
        error: result.error || 'Failed to process document'
      }, { status: 400 });
    }

    // Validate extracted data
    const validation = validateExtractedData(result.extractedData || {});

    if (!validation.valid) {
      // Delete photo immediately on validation failure
      if (photoUrl) await deletePhoto(photoUrl);
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

    // Update session with extracted data AND store ID photo base64 for later comparison
    try {
      await updateVerificationSession(session.id, {
        textractData: {
          lowConfidenceFields: result.lowConfidenceFields || [],
          hasData: !!result.extractedData
        },
        verifiedData: result.extractedData as any,
        idPhotoBase64: base64Data, // Store for face comparison later
      });
    } catch (error) {
      console.error('Update verification session error:', error);
    }

    // Delete photo immediately after successful processing
    console.log('[Upload ID] Deleting ID photo from disk after processing');
    if (photoUrl) await deletePhoto(photoUrl);

    return Response.json({
      success: true,
      sessionId: session.id,
      extractedData: result.extractedData,
      lowConfidenceFields: result.lowConfidenceFields || [],
      isExpired: validation.isExpired,
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error('Upload ID error:', error);
    // Delete photo on any unexpected error
    if (photoUrl) await deletePhoto(photoUrl);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


