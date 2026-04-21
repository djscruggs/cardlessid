/**
 * POST /api/verification/upload-selfie
 *
 * Accepts a selfie image and an optional pre-selfie video clip for passive liveness detection.
 * When a video is present, Azure Face API /detectliveness/singlemodal is used (in-memory,
 * nothing written to disk). When no video is provided, falls back to the existing AWS
 * Rekognition heuristic liveness check.
 *
 * Multipart fields:
 *   sessionId        string   — verification session ID
 *   selfie           string   — base64-encoded still frame (used as reference + face match)
 *   idPhoto          string   — base64-encoded ID photo for face comparison
 *   video            File?    — optional short video clip (mp4/webm, ≤10s) for Azure liveness
 */

import type { ActionFunctionArgs } from 'react-router';
import { getVerificationSession, updateVerificationSession } from '~/utils/verification.server';
import { saveSelfiePhoto, deletePhoto } from '~/utils/temp-photo-storage.server';
import { compareFaces, checkLiveness } from '~/utils/face-comparison.server';
import { checkPassiveLiveness } from '~/utils/azure-liveness.server';
import { isEEARequest } from '~/utils/geo.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (isEEARequest(request)) {
    return Response.json({ error: 'Service not available in your region' }, { status: 451 });
  }

  let selfieUrl: string | null = null;

  try {
    const formData = await request.formData();

    const sessionId = formData.get('sessionId') as string;
    const selfieData = formData.get('selfie') as string;
    const idPhotoData = formData.get('idPhoto') as string;
    const videoFile = formData.get('video') as File | null;

    console.log('[Upload Selfie] Received fields:', {
      sessionId: sessionId ? `✓ ${sessionId.substring(0, 30)}...` : '✗ MISSING',
      selfie: selfieData ? `✓ ${selfieData.length} chars` : '✗ MISSING',
      idPhoto: idPhotoData ? `✓ ${idPhotoData.length} chars` : '✗ MISSING',
      video: videoFile ? `✓ ${(videoFile.size / 1024).toFixed(1)}KB ${videoFile.type}` : '— not provided',
    });

    if (!sessionId || !selfieData || !idPhotoData) {
      const missingFields = [
        !sessionId && 'sessionId',
        !selfieData && 'selfie',
        !idPhotoData && 'idPhoto',
      ].filter(Boolean);
      return Response.json({ error: 'Missing required fields', missingFields }, { status: 400 });
    }

    const session = await getVerificationSession(sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const selfieBase64 = selfieData.replace(/^data:image\/\w+;base64,/, '');
    const idPhotoBase64 = idPhotoData.replace(/^data:image\/\w+;base64,/, '');

    // ── Liveness check ─────────────────────────────────────────────────────────
    let livenessResult: {
      isLive: boolean;
      confidence: number;
      qualityScore?: number;
      issues?: string[];
      livenessDecision?: string;
      provider: 'azure' | 'rekognition';
      error?: string;
    };

    const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10 MB
    if (videoFile && videoFile.size > MAX_VIDEO_BYTES) {
      return Response.json({ error: 'Video too large (max 10 MB)' }, { status: 413 });
    }

    if (videoFile && videoFile.size > 0) {
      // Passive liveness: Azure Face API — video + reference frame, fully in-memory
      console.log('[Upload Selfie] Running Azure passive liveness check...');
      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
      const azureResult = await checkPassiveLiveness(videoBuffer, videoFile.type || 'video/mp4', selfieBase64);

      livenessResult = {
        isLive: azureResult.isLive,
        confidence: azureResult.confidence,
        livenessDecision: azureResult.livenessDecision,
        provider: 'azure',
        error: azureResult.error,
      };
    } else {
      // Fallback: Rekognition heuristic (existing behaviour for clients without video)
      console.log('[Upload Selfie] No video provided — falling back to Rekognition liveness check...');
      const rekognitionResult = await checkLiveness(selfieBase64);

      livenessResult = {
        isLive: rekognitionResult.isLive,
        confidence: rekognitionResult.confidence,
        qualityScore: rekognitionResult.qualityScore,
        issues: rekognitionResult.issues,
        provider: 'rekognition',
        error: rekognitionResult.error,
      };
    }

    if (!livenessResult.isLive) {
      console.warn('[Upload Selfie] Liveness check failed:', livenessResult);
      return Response.json({
        success: false,
        error: livenessResult.error || 'Liveness check failed',
        issues: livenessResult.issues,
        livenessResult,
      }, { status: 400 });
    }

    console.log(`[Upload Selfie] Liveness passed (${livenessResult.provider}, confidence: ${livenessResult.confidence.toFixed(3)})`);

    // ── Save selfie temporarily for face comparison ─────────────────────────
    selfieUrl = await saveSelfiePhoto(sessionId, selfieBase64);

    // ── Face comparison ─────────────────────────────────────────────────────
    console.log('[Upload Selfie] Comparing faces...');
    const comparisonResult = await compareFaces(idPhotoBase64, selfieBase64);

    if (comparisonResult.error) {
      console.error('[Upload Selfie] Face comparison error:', comparisonResult.error);
      if (selfieUrl) await deletePhoto(selfieUrl);
      return Response.json({ success: false, error: comparisonResult.error }, { status: 400 });
    }

    // ── Update session ──────────────────────────────────────────────────────
    await updateVerificationSession(sessionId, {
      status: comparisonResult.match ? 'approved' : 'rejected',
      providerMetadata: {
        ...session.providerMetadata,
        faceMatchResult: comparisonResult,
        faceMatchConfidence: comparisonResult.confidence,
        livenessResult,
        livenessProvider: livenessResult.provider,
      },
    });

    console.log('[Upload Selfie] Verification complete:', {
      match: comparisonResult.match,
      confidence: comparisonResult.confidence,
    });

    if (selfieUrl) await deletePhoto(selfieUrl);

    return Response.json({
      success: true,
      match: comparisonResult.match,
      confidence: comparisonResult.confidence,
      livenessResult: {
        isLive: livenessResult.isLive,
        confidence: livenessResult.confidence,
        provider: livenessResult.provider,
        ...(livenessResult.livenessDecision && { livenessDecision: livenessResult.livenessDecision }),
        ...(livenessResult.qualityScore !== undefined && { qualityScore: livenessResult.qualityScore }),
      },
      sessionId,
    });
  } catch (error) {
    console.error('[Upload Selfie] Unexpected error:', error);
    if (selfieUrl) await deletePhoto(selfieUrl);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function loader() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
