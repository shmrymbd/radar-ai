'use client';

import { useState, ReactNode } from 'react';
import DeviceSelector from './DeviceSelector';
import ClientOnlyTimeDisplay from './ClientOnlyTimeDisplay';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'tracking', label: 'Live Tracking', icon: '🚗' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'control-center', label: 'Control Center', icon: '🎛️' },
    { id: 'classification', label: 'Classification', icon: '🚙' },
    { id: 'video-streaming', label: 'Video Streaming', icon: '📹' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Traffic Signal Control Dashboard</h1>
              <p className="text-sm text-gray-600">Real-time radar data monitoring and signal optimization</p>
            </div>
            <div className="flex items-center space-x-4">
              <DeviceSelector />
              <div className="flex items-center space-x-2 text-green-500">
                <div className="w-2 h-2 bg-current rounded-full"></div>
                <span className="text-sm font-medium">System Online</span>
              </div>
              <ClientOnlyTimeDisplay />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`tab-button ${
                  activeTab === tab.id 
                    ? 'tab-button-active' 
                    : 'tab-button-inactive'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
