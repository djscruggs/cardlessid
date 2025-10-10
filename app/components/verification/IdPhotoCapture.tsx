/**
 * ID Photo Capture Component
 * Allows user to upload or capture a photo of their government ID
 */

import { useState, useRef } from 'react';

interface IdPhotoCaptureProps {
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
}

export function IdPhotoCapture({ onSuccess, onError }: IdPhotoCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setUseCamera(true);
    } catch (err) {
      onError('Unable to access camera. Please upload a photo instead.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPreviewUrl(dataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const handleSubmit = async () => {
    if (!previewUrl) {
      onError('Please capture or select a photo');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('image', previewUrl);
      formData.append('mimeType', 'image/jpeg');

      const response = await fetch('/api/custom-verification/upload-id', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result);
      } else {
        onError(result.error || 'Failed to process ID');
        setPreviewUrl(null);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unknown error');
      setPreviewUrl(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Take a Photo of Your ID</h2>
        <p className="text-gray-600">
          Please photograph your government-issued ID (driver's license, passport, or state ID).
          Make sure all information is clearly visible.
        </p>
      </div>

      {!previewUrl && !useCamera && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="id-photo-input"
            />
            <label
              htmlFor="id-photo-input"
              className="cursor-pointer inline-block"
            >
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-blue-600 hover:text-blue-700 font-medium">
                Upload a photo
              </span>
            </label>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={startCamera}
              className="btn btn-primary"
            >
              Use Camera
            </button>
          </div>
        </div>
      )}

      {useCamera && (
        <div className="space-y-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg"
          />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="btn btn-primary flex-1"
            >
              Capture Photo
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {previewUrl && !useCamera && (
        <div className="space-y-4">
          <img
            src={previewUrl}
            alt="ID preview"
            className="w-full rounded-lg border"
          />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing}
              className="btn btn-primary flex-1"
            >
              {isProcessing ? 'Processing...' : 'Process ID'}
            </button>
            <button
              type="button"
              onClick={handleRetake}
              disabled={isProcessing}
              className="btn btn-outline flex-1"
            >
              Retake
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">
            Extracting information from your ID...
          </p>
        </div>
      )}
    </div>
  );
}


