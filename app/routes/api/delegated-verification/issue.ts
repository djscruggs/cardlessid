/**
 * POST /api/delegated-verification/issue
 *
 * Issue credentials via delegated verification
 * For use by trusted issuers (banks, DMVs, etc.) who have already verified identity
 *
 * Authentication: API key in request body
 */

import type { ActionFunctionArgs } from 'react-router';
import { verifyApiKey } from '~/utils/auth.server';
import { generateCompositeHash } from '~/utils/composite-hash.server';
import { createVerificationSession, updateVerificationSession } from '~/utils/verification.server';
import { issueCredential } from '~/utils/credential-issuance.server';
import type { VerifiedIdentity } from '~/types/verification';

interface DelegatedIssueRequest {
  apiKey: string;
  walletAddress: string;
  identity: {
    firstName: string;
    lastName: string;
    dateOfBirth: string; // YYYY-MM-DD
    documentNumber?: string;
    documentType?: 'drivers_license' | 'passport' | 'state_id';
    issuingCountry?: string;
    issuingState?: string;
  };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body: DelegatedIssueRequest = await request.json();
    const { apiKey, walletAddress, identity } = body;

    console.log('\n🔐 [DELEGATED VERIFICATION] Issue request received');

    // 1. Validate API key
    if (!apiKey) {
      return Response.json({ error: 'API key required' }, { status: 401 });
    }

    const issuer = await verifyApiKey(apiKey);
    if (!issuer) {
      console.error('[DELEGATED VERIFICATION] Invalid API key');
      return Response.json({ error: 'Invalid API key' }, { status: 401 });
    }

    console.log(`   Issuer: ${issuer.name} (${issuer.type})`);

    // 2. Validate wallet address (Algorand address format)
    if (!walletAddress || !/^[A-Z2-7]{58}$/.test(walletAddress)) {
      return Response.json(
        { error: 'Invalid Algorand wallet address. Must be 58 characters.' },
        { status: 400 }
      );
    }

    // 3. Validate required identity fields
    const { firstName, lastName, dateOfBirth } = identity;
    if (!firstName || !lastName || !dateOfBirth) {
      return Response.json(
        { error: 'Missing required identity fields: firstName, lastName, dateOfBirth' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return Response.json(
        { error: 'dateOfBirth must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   Identity: ${firstName} ${lastName}, DOB: ${dateOfBirth}`);

    // 4. Create verification session
    const session = await createVerificationSession(
      'delegated',
      `delegated_${issuer.id}_${Date.now()}`
    );

    console.log(`   Session ID: ${session.id}`);

    // 5. Generate composite hash
    const compositeHash = generateCompositeHash(firstName, lastName, dateOfBirth);

    // 6. Create verified identity object
    const verifiedIdentity: VerifiedIdentity = {
      firstName,
      lastName,
      dateOfBirth,
      documentNumber: identity.documentNumber,
      documentType: identity.documentType || 'state_id',
      issuingCountry: identity.issuingCountry || 'US',
      issuingState: identity.issuingState,
      compositeHash,
      evidence: {
        // Delegated verification - trust the issuer's existing verification
        fraudDetection: {
          performed: false,
          passed: true,
          method: 'delegated',
          provider: issuer.name,
          signals: []
        },
        documentAnalysis: {
          provider: issuer.name,
          bothSidesAnalyzed: false,
          lowConfidenceFields: [],
          qualityLevel: 'high' // Assume high quality from trusted issuer
        },
        biometricVerification: {
          performed: false,
          faceMatch: false,
          liveness: false
        }
      }
    };

    // 7. Update session
    await updateVerificationSession(session.id, {
      status: 'completed',
      verifiedData: verifiedIdentity,
      providerMetadata: {
        issuerName: issuer.name,
        issuerType: issuer.type,
        issuerId: issuer.id,
        delegatedVerification: true
      }
    });

    console.log(`   Composite hash: ${compositeHash}`);

    // 8. Issue credential to wallet
    const credential = await issueCredential(
      walletAddress,
      verifiedIdentity,
      session.id
    );

    console.log(`✓ [DELEGATED VERIFICATION] Credential issued`);
    console.log(`   Credential ID: ${credential.id}`);

    return Response.json({
      success: true,
      credentialId: credential.id,
      walletAddress,
      compositeHash,
      sessionId: session.id,
      issuer: {
        name: issuer.name,
        type: issuer.type
      }
    });
  } catch (error) {
    console.error('[DELEGATED VERIFICATION] Error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function loader() {
  return Response.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to issue credentials via delegated verification',
      documentation: '/docs/custom-verification-guide'
    },
    { status: 405 }
  );
}
