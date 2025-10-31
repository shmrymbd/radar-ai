'use client';

import { ReactNode } from 'react';

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
  onExport?: () => void;
  onInfo?: () => void;
}

export default function ChartContainer({
  title,
  children,
  className = '',
  isLoading = false,
  error = null,
  onExport,
  onInfo
}: ChartContainerProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex space-x-2">
          {onInfo && (
            <button
              onClick={onInfo}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Chart information"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Export chart"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-64 text-red-600">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {!isLoading && !error && children}
      </div>
    </div>
  );
}
