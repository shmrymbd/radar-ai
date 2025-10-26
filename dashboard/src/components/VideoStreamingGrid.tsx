'use client';

import { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import { CameraConfig } from '@/types/camera';

interface VideoStreamingGridProps {
  cameras: CameraConfig[];
  onRefresh: () => void;
}

export default function VideoStreamingGrid({ cameras, onRefresh }: VideoStreamingGridProps) {
  const [activeStreams, setActiveStreams] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);

  // Initialize stream states and sync with API
  useEffect(() => {
    const syncStreams = async () => {
      try {
        const response = await fetch('/api/video/streams');
        const data = await response.json();
        
        if (data.success) {
          const streamMap = new Map();
          cameras.forEach(camera => {
            const isActive = data.streams.some((stream: any) => stream.cameraId === camera.id && stream.isActive);
            streamMap.set(camera.id, isActive);
          });
          setActiveStreams(streamMap);
        }
      } catch (error) {
        console.error('Error syncing streams:', error);
        // Fallback to default state
        const initialStreams = new Map();
        cameras.forEach(camera => {
          initialStreams.set(camera.id, false);
        });
        setActiveStreams(initialStreams);
      }
    };

    syncStreams();
  }, [cameras]);

  const startStream = async (cameraId: string) => {
    try {
      setLoading(true);
      const camera = cameras.find(c => c.id === cameraId);
      if (!camera) return;

      const response = await fetch('/api/video/streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cameraId: camera.id,
          rtspUrl: camera.rtspUrl,
          username: camera.username,
          password: camera.password
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setActiveStreams(prev => new Map(prev.set(cameraId, true)));
        alert('Stream started successfully!');
      } else {
        console.error('Failed to start stream:', data.error);
        alert(`Failed to start stream: ${data.error}`);
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      alert('Failed to start video stream');
    } finally {
      setLoading(false);
    }
  };

  const stopStream = async (cameraId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/video/streams?cameraId=${cameraId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setActiveStreams(prev => new Map(prev.set(cameraId, false)));
      } else {
        console.error('Failed to stop stream:', data.error);
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStream = (cameraId: string) => {
    const isActive = activeStreams.get(cameraId);
    if (isActive) {
      stopStream(cameraId);
    } else {
      startStream(cameraId);
    }
  };

  if (cameras.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No cameras configured</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add cameras in the Camera Settings tab to start streaming.
        </p>
        <div className="mt-6">
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Live Camera Streams</h2>
          <p className="text-sm text-gray-600">
            {cameras.length} camera{cameras.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((camera) => {
          const isStreaming = activeStreams.get(camera.id);
          
          return (
            <div key={camera.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Camera Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{camera.name}</h3>
                    <p className="text-xs text-gray-500">ID: {camera.id}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isStreaming ? 'bg-green-400' : 
                      (camera.status?.isConnected ? 'bg-blue-400' : 'bg-gray-300')
                    }`}></div>
                    <span className="text-xs text-gray-500">
                      {isStreaming ? 'Live' : (camera.status?.isConnected ? 'Online' : 'Offline')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Video Player */}
              <div className="aspect-video bg-black relative">
                {isStreaming ? (
                  <VideoPlayer
                    cameraId={camera.id}
                    cameraName={camera.name}
                    onError={() => {
                      setActiveStreams(prev => new Map(prev.set(camera.id, false)));
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">
                        {camera.status?.isConnected ? 'Camera Ready' : 'Camera Offline'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="px-4 py-3 bg-gray-50">
                <button
                  onClick={() => toggleStream(camera.id)}
                  disabled={loading}
                  className={`w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    isStreaming
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  }`}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isStreaming ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </>
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      )}
                    </svg>
                  )}
                  {isStreaming ? 'Stop Stream' : 'Start Stream'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
