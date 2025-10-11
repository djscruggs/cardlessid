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
    const sessionId = formData.get('sessionId') as string;
    const imageData = formData.get('image') as string;

    if (!sessionId || !imageData) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get verification session
    const session = await getVerificationSession(sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if ID photo base64 is available in session
    if (!session.idPhotoBase64) {
      return Response.json({ error: 'No ID photo data found for this session' }, { status: 400 });
    }

    // Remove data URL prefix if present
    const selfieBase64 = imageData.replace(/^data:image\/\w+;base64,/, '');

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

    // Step 3: Compare faces using base64 data from session (ID photo) and new selfie
    console.log('[Upload Selfie] Comparing faces...');
    const comparisonResult = await compareFaces(session.idPhotoBase64, selfieBase64);

    if (comparisonResult.error) {
      console.error('[Upload Selfie] Face comparison error:', comparisonResult.error);
      // Delete selfie immediately on failure
      if (selfieUrl) await deletePhoto(selfieUrl);
      return Response.json({
        success: false,
        error: comparisonResult.error
      }, { status: 400 });
    }

    // Update session with results and remove stored ID photo base64
    await updateVerificationSession(sessionId, {
      faceMatchResult: comparisonResult,
      livenessResult: livenessResult,
      status: comparisonResult.match ? 'approved' : 'rejected',
      idPhotoBase64: null, // Clear the stored base64 data after use
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


