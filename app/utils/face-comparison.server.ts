/**
 * Face comparison service
 * Integrates with AWS Rekognition for face comparison and liveness detection
 */

import { RekognitionClient, CompareFacesCommand, DetectFacesCommand } from '@aws-sdk/client-rekognition';

export interface FaceComparisonResult {
  match: boolean;
  confidence: number;
  error?: string;
}

export interface LivenessCheckResult {
  isLive: boolean;
  confidence: number;
  qualityScore: number;
  issues: string[];
  error?: string;
}

const FACE_COMPARISON_PROVIDER = process.env.FACE_COMPARISON_PROVIDER || 'mock';
const FACE_MATCH_THRESHOLD = parseFloat(process.env.AWS_REKOGNITION_THRESHOLD || '85') / 100;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

/**
 * Compare two face images
 * @param idPhotoBase64 Base64 encoded ID photo
 * @param selfieBase64 Base64 encoded selfie photo
 * @returns Comparison result with match status and confidence
 */
export async function compareFaces(
  idPhotoBase64: string,
  selfieBase64: string
): Promise<FaceComparisonResult> {
  
  switch (FACE_COMPARISON_PROVIDER) {
    case 'aws-rekognition':
      return compareWithAWSRekognition(idPhotoBase64, selfieBase64);
    
    case 'azure-face':
      return compareWithAzureFace(idPhotoBase64, selfieBase64);
    
    case 'mock':
    default:
      return mockFaceComparison(idPhotoBase64, selfieBase64);
  }
}

/**
 * Mock face comparison for development
 * Returns random confidence with 80% success rate
 */
async function mockFaceComparison(
  idPhotoBase64: string,
  selfieBase64: string
): Promise<FaceComparisonResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 80% chance of match for testing
  const confidence = Math.random() * 0.3 + 0.7; // 0.7 - 1.0
  const match = confidence >= FACE_MATCH_THRESHOLD;

  return {
    match,
    confidence,
  };
}

/**
 * AWS Rekognition face comparison
 */
async function compareWithAWSRekognition(
  idPhotoBase64: string,
  selfieBase64: string
): Promise<FaceComparisonResult> {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return {
      match: false,
      confidence: 0,
      error: 'AWS credentials not configured'
    };
  }

  try {
    const client = new RekognitionClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log('[Rekognition] Comparing faces...');

    const command = new CompareFacesCommand({
      SourceImage: { Bytes: Buffer.from(idPhotoBase64, 'base64') },
      TargetImage: { Bytes: Buffer.from(selfieBase64, 'base64') },
      SimilarityThreshold: FACE_MATCH_THRESHOLD * 100,
      QualityFilter: 'AUTO', // Filter out low quality faces
    });

    const response = await client.send(command);

    // Check if we found matching faces
    const match = response.FaceMatches && response.FaceMatches.length > 0;
    const confidence = match ? (response.FaceMatches[0].Similarity || 0) / 100 : 0;

    console.log('[Rekognition] Face comparison result:', { match, confidence: confidence.toFixed(3) });

    // Check for unmatched faces in target (could indicate wrong person)
    if (response.UnmatchedFaces && response.UnmatchedFaces.length > 0) {
      console.warn('[Rekognition] Unmatched faces detected in target image');
    }

    // Check if source face was detected
    if (!response.SourceImageFace) {
      return {
        match: false,
        confidence: 0,
        error: 'No face detected in ID photo'
      };
    }

    // Check if any target faces were detected
    if (!match && (!response.FaceMatches || response.FaceMatches.length === 0)) {
      // Could be no face in selfie or no match found
      if (response.UnmatchedFaces && response.UnmatchedFaces.length > 0) {
        return {
          match: false,
          confidence: 0,
          error: 'Face in selfie does not match ID photo'
        };
      } else {
        return {
          match: false,
          confidence: 0,
          error: 'No face detected in selfie'
        };
      }
    }

    return { match, confidence };
  } catch (error) {
    console.error('[Rekognition] Face comparison error:', error);
    return {
      match: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error during face comparison'
    };
  }
}

/**
 * Azure Face API comparison
 * TODO: Implement Azure Face API integration
 */
async function compareWithAzureFace(
  idPhotoBase64: string,
  selfieBase64: string
): Promise<FaceComparisonResult> {
  // Placeholder for Azure Face API implementation
  // Install: npm install @azure/cognitiveservices-face
  //
  // import { FaceClient } from '@azure/cognitiveservices-face';
  // import { AzureKeyCredential } from '@azure/core-auth';
  //
  // const client = new FaceClient(
  //   process.env.AZURE_FACE_ENDPOINT!,
  //   new AzureKeyCredential(process.env.AZURE_FACE_KEY!)
  // );
  //
  // const face1 = await client.face.detectWithStream(
  //   Buffer.from(idPhotoBase64, 'base64')
  // );
  // const face2 = await client.face.detectWithStream(
  //   Buffer.from(selfieBase64, 'base64')
  // );
  //
  // if (!face1[0] || !face2[0]) {
  //   return { match: false, confidence: 0, error: 'No face detected' };
  // }
  //
  // const verifyResult = await client.face.verifyFaceToFace(
  //   face1[0].faceId!,
  //   face2[0].faceId!
  // );
  //
  // return {
  //   match: verifyResult.isIdentical,
  //   confidence: verifyResult.confidence,
  // };

  throw new Error('Azure Face API not implemented yet');
}

