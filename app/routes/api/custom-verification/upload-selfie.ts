/**
 * API endpoint for uploading selfie and comparing with ID photo
 */

import type { ActionFunctionArgs } from 'react-router';
import { getVerificationSession, updateVerificationSession } from '~/utils/verification.server';
import { saveSelfiePhoto, readPhoto } from '~/utils/photo-storage.server';
import { compareFaces } from '~/utils/face-comparison.server';

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

    // Save the selfie photo
    const selfieUrl = await saveSelfiePhoto(sessionId, base64Data);

    // Read ID photo for comparison
    const idPhotoData = await readPhoto(session.idPhotoUrl);

    // Compare faces
    const comparisonResult = await compareFaces(idPhotoData, base64Data);

    // Update session with results
    await updateVerificationSession(sessionId, {
      selfiePhotoUrl: selfieUrl,
      faceMatchResult: comparisonResult,
      status: comparisonResult.match ? 'approved' : 'rejected',
    });

    return Response.json({
      success: true,
      match: comparisonResult.match,
      confidence: comparisonResult.confidence,
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


