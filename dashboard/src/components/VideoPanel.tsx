'use client';

import { useState, useEffect, useRef } from 'react';
import { useControlCenter } from '@/contexts/ControlCenterContext';
import { useDevice } from '@/contexts/DeviceContext';
import VideoPlayer from './VideoPlayer';
import VideoOverlay from './VideoOverlay';
import { CameraConfig } from '@/types/camera';

interface VideoPanelProps {
  compact?: boolean;
}

export default function VideoPanel({ compact = false }: VideoPanelProps) {
  const { selectedCamera, setSelectedCamera, showVideoOverlay, setShowVideoOverlay } = useControlCenter();
  const { selectedDevice } = useDevice();
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 1920, height: 1080 });

  // Fetch cameras on mount and when device changes
  useEffect(() => {
    fetchCameras();
  }, [selectedDevice.id]);

  // Track video container dimensions for overlay
  useEffect(() => {
    if (!videoContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setVideoDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(videoContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/video/cameras');
      const data = await response.json();

      if (data.success) {
        setCameras(data.cameras || []);
        // Auto-select first camera if none selected
        if (!selectedCamera && data.cameras && data.cameras.length > 0) {
          setSelectedCamera(data.cameras[0].id);
        }
      } else {
        setError(data.error || 'Failed to fetch cameras');
      }
    } catch (err) {
      console.error('Error fetching cameras:', err);
      setError('Failed to fetch cameras');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraChange = (cameraId: string) => {
    setSelectedCamera(cameraId);
  };

  const handleOverlayToggle = () => {
    setShowVideoOverlay(!showVideoOverlay);
  };

  const selectedCameraConfig = cameras.find(cam => cam.id === selectedCamera);

  return (
    <div className="h-full bg-gray-50 rounded-lg border border-gray-200 flex flex-col">
      {/* Panel Header */}
      <div className="bg-white border-b border-gray-200 p-4 rounded-t-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Video Feed</h3>
            <p className="text-xs text-gray-500 mt-1">
              Live camera with radar overlay
            </p>
          </div>
        </div>

        {/* Camera Selection Dropdown */}
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <label htmlFor="camera-select" className="block text-xs font-medium text-gray-700 mb-1">
              Select Camera
            </label>
            <select
              id="camera-select"
              value={selectedCamera || ''}
              onChange={(e) => handleCameraChange(e.target.value)}
              disabled={loading || cameras.length === 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {cameras.length === 0 && !loading && (
                <option value="">No cameras available</option>
              )}
              {loading && (
                <option value="">Loading cameras...</option>
              )}
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name}
                </option>
              ))}
            </select>
          </div>

          {/* Overlay Toggle */}
          <div className="flex flex-col">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Radar Overlay
            </label>
            <button
              onClick={handleOverlayToggle}
              disabled={!selectedCamera}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                showVideoOverlay ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              title={showVideoOverlay ? 'Hide radar overlay' : 'Show radar overlay'}
              aria-label="Toggle radar overlay"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  showVideoOverlay ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 bg-black rounded-b-lg overflow-hidden relative flex items-center justify-center">
        {loading ? (
          // Loading State
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-sm">Loading cameras...</p>
            </div>
          </div>
        ) : error ? (
          // Error State
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white p-6">
              <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm font-medium mb-2">{error}</p>
              <button
                onClick={fetchCameras}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : cameras.length === 0 ? (
          // No Cameras State
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white p-6">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium mb-2">No Cameras Configured</p>
              <p className="text-xs text-gray-400">Add cameras in Video Streaming settings</p>
            </div>
          </div>
        ) : !selectedCamera ? (
          // No Selection State
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white p-6">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium">Select a camera to view feed</p>
            </div>
          </div>
        ) : selectedCameraConfig ? (
          // Video Player - constrained to square aspect ratio
          <div className="w-full aspect-square max-h-full">
            <div ref={videoContainerRef} className="w-full h-full relative">
              <VideoPlayer
                cameraId={selectedCamera}
                cameraName={selectedCameraConfig.name}
                onError={() => setError('Failed to load video stream')}
              />
              {/* Video Overlay Canvas */}
              {showVideoOverlay && (
                <VideoOverlay
                  videoWidth={videoDimensions.width}
                  videoHeight={videoDimensions.height}
                />
              )}
              {/* Overlay indicator badge */}
              {showVideoOverlay && (
                <div className="absolute top-12 right-2 z-10">
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-600 bg-opacity-75 rounded text-xs text-white">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    <span>Overlay Active</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