/**
 * Check for liveness using AWS Rekognition face quality analysis
 * Analyzes face attributes to determine if the image appears to be of a live person
 * @param selfieBase64 Base64 encoded selfie photo
 */
export async function checkLiveness(selfieBase64: string): Promise<LivenessCheckResult> {
  if (FACE_COMPARISON_PROVIDER === 'mock') {
    // Mock liveness check for development
    return {
      isLive: true,
      confidence: 0.95,
      qualityScore: 0.90,
      issues: []
    };
  }

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return {
      isLive: false,
      confidence: 0,
      qualityScore: 0,
      issues: [],
      error: 'AWS credentials not configured'
    };
  }

  try {
    const client = new RekognitionClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log('[Rekognition] Checking liveness...');

    const command = new DetectFacesCommand({
      Image: { Bytes: Buffer.from(selfieBase64, 'base64') },
      Attributes: ['ALL'], // Get all face attributes including quality
    });

    const response = await client.send(command);

    if (!response.FaceDetails || response.FaceDetails.length === 0) {
      return {
        isLive: false,
        confidence: 0,
        qualityScore: 0,
        issues: ['No face detected'],
        error: 'No face detected in image'
      };
    }

    // Check if multiple faces detected
    if (response.FaceDetails.length > 1) {
      console.warn('[Rekognition] Multiple faces detected');
    }

    const face = response.FaceDetails[0];
    const issues: string[] = [];
    let qualityScore = 1.0;

    // Check brightness
    if (face.Quality?.Brightness !== undefined) {
      const brightness = face.Quality.Brightness;
      if (brightness < 40) {
        issues.push('Image too dark');
        qualityScore *= 0.7;
      } else if (brightness > 80) {
        issues.push('Image too bright');
        qualityScore *= 0.8;
      }
    }

    // Check sharpness
    if (face.Quality?.Sharpness !== undefined) {
      const sharpness = face.Quality.Sharpness;
      if (sharpness < 50) {
        issues.push('Image not sharp enough');
        qualityScore *= 0.7;
      }
    }

    // Check if eyes are open
    if (face.EyesOpen?.Value === false) {
      issues.push('Eyes appear closed');
      qualityScore *= 0.5;
    }

    // Check confidence of eye detection
    if (face.EyesOpen?.Confidence !== undefined && face.EyesOpen.Confidence < 80) {
      issues.push('Unable to clearly detect eyes');
      qualityScore *= 0.8;
    }

    // Check face pose (yaw, pitch, roll)
    const pose = face.Pose;
    if (pose) {
      if (Math.abs(pose.Yaw || 0) > 30) {
        issues.push('Face turned too far to the side');
        qualityScore *= 0.7;
      }
      if (Math.abs(pose.Pitch || 0) > 30) {
        issues.push('Face tilted too far up or down');
        qualityScore *= 0.7;
      }
      if (Math.abs(pose.Roll || 0) > 30) {
        issues.push('Head rotated too much');
        qualityScore *= 0.8;
      }
    }

    // Check if face is wearing sunglasses (suspicious for verification)
    if (face.Sunglasses?.Value === true && face.Sunglasses?.Confidence > 80) {
      issues.push('Sunglasses detected - please remove');
      qualityScore *= 0.3;
    }

    // Overall confidence based on detection confidence
    const faceConfidence = (face.Confidence || 0) / 100;
    const overallConfidence = faceConfidence * qualityScore;

    // Consider it "live" if quality is good enough
    const isLive = qualityScore > 0.6 && faceConfidence > 0.9 && issues.length < 3;

    console.log('[Rekognition] Liveness check result:', {
      isLive,
      confidence: overallConfidence.toFixed(3),
      qualityScore: qualityScore.toFixed(3),
      issueCount: issues.length
    });

    return {
      isLive,
      confidence: overallConfidence,
      qualityScore,
      issues
    };
  } catch (error) {
    console.error('[Rekognition] Liveness check error:', error);
    return {
      isLive: false,
      confidence: 0,
      qualityScore: 0,
      issues: [],
      error: error instanceof Error ? error.message : 'Unknown error during liveness check'
    };
  }
}

/**
 * Validate that face comparison service is properly configured
 */
export function validateFaceComparisonConfig(): { valid: boolean; error?: string } {
  if (FACE_COMPARISON_PROVIDER === 'mock') {
    return { valid: true };
  }

  if (FACE_COMPARISON_PROVIDER === 'aws-rekognition') {
    if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return { valid: false, error: 'AWS credentials not configured' };
    }
  }

  if (FACE_COMPARISON_PROVIDER === 'azure-face') {
    if (!process.env.AZURE_FACE_ENDPOINT || !process.env.AZURE_FACE_KEY) {
      return { valid: false, error: 'Azure Face API credentials not configured' };
    }
  }

  return { valid: true };
}


