'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  cameraId: string;
  cameraName: string;
  onError?: () => void;
}

export default function VideoPlayer({ cameraId, cameraName, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initializeWebRTC = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setConnectionStatus('connecting');

        // Get WebRTC stream URL from our API
        const response = await fetch(`/api/video/streams?cameraId=${cameraId}`);
        const data = await response.json();
        
        if (!data.success || !data.streams || data.streams.length === 0) {
          throw new Error('No active stream found for camera');
        }

        const stream = data.streams[0];
        const hlsUrl = stream.hlsUrl || `http://localhost:8083/hls/${stream.streamId}/playlist.m3u8`;

        // Use hls.js for HLS streaming
        video.autoplay = true;
        video.muted = true; // Mute to allow autoplay
        video.playsInline = true;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
          });
          
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest parsed, starting playback');
            video.play().catch(console.error);
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
              setError('HLS playback error: ' + data.details);
              setConnectionStatus('disconnected');
              setIsLoading(false);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          video.src = hlsUrl;
        } else {
          throw new Error('HLS is not supported in this browser');
        }

        // Handle successful connection
        const handleLoadedMetadata = () => {
          setIsLoading(false);
          setConnectionStatus('connected');
        };

        // Handle connection errors
        const handleError = (e: Event) => {
          console.error('Video player error:', e);
          setError('Video stream not available - FFmpeg processing required');
          setConnectionStatus('disconnected');
          setIsLoading(false);
          onError?.();
        };

        // Handle connection status changes
        const handleLoadStart = () => {
          setConnectionStatus('connecting');
        };

        const handleCanPlay = () => {
          setConnectionStatus('connected');
          setIsLoading(false);
        };

        // Add event listeners
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleError);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('canplay', handleCanPlay);

        // Cleanup function
        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('error', handleError);
          video.removeEventListener('loadstart', handleLoadStart);
          video.removeEventListener('canplay', handleCanPlay);
        };

      } catch (err) {
        console.error('Failed to initialize WebRTC:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize video stream');
        setConnectionStatus('disconnected');
        setIsLoading(false);
        onError?.();
      }
    };

    initializeWebRTC();

  }, [cameraId, onError]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Connecting to camera...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-center text-white p-4">
            <svg className="mx-auto h-8 w-8 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="absolute top-2 left-2">
        <div className={`flex items-center space-x-1 px-2 py-1 bg-black bg-opacity-50 rounded text-xs ${getStatusColor()}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
          }`}></div>
          <span>{getStatusText()}</span>
        </div>
      </div>

      {/* Camera Name */}
      <div className="absolute bottom-2 left-2">
        <div className="px-2 py-1 bg-black bg-opacity-50 rounded text-xs text-white">
          {cameraName}
        </div>
      </div>

      {/* Fullscreen Button */}
      <button
        onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
              videoRef.current.requestFullscreen();
            }
          }
        }}
        className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded text-white hover:bg-opacity-75 transition-opacity"
        title="Fullscreen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
}
