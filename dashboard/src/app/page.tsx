'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardOverview from '@/components/DashboardOverview';
import LiveTracking from '@/components/LiveTracking';
import ClassificationDashboard from '@/components/ClassificationDashboard';
import TrafficAnalytics from '@/components/TrafficAnalytics';
import VideoStreamingGrid from '@/components/VideoStreamingGrid';
import CameraSettings from '@/components/CameraSettings';
import VideoRecordings from '@/components/VideoRecordings';
import ControlCenter from '@/components/ControlCenter';
import { useDevice } from '@/contexts/DeviceContext';

export default function Dashboard() {
  const { selectedDevice } = useDevice();
  const searchParams = useSearchParams();
  
  // Read tab from URL query parameter, default to 'overview'
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [videoSubTab, setVideoSubTab] = useState<'streams' | 'settings' | 'recordings'>('streams');
  const [cameras, setCameras] = useState<any[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(false);

  // Sync activeTab with URL query parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  // Update URL when tab changes (without page reload)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== activeTab) {
      url.searchParams.set('tab', activeTab);
      window.history.pushState({}, '', url.toString());
    }
  }, [activeTab]);

  // Fetch camera configuration when video streaming tab becomes active
  useEffect(() => {
    if (activeTab === 'video-streaming') {
      fetchCameras();
    }
  }, [activeTab]);

  const fetchCameras = async () => {
    try {
      setCamerasLoading(true);
      const response = await fetch('/api/video/cameras');
      const data = await response.json();
      if (data.success) {
        setCameras(data.cameras || []);
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
      setCameras([]);
    } finally {
      setCamerasLoading(false);
    }
  };

  // Video stream resource management
  // Stop video streams when switching away from video-streaming tab to prevent resource leaks
  useEffect(() => {
    if (activeTab !== 'video-streaming') {
      // Video streams will be cleaned up by VideoStreamingGrid component's unmount
      // No explicit cleanup needed here as components handle their own lifecycle
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview />;
      case 'tracking':
        return <LiveTracking />;
      case 'analytics':
        // TrafficAnalytics requires deviceId prop for device-specific data
        return <TrafficAnalytics deviceId={selectedDevice.id} />;
      case 'control-center':
        // Control Center combines video streaming, vehicle tracking, and lane status
        // in a unified three-panel layout for comprehensive intersection monitoring
        return <ControlCenter />;
      case 'classification':
        // ClassificationDashboard is self-contained with internal tab navigation
        // Uses MongoDB-first architecture (no in-memory cache, queries /api/classification)
        return <ClassificationDashboard />;
      case 'video-streaming':
        return (
          <div>
            {/* Video Streaming Sub-Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8" aria-label="Video Streaming Tabs">
                <button
                  onClick={() => setVideoSubTab('streams')}
                  className={`
                    ${videoSubTab === 'streams'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  `}
                  aria-current={videoSubTab === 'streams' ? 'page' : undefined}
                >
                  Streams
                </button>
                <button
                  onClick={() => setVideoSubTab('settings')}
                  className={`
                    ${videoSubTab === 'settings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  `}
                  aria-current={videoSubTab === 'settings' ? 'page' : undefined}
                >
                  Settings
                </button>
                <button
                  onClick={() => setVideoSubTab('recordings')}
                  className={`
                    ${videoSubTab === 'recordings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  `}
                  aria-current={videoSubTab === 'recordings' ? 'page' : undefined}
                >
                  Recordings
                </button>
              </nav>
            </div>

            {/* Video Streaming Sub-Tab Content */}
            {videoSubTab === 'streams' && (
              camerasLoading ? (
                <div className="text-center py-8">Loading cameras...</div>
              ) : (
                <VideoStreamingGrid cameras={cameras} onRefresh={fetchCameras} />
              )
            )}
            {videoSubTab === 'settings' && (
              <CameraSettings
                cameras={cameras}
                onCameraAdded={(camera) => {
                  setCameras([...cameras, camera]);
                }}
                onCameraUpdated={(updatedCamera) => {
                  setCameras(cameras.map(c => c.id === updatedCamera.id ? updatedCamera : c));
                }}
                onCameraDeleted={(cameraId) => {
                  setCameras(cameras.filter(c => c.id !== cameraId));
                }}
                onRefresh={fetchCameras}
              />
            )}
            {videoSubTab === 'recordings' && <VideoRecordings />}
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTabContent()}
    </DashboardLayout>
  );
}