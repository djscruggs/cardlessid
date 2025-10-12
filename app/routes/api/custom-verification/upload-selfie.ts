/**
 * API endpoint for uploading selfie, checking liveness, and comparing with ID photo
 */

import type { ActionFunctionArgs } from 'react-router';
import { getVerificationSession, updateVerificationSession } from '~/utils/verification.server';
import { saveSelfiePhoto, deletePhoto } from '~/utils/temp-photo-storage.server';
import { compareFaces, checkLiveness } from '~/utils/face-comparison.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let selfieUrl: string | null = null;

  try {
    const formData = await request.formData();
    
    // Debug: Log all form data keys received
    const receivedKeys = Array.from(formData.keys());
    console.log('[Upload Selfie] Received form data keys:', receivedKeys);
    
    const sessionId = formData.get('sessionId') as string;
    const selfieData = formData.get('selfie') as string;
    const idPhotoData = formData.get('idPhoto') as string;
    
    // Debug: Check each field
    console.log('[Upload Selfie] Field values:', {
      sessionId: sessionId ? `✓ ${sessionId.substring(0, 30)}...` : '✗ MISSING',
      selfie: selfieData ? `✓ ${selfieData.length} chars` : '✗ MISSING',
      idPhoto: idPhotoData ? `✓ ${idPhotoData.length} chars` : '✗ MISSING'
    });
    
    if (!sessionId || !selfieData || !idPhotoData) {
      const missingFields = [];
      if (!sessionId) missingFields.push('sessionId');
      if (!selfieData) missingFields.push('selfie');
      if (!idPhotoData) missingFields.push('idPhoto');
      
      console.error('[Upload Selfie] ❌ Missing required fields:', missingFields);
      return Response.json({ 
        error: 'Missing required fields',
        missingFields,
        receivedKeys
      }, { status: 400 });
    }

    // Get verification session
    const session = await getVerificationSession(sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // Remove data URL prefix if present
    const selfieBase64 = selfieData.replace(/^data:image\/\w+;base64,/, '');
    const idPhotoBase64 = idPhotoData.replace(/^data:image\/\w+;base64,/, '');

    // Step 1: Check for liveness
    console.log('[Upload Selfie] Performing liveness check...');
    const livenessResult = await checkLiveness(selfieBase64);

    if (!livenessResult.isLive) {
      console.warn('[Upload Selfie] Liveness check failed:', livenessResult.issues);
      // No photo saved yet, so nothing to delete
      return Response.json({
        success: false,
        error: livenessResult.error || 'Liveness check failed',
        issues: livenessResult.issues,
        livenessResult
      }, { status: 400 });
    }

    console.log('[Upload Selfie] Liveness check passed');

    // Step 2: Save the selfie photo temporarily
    selfieUrl = await saveSelfiePhoto(sessionId, selfieBase64);

    // Step 3: Compare faces using both photos from client (never stored on server/Firebase)
    console.log('[Upload Selfie] Comparing faces...');
    const comparisonResult = await compareFaces(idPhotoBase64, selfieBase64);

    if (comparisonResult.error) {
      console.error('[Upload Selfie] Face comparison error:', comparisonResult.error);
      // Delete selfie immediately on failure
      if (selfieUrl) await deletePhoto(selfieUrl);
      return Response.json({
        success: false,
        error: comparisonResult.error
      }, { status: 400 });
    }

    // Update session with results (no ID photo base64 to clear - it's on client)
    await updateVerificationSession(sessionId, {
      status: comparisonResult.match ? 'approved' : 'rejected',
      providerMetadata: {
        faceMatchResult: comparisonResult,
        livenessResult: livenessResult
      }
    });

    console.log('[Upload Selfie] Verification complete:', {
      match: comparisonResult.match,
      confidence: comparisonResult.confidence
    });

    // Delete selfie immediately after successful processing
    console.log('[Upload Selfie] Deleting selfie from disk after processing');
    if (selfieUrl) await deletePhoto(selfieUrl);

    return Response.json({
      success: true,
      match: comparisonResult.match,
      confidence: comparisonResult.confidence,
      livenessResult: {
        isLive: livenessResult.isLive,
        confidence: livenessResult.confidence,
        qualityScore: livenessResult.qualityScore
      },
      sessionId,
    });
  } catch (error) {
    console.error('Upload selfie error:', error);
    // Delete selfie on any unexpected error
    if (selfieUrl) await deletePhoto(selfieUrl);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


