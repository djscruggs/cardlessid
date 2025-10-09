/**
 * API endpoint for uploading ID photos and processing with Document AI
 */

import type { ActionFunctionArgs } from 'react-router';
import { processIdDocument, validateExtractedData } from '~/utils/document-ai.server';
import { createVerificationSession, updateVerificationSession } from '~/utils/verification.server';
import { saveIdPhoto } from '~/utils/photo-storage.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const imageData = formData.get('image') as string;
    const mimeType = formData.get('mimeType') as string || 'image/jpeg';

    if (!imageData) {
      return Response.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Process with Document AI
    const result = await processIdDocument(base64Data, mimeType);

    if (!result.success) {
      return Response.json({ 
        success: false,
        error: result.error || 'Failed to process document'
      }, { status: 400 });
    }
    // Validate extracted data
    const validation = validateExtractedData(result.extractedData || {});
    
    if (!validation.valid) {
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

    // Create verification session
    const session = await createVerificationSession(
      'custom',
      `custom_${Date.now()}`
    );

    // Save the ID photo
    const photoUrl = await saveIdPhoto(session.id, base64Data);

    // Update session with extracted data and photo
    // Only save minimal data - not the massive raw responses
    try {
      await updateVerificationSession(session.id, {
        documentAiData: {
          fraudSignalsCount: result.fraudSignals?.length || 0,
          fraudSignals: result.fraudSignals || [],
          hasData: !!result.extractedData
        },
        idPhotoUrl: photoUrl,
        verifiedData: result.extractedData as any,
      });
    } catch (error) {
      console.error('Update verification session error:', error);
    }

    return Response.json({
      success: true,
      sessionId: session.id,
      extractedData: result.extractedData,
      fraudSignals: result.fraudSignals || [],
      photoUrl,
      isExpired: validation.isExpired,
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error('Upload ID error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


