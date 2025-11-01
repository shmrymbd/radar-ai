'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { mediamtxClient } from '@/lib/mediamtx-client';

interface VideoPlayerHybridProps {
  cameraId: string;
  cameraName: string;
  rtspUrl?: string;
  preferWebRTC?: boolean; // Default: true for ultra-low latency
  onError?: () => void;
}

type StreamingMode = 'webrtc' | 'hls' | 'none';

export default function VideoPlayerHybrid({
  cameraId,
  cameraName,
  rtspUrl,
  preferWebRTC = true,
  onError
}: VideoPlayerHybridProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [streamingMode, setStreamingMode] = useState<StreamingMode>('none');
  const [latencyEstimate, setLatencyEstimate] = useState<string>('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cleanupFn: (() => void) | null = null;

    const initializeStream = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setConnectionStatus('connecting');

        // Get camera details from API
        const cameraResponse = await fetch('/api/video/cameras');
        const cameraData = await cameraResponse.json();

        if (!cameraData.success || !cameraData.cameras) {
          throw new Error('Failed to fetch camera configuration');
        }

        const camera = cameraData.cameras.find((cam: any) => cam.id === cameraId);
        if (!camera) {
          throw new Error('Camera configuration not found');
        }

        const cameraRtspUrl = rtspUrl || camera.rtspUrl;

        // Try WebRTC first if preferred and MediaMTX is available
        if (preferWebRTC) {
          console.log('🎯 Attempting WebRTC (ultra-low latency mode)...');
          const webrtcSuccess = await tryWebRTC(video, cameraRtspUrl);

          if (webrtcSuccess) {
            setStreamingMode('webrtc');
            setLatencyEstimate('300-500ms');
            cleanupFn = () => {
              console.log('🧹 Cleaning up WebRTC stream');
              mediamtxClient.stopStream(cameraId);
            };
            return;
          } else {
            console.warn('⚠️ WebRTC failed, falling back to HLS...');
          }
        }

        // Fallback to HLS
        console.log('📺 Using HLS (low latency mode)...');
        const hlsSuccess = await tryHLS(video, camera);

        if (hlsSuccess) {
          setStreamingMode('hls');
          setLatencyEstimate('2-4s');
          cleanupFn = () => {
            console.log('🧹 Cleaning up HLS stream');
            if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
            }
          };
          return;
        }

        throw new Error('Both WebRTC and HLS failed');

      } catch (err) {
        console.error('Failed to initialize video stream:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize video stream');
        setConnectionStatus('disconnected');
        setIsLoading(false);
        onError?.();
      }
    };

    /**
     * Try WebRTC streaming via MediaMTX
     */
    const tryWebRTC = async (video: HTMLVideoElement, rtspUrl: string): Promise<boolean> => {
      try {
        // Check if MediaMTX is available
        const isAvailable = await mediamtxClient.checkAvailability();
        if (!isAvailable) {
          console.warn('MediaMTX service not available');
          return false;
        }

        // Add camera to MediaMTX
        await mediamtxClient.addCamera(cameraId, rtspUrl);

        // Start WebRTC stream
        const success = await mediamtxClient.startStream(
          cameraId,
          video,
          (state) => {
            console.log(`WebRTC connection state: ${state}`);
            if (state === 'connected') {
              setConnectionStatus('connected');
              setIsLoading(false);
              retryCountRef.current = 0;
            } else if (state === 'connecting') {
              setConnectionStatus('connecting');
            } else if (state === 'failed' || state === 'closed') {
              setConnectionStatus('disconnected');
            }
          }
        );

        if (success) {
          console.log('✅ WebRTC stream started successfully');
          return true;
        }

        return false;
      } catch (error) {
        console.error('WebRTC initialization error:', error);
        return false;
      }
    };

    /**
     * Try HLS streaming (fallback)
     */
    const tryHLS = async (video: HTMLVideoElement, camera: any): Promise<boolean> => {
      try {
        // Get or start HLS stream
        let response = await fetch(`/api/video/streams?cameraId=${cameraId}`);
        let data = await response.json();

        // If no stream exists, start one
        if (!data.success || !data.streams || data.streams.length === 0) {
          console.log('Starting new HLS stream...');

          const startResponse = await fetch('/api/video/streams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cameraId: camera.id,
              rtspUrl: camera.rtspUrl,
              username: camera.username,
              password: camera.password
            })
          });

          const startData = await startResponse.json();
          if (!startData.success) {
            throw new Error(startData.error || 'Failed to start HLS stream');
          }

          data = startData;
        }

        const stream = data.stream || data.streams?.[0];
        if (!stream) {
          throw new Error('No stream information available');
        }

        // Get HLS URL
        let hlsUrl = data.hlsUrl || stream.hlsUrl;
        if (hlsUrl && hlsUrl.startsWith('/')) {
          hlsUrl = `${window.location.origin}${hlsUrl}`;
        } else if (!hlsUrl && stream.streamId) {
          hlsUrl = `${window.location.origin}/api/video/hls/${stream.streamId}/playlist.m3u8`;
        }

        if (!hlsUrl) {
          throw new Error('No HLS URL available');
        }

        console.log('📺 Loading HLS stream:', hlsUrl);

        // Set video properties for autoplay
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 10,
            maxBufferLength: 4,
            maxMaxBufferLength: 6,
            maxBufferSize: 10 * 1000 * 1000,
            maxBufferHole: 0.5,
            liveSyncDurationCount: 1,
            liveMaxLatencyDurationCount: 3,
            manifestLoadingMaxRetry: 6,
            manifestLoadingRetryDelay: 500,
            levelLoadingMaxRetry: 6,
            fragLoadingMaxRetry: 6,
            fragLoadingTimeOut: 10000,
            appendErrorMaxRetry: 5,
            startFragPrefetch: true,
            debug: false
          });

          hlsRef.current = hls;
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);

          return new Promise((resolve) => {
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              console.log('✅ HLS manifest parsed');
              setIsLoading(false);
              setConnectionStatus('connected');
              retryCountRef.current = 0;

              video.play().catch(err => {
                console.warn('Autoplay blocked:', err);
                setShowPlayButton(true);
              });

              resolve(true);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                console.error('Fatal HLS error:', data);
                resolve(false);
              }
            });

            // Timeout after 10 seconds
            setTimeout(() => resolve(false), 10000);
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          video.src = hlsUrl;
          return true;
        }

        return false;
      } catch (error) {
        console.error('HLS initialization error:', error);
        return false;
      }
    };

    initializeStream();

    // Cleanup function
    return () => {
      cleanupFn?.();
    };
  }, [cameraId, rtspUrl, preferWebRTC, onError]);

  const handlePlayClick = async () => {
    const video = videoRef.current;
    if (video) {
      try {
        video.muted = true;
        await video.play();
        setShowPlayButton(false);
      } catch (err) {
        console.error('Failed to start playback:', err);
        setError('Unable to start video playback');
      }
    }
  };

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

  const getModeIcon = () => {
    if (streamingMode === 'webrtc') {
      return '⚡'; // Lightning for ultra-low latency
    } else if (streamingMode === 'hls') {
      return '📺'; // TV for HLS
    }
    return '';
  };

  const getModeText = () => {
    if (streamingMode === 'webrtc') {
      return 'WebRTC (Ultra-Low Latency)';
    } else if (streamingMode === 'hls') {
      return 'HLS (Low Latency)';
    }
    return '';
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

      {/* Play Button Overlay */}
      {showPlayButton && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 cursor-pointer hover:bg-opacity-70 transition-opacity"
          onClick={handlePlayClick}
        >
          <div className="text-center">
            <button
              className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-6 shadow-2xl transition-all transform hover:scale-110"
              aria-label="Play video"
            >
              <svg className="w-12 h-12 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <p className="text-white text-sm mt-4 font-medium">Click to start video</p>
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

      {/* Streaming Mode & Latency Indicator */}
      {streamingMode !== 'none' && (
        <div className="absolute top-2 right-2">
          <div className="flex flex-col gap-1">
            <div className="px-2 py-1 bg-black bg-opacity-50 rounded text-xs text-white">
              <span className="mr-1">{getModeIcon()}</span>
              {getModeText()}
            </div>
            {latencyEstimate && (
              <div className="px-2 py-1 bg-black bg-opacity-50 rounded text-xs text-green-400">
                Latency: ~{latencyEstimate}
              </div>
            )}
          </div>
        </div>
      )}

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
        className="absolute bottom-2 right-2 p-1 bg-black bg-opacity-50 rounded text-white hover:bg-opacity-75 transition-opacity"
        title="Fullscreen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
}
