/**
 * API endpoint for uploading selfie, checking liveness, and comparing with ID photo
 */

import type { ActionFunctionArgs } from 'react-router';
import { getVerificationSession, updateVerificationSession } from '~/utils/verification.server';
import { saveSelfiePhoto, readPhoto } from '~/utils/photo-storage.server';
import { compareFaces, checkLiveness } from '~/utils/face-comparison.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

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

    if (!session.idPhotoUrl) {
      return Response.json({ error: 'No ID photo found for this session' }, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Step 1: Check for liveness
    console.log('[Upload Selfie] Performing liveness check...');
    const livenessResult = await checkLiveness(base64Data);

    if (!livenessResult.isLive) {
      console.warn('[Upload Selfie] Liveness check failed:', livenessResult.issues);
      return Response.json({
        success: false,
        error: livenessResult.error || 'Liveness check failed',
        issues: livenessResult.issues,
        livenessResult
      }, { status: 400 });
    }

    console.log('[Upload Selfie] Liveness check passed');

    // Step 2: Save the selfie photo
    const selfieUrl = await saveSelfiePhoto(sessionId, base64Data);

    // Step 3: Read ID photo for comparison
    const idPhotoData = await readPhoto(session.idPhotoUrl);

    // Step 4: Compare faces
    console.log('[Upload Selfie] Comparing faces...');
    const comparisonResult = await compareFaces(idPhotoData, base64Data);

    if (comparisonResult.error) {
      console.error('[Upload Selfie] Face comparison error:', comparisonResult.error);
      return Response.json({
        success: false,
        error: comparisonResult.error
      }, { status: 400 });
    }

    // Update session with results
    await updateVerificationSession(sessionId, {
      selfiePhotoUrl: selfieUrl,
      faceMatchResult: comparisonResult,
      livenessResult: livenessResult,
      status: comparisonResult.match ? 'approved' : 'rejected',
    });

    console.log('[Upload Selfie] Verification complete:', {
      match: comparisonResult.match,
      confidence: comparisonResult.confidence
    });

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
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


