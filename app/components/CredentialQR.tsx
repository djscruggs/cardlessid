import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface CredentialQRProps {
  credential: any;
  onClose?: () => void;
}

export default function CredentialQR({ credential, onClose }: CredentialQRProps) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setIsLoading(true);
        
        // Create a credential offer object that the mobile app can understand
        const credentialOffer = {
          type: 'credential-offer',
          version: '1.0',
          issuer: credential.issuer.id,
          credential: credential,
          timestamp: new Date().toISOString(),
          // Add any additional metadata for the mobile app
          metadata: {
            title: 'Age Verification Credential',
            description: 'Proof of age verification for decentralized identity',
            category: 'identity',
            issuerName: 'Cardless ID',
            issuerLogo: '/logo.png', // Optional: path to issuer logo
          }
        };

        // Generate QR code with the credential offer
        const qrDataURL = await QRCode.toDataURL(JSON.stringify(credentialOffer), {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });

        setQrCodeDataURL(qrDataURL);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (credential) {
      generateQRCode();
    }
  }, [credential]);

  const handleDownloadQR = () => {
    if (qrCodeDataURL) {
      const link = document.createElement('a');
      link.download = `credential-${credential.id}.png`;
      link.href = qrCodeDataURL;
      link.click();
    }
  };

  const handleCopyCredential = () => {
    navigator.clipboard.writeText(JSON.stringify(credential, null, 2));
    alert('Credential copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-2">Generating QR code...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Credential QR Code</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Scan this QR code with your mobile app to receive your credential
          </p>
          
          {qrCodeDataURL && (
            <div className="mb-4">
              <img 
                src={qrCodeDataURL} 
                alt="Credential QR Code"
                className="mx-auto border border-gray-200 rounded-lg"
              />
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleDownloadQR}
              className="btn btn-primary btn-sm w-full"
            >
              Download QR Code
            </button>
            
            <button
              onClick={handleCopyCredential}
              className="btn btn-outline btn-sm w-full"
            >
              Copy Credential JSON
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Next steps:</strong>
            </p>
            <ol className="text-xs text-blue-700 mt-1 space-y-1">
              <li>1. Open your mobile app</li>
              <li>2. Tap "Scan QR Code"</li>
              <li>3. Point camera at this QR code</li>
              <li>4. Review and accept the credential</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
