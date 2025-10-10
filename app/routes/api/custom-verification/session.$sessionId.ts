/**
 * API endpoint to fetch verification session data
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

    return Response.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



