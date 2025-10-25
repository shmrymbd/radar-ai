'use client';

import React, { Component, ReactNode } from 'react';

interface DeviceErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface DeviceErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class DeviceErrorBoundary extends Component<DeviceErrorBoundaryProps, DeviceErrorBoundaryState> {
  constructor(props: DeviceErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): DeviceErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DeviceErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
          <span className="text-red-500">⚠️</span>
          <div>
            <p className="text-sm font-medium text-red-800">Device Selection Error</p>
            <p className="text-xs text-red-600">
              {this.state.error?.message || 'An error occurred with device selection'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
