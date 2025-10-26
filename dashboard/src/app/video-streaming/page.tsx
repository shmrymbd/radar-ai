'use client';

import { useState, useEffect } from 'react';
import VideoStreamingGrid from '@/components/VideoStreamingGrid';
import CameraSettings from '@/components/CameraSettings';
import VideoRecordings from '@/components/VideoRecordings';
import { CameraConfig, VideoRecording } from '@/types/camera';

export default function VideoStreamingPage() {
  const [activeTab, setActiveTab] = useState<'streams' | 'settings' | 'recordings'>('streams');
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [recordings, setRecordings] = useState<VideoRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch cameras on component mount
  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/video/cameras');
      const data = await response.json();
      
      if (data.success) {
        setCameras(data.cameras);
      } else {
        setError(data.error || 'Failed to fetch cameras');
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
      setError('Failed to fetch cameras');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordings = async () => {
    try {
      const response = await fetch('/api/video/recordings');
      const data = await response.json();
      
      if (data.success) {
        setRecordings(data.recordings);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  };

  const handleCameraAdded = (newCamera: CameraConfig) => {
    setCameras(prev => [...prev, newCamera]);
  };

  const handleCameraUpdated = (updatedCamera: CameraConfig) => {
    setCameras(prev => prev.map(camera => 
      camera.id === updatedCamera.id ? updatedCamera : camera
    ));
  };

  const handleCameraDeleted = (cameraId: string) => {
    setCameras(prev => prev.filter(camera => camera.id !== cameraId));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'streams':
        return (
          <VideoStreamingGrid 
            cameras={cameras}
            onRefresh={fetchCameras}
          />
        );
      case 'settings':
        return (
          <CameraSettings
            cameras={cameras}
            onCameraAdded={handleCameraAdded}
            onCameraUpdated={handleCameraUpdated}
            onCameraDeleted={handleCameraDeleted}
            onRefresh={fetchCameras}
          />
        );
      case 'recordings':
        return (
          <VideoRecordings
            recordings={recordings}
            onRefresh={fetchRecordings}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video streaming...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Video Streaming</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchCameras}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video Streaming</h1>
            <p className="text-gray-600 mt-1">
              Real-time camera feeds and video management for traffic monitoring
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-green-500">
              <div className="w-2 h-2 bg-current rounded-full mr-2"></div>
              <span className="text-sm font-medium">Video Service Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'streams', label: 'Live Streams', icon: '📹' },
              { id: 'settings', label: 'Camera Settings', icon: '⚙️' },
              { id: 'recordings', label: 'Recordings', icon: '🎬' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'streams' | 'settings' | 'recordings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
