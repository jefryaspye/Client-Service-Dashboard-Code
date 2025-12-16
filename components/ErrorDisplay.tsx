
import React from 'react';
import { ExclamationTriangleIcon } from './icons';

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="bg-red-900/50 border border-red-700 rounded-lg p-8 max-w-lg text-center shadow-lg mx-4">
        <div className="flex justify-center mb-4">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-red-200">An Error Occurred</h2>
        <p className="text-red-300 mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          aria-label="Retry fetching data"
        >
          Retry
        </button>
      </div>
    </div>
  );
};

export default ErrorDisplay;
