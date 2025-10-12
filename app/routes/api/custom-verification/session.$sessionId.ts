/**
 * API endpoint to check verification session status (metadata only)
 * SECURITY: Does NOT return verified identity data - data is transient and only accessible via verificationToken
 */

import type { LoaderFunctionArgs } from 'react-router';
import { getVerificationSession } from '~/utils/verification.server';

export async function loader({ params }: LoaderFunctionArgs) {
  const { sessionId } = params;

  if (!sessionId) {
    return Response.json({ success: false, error: 'Session ID required' }, { status: 400 });
  }

  try {
    const session = await getVerificationSession(sessionId);

    if (!session) {
      return Response.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Return only metadata - NO verified identity data
    // Verified data is only accessible during credential creation with valid verificationToken
    return Response.json({
      success: true,
      session: {
        id: session.id,
        provider: session.provider,
        status: session.status,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        // Metadata about the verification (not the actual data)
        metadata: {
          fraudCheckPassed: session.providerMetadata?.fraudCheckPassed,
          bothSidesProcessed: session.providerMetadata?.bothSidesProcessed,
          extractionMethod: session.providerMetadata?.extractionMethod,
          hasVerifiedData: !!session.verifiedData,
          dataIntegrityProtected: !!session.providerMetadata?.dataHmac
        }
      }
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



