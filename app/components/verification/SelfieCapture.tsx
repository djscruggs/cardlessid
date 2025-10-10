/**
 * Selfie Capture Component
 * Captures selfie with face centering guide for verification
 */

import { useState, useRef, useEffect } from 'react';

interface SelfieCaptureProps {
  sessionId: string;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export function SelfieCapture({ sessionId, onSuccess, onError, onBack }: SelfieCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      onError('Unable to access camera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!capturedImage) {
      onError('Please capture a selfie');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('image', capturedImage);

      const response = await fetch('/api/custom-verification/upload-selfie', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result);
      } else {
        // Provide detailed error message if liveness check failed
        let errorMessage = result.error || 'Failed to process selfie';
        if (result.issues && result.issues.length > 0) {
          errorMessage += ': ' + result.issues.join(', ');
        }
        onError(errorMessage);
        setCapturedImage(null);
        startCamera();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unknown error');
      setCapturedImage(null);
      startCamera();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipForDev = () => {
    // Mock successful face match for development
    onSuccess({
      success: true,
      match: true,
      confidence: 0.95,
      sessionId: sessionId,
    });
  };

  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Take a Selfie</h2>
        <p className="text-gray-600 mb-2">
          Please center your face in the oval guide and take a clear selfie.
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>Ensure your face is well-lit and clearly visible</li>
          <li>Keep your eyes open and look at the camera</li>
          <li>Remove sunglasses or face coverings</li>
          <li>Hold your head straight and centered</li>
        </ul>
      </div>

      <div className="relative bg-black rounded-lg overflow-hidden">
        {!capturedImage ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full"
            />
            {/* Face guide overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Dark overlay with oval cutout */}
              <defs>
                <mask id="face-mask">
                  <rect width="100" height="100" fill="white" />
                  <ellipse cx="50" cy="45" rx="30" ry="38" fill="black" />
                </mask>
              </defs>
              <rect
                width="100"
                height="100"
                fill="rgba(0, 0, 0, 0.5)"
                mask="url(#face-mask)"
              />
              {/* Oval guide */}
              <ellipse
                cx="50"
                cy="45"
                rx="30"
                ry="38"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            </svg>
            {/* Helper text */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <div className="inline-block bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
                Center your face in the oval
              </div>
            </div>
          </div>
        ) : (
          <img
            src={capturedImage}
            alt="Captured selfie"
            className="w-full"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!capturedImage ? (
        <div className="space-y-3">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="btn btn-outline flex-1"
            >
              Back
            </button>
            <button
              type="button"
              onClick={captureSelfie}
              className="btn btn-primary flex-1"
            >
              Capture Selfie
            </button>
          </div>
          {isDevelopment && (
            <button
              type="button"
              onClick={handleSkipForDev}
              className="w-full px-4 py-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100"
            >
              ⚠️ Skip for Development (Mock Success)
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleRetake}
              disabled={isProcessing}
              className="btn btn-outline flex-1"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing}
              className="btn btn-primary flex-1"
            >
              {isProcessing ? 'Verifying...' : 'Submit'}
            </button>
          </div>
          {isDevelopment && (
            <button
              type="button"
              onClick={handleSkipForDev}
              disabled={isProcessing}
              className="w-full px-4 py-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100"
            >
              ⚠️ Skip for Development (Mock Success)
            </button>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">
            Verifying your selfie...
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Checking liveness and comparing with ID photo
          </p>
        </div>
      )}
    </div>
  );
}


