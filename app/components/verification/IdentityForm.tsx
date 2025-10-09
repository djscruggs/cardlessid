/**
 * Identity Verification Form Component
 * Displays extracted data from ID in read-only mode for user confirmation
 */

import type { VerifiedIdentity } from '~/types/verification';

interface IdentityFormProps {
  data: Partial<VerifiedIdentity>;
  onConfirm: () => void;
  onBack: () => void;
}

export function IdentityForm({ data, onConfirm, onBack }: IdentityFormProps) {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      // Parse ISO date string as local date to avoid timezone shifts
      // Input format: YYYY-MM-DD
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatIdType = (idType: string | undefined) => {
    if (!idType) return '';
    const types: Record<string, string> = {
      'drivers_license': "Driver's License",
      'passport': 'Passport',
      'government_id': 'Government ID',
    };
    return types[idType] || idType;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Confirm Your Information</h2>
        <p className="text-gray-600">
          Please verify that the information extracted from your ID is correct.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-blue-600 mt-0.5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900">Read-Only Information</h3>
            <p className="text-sm text-blue-700 mt-1">
              This information cannot be edited. If anything is incorrect, please go back and
              retake the photo of your ID.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900">
              {data.firstName || 'Not detected'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Middle Name
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900">
              {data.middleName || 'None'}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900">
            {data.lastName || 'Not detected'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900">
              {formatDate(data.birthDate) || 'Not detected'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Type
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900">
              {formatIdType(data.idType) || 'Not detected'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID Number
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900 font-mono">
              {data.governmentId || 'Not detected'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900">
              {data.state || 'Not detected'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline flex-1"
        >
          Retake Photo
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="btn btn-primary flex-1"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}


