/**
 * Azure Face API passive liveness detection (sessionless)
 * POST /detectliveness/singlemodal — submits a short video + reference frame in-memory.
 * No data is written to disk; buffers are GC'd after the request completes.
 *
 * ISO/IEC 30107-3 note: this endpoint is NOT ISO-certified. See README.md
 * (Liveness Detection → Future: ISO-certified liveness) for the migration plan.
 */

const AZURE_FACE_ENDPOINT = process.env.AZURE_FACE_ENDPOINT; // e.g. https://<region>.api.cognitive.microsoft.com
const AZURE_FACE_KEY = process.env.AZURE_FACE_KEY;
const AZURE_FACE_API_VERSION = '2024-11-15-preview';
const LIVENESS_THRESHOLD = parseFloat(process.env.AZURE_LIVENESS_THRESHOLD || '0.5');

export interface AzureLivenessResult {
  isLive: boolean;
  confidence: number;
  livenessDecision: 'realface' | 'spoofface' | 'uncertain';
  error?: string;
}

/**
 * Check passive liveness using Azure Face API detectliveness/singlemodal.
 * Accepts video as a Buffer (never touches disk) and a reference still frame (base64).
 * @param videoBuffer Raw video bytes (mp4/webm, ≤10s, ≥15fps, ≥480p)
 * @param videoMimeType MIME type of the video (e.g. 'video/mp4')
 * @param referenceFrameBase64 Base64-encoded still frame extracted from the video
 * @returns Liveness decision with confidence score
 */
export async function checkPassiveLiveness(
  videoBuffer: Buffer,
  videoMimeType: string,
  referenceFrameBase64: string
): Promise<AzureLivenessResult> {
  if (!AZURE_FACE_ENDPOINT || !AZURE_FACE_KEY) {
    console.warn('[Azure Liveness] Credentials not configured — returning mock pass');
    return { isLive: true, confidence: 0.95, livenessDecision: 'realface' };
  }

  const url = `${AZURE_FACE_ENDPOINT}/face/v1.2-preview.1/detectliveness/singlemodal`;

  const boundary = `----CardlessIDBoundary${Date.now()}`;
  const referenceFrameBytes = Buffer.from(referenceFrameBase64, 'base64');

  // Build multipart body manually — no disk I/O, pure buffers
  const parts: Buffer[] = [];

  const addPart = (name: string, contentType: string, data: Buffer, filename?: string) => {
    const header = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="${name}"${filename ? `; filename="${filename}"` : ''}`,
      `Content-Type: ${contentType}`,
      '',
      '',
    ].join('\r\n');
    parts.push(Buffer.from(header), data, Buffer.from('\r\n'));
  };

  addPart('videoContent', videoMimeType, videoBuffer, 'liveness.mp4');
  addPart('referenceImage', 'image/jpeg', referenceFrameBytes, 'reference.jpg');
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  try {
    console.log(`[Azure Liveness] Sending ${(videoBuffer.length / 1024).toFixed(1)}KB video for liveness check`);

    const response = await fetch(`${url}?api-version=${AZURE_FACE_API_VERSION}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_FACE_KEY,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Azure Liveness] API error:', response.status, errorText);
      return {
        isLive: false,
        confidence: 0,
        livenessDecision: 'uncertain',
        error: `Azure API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json() as {
      livenessDecision: 'realface' | 'spoofface' | 'uncertain';
      target?: { faceRectangle?: object; fileName?: string; timeOffsetWithinFile?: number };
      modelVersionUsed?: string;
    };

    console.log('[Azure Liveness] Decision:', data.livenessDecision);

    // Azure doesn't return a numeric confidence — map decision to a score
    const confidenceMap: Record<string, number> = {
      realface: 0.95,
      spoofface: 0.05,
      uncertain: 0.4,
    };

    const confidence = confidenceMap[data.livenessDecision] ?? 0.4;
    const isLive = data.livenessDecision === 'realface' && confidence >= LIVENESS_THRESHOLD;

    return {
      isLive,
      confidence,
      livenessDecision: data.livenessDecision,
    };
  } catch (error) {
    console.error('[Azure Liveness] Request error:', error);
    return {
      isLive: false,
      confidence: 0,
      livenessDecision: 'uncertain',
      error: error instanceof Error ? error.message : 'Unknown error during liveness check',
    };
  }
}

/**
 * Validate Azure liveness credentials are configured
 * @returns Validation result
 */
export function validateAzureLivenessConfig(): { valid: boolean; error?: string } {
  if (!AZURE_FACE_ENDPOINT) return { valid: false, error: 'AZURE_FACE_ENDPOINT not set' };
  if (!AZURE_FACE_KEY) return { valid: false, error: 'AZURE_FACE_KEY not set' };
  return { valid: true };
}
