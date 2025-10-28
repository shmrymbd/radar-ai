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
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showPlayButton, setShowPlayButton] = useState(false);

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
        // Set video properties for optimal autoplay
        video.autoplay = true;
        video.muted = true; // Required for autoplay in most browsers
        video.playsInline = true;
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'allow');
        video.preload = 'auto';

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false, // Disable for stability with larger buffers
            backBufferLength: 10, // Reduced from 90 to prevent memory issues
            // Increase buffer to prevent stalling
            maxBufferLength: 30, // Increased from 10 for more stability
            maxMaxBufferLength: 60, // Increased from 20 for resilience
            maxBufferSize: 60 * 1000 * 1000, // 60MB
            maxBufferHole: 1.0, // Increased from 0.5 for tolerance
            // Sync with live edge
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10, // Increased from 5 for stability
            // Better error recovery with more retries
            manifestLoadingMaxRetry: 6, // Increased from 3
            manifestLoadingRetryDelay: 500,
            levelLoadingMaxRetry: 6, // Increased from 3
            fragLoadingMaxRetry: 6, // Increased from 3
            fragLoadingTimeOut: 10000, // 10 second timeout
            // Handle append errors gracefully
            appendErrorMaxRetry: 3,
            // Prefetch for smoother playback
            startFragPrefetch: true,
            // Debug mode off to reduce console noise
            debug: false
          });

          // Store HLS instance in ref for cleanup
          hlsRef.current = hls;

          hls.loadSource(hlsUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('✅ HLS manifest parsed, starting playback');
            setIsLoading(false);
            setConnectionStatus('connected');

            // Reset retry count on successful connection
            retryCountRef.current = 0;

            // Attempt autoplay with progressive enhancement
            const attemptAutoplay = async () => {
              try {
                // Always mute first for best autoplay support
                video.muted = true;
                await video.play();
                console.log('✅ Autoplay successful');
              } catch (err) {
                console.warn('⚠️ Autoplay blocked:', err.message);
                // Show play button for user interaction
                setShowPlayButton(true);
                // Try playing again on any user interaction
                const handleUserInteraction = async () => {
                  try {
                    await video.play();
                    // Cleanup after successful play
                    ['click', 'touchstart', 'keydown'].forEach(type =>
                      document.removeEventListener(type, handleUserInteraction)
                    );
                    setShowPlayButton(false);
                  } catch (innerErr) {
                    console.error('Failed to play after user interaction:', innerErr);
                  }
                };
                // Listen for any user interaction
                ['click', 'touchstart', 'keydown'].forEach(type =>
                  document.addEventListener(type, handleUserInteraction, { once: true })
                );
              }
            };
            attemptAutoplay();
          });

          // Buffer health monitoring
          hls.on(Hls.Events.FRAG_BUFFERED, () => {
            if (video) {
              const buffered = video.buffered;
              if (buffered.length > 0) {
                const bufferEnd = buffered.end(buffered.length - 1);
                const bufferLength = bufferEnd - video.currentTime;

                if (bufferLength < 1) {
                  console.warn('⚠️ Buffer critically low:', bufferLength.toFixed(2) + 's');
                }
              }
            }
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);

            if (data.fatal) {
              const maxRetries = 5;

              if (retryCountRef.current < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s, 8s, 10s (capped)
                const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);

                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.warn(`Fatal network error, retry ${retryCountRef.current + 1}/${maxRetries} in ${backoffDelay}ms`);
                    setTimeout(() => {
                      if (hlsRef.current) {
                        hlsRef.current.startLoad();
                        retryCountRef.current++;
                      }
                    }, backoffDelay);
                    break;

                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.warn(`Fatal media error, retry ${retryCountRef.current + 1}/${maxRetries} in ${backoffDelay}ms`);
                    setTimeout(() => {
                      if (hlsRef.current) {
                        hlsRef.current.recoverMediaError();
                        retryCountRef.current++;
                      }
                    }, backoffDelay);
                    break;

                  default:
                    console.error('Fatal error, cannot recover');
                    setError('HLS playback error: ' + data.details);
                    setConnectionStatus('disconnected');
                    setIsLoading(false);
                    if (hlsRef.current) {
                      hlsRef.current.destroy();
                      hlsRef.current = null;
                    }
                    break;
                }
              } else {
                // Max retries exceeded
                console.error(`Max retries (${maxRetries}) exceeded, giving up`);
                setError('Unable to recover video stream after multiple attempts');
                setConnectionStatus('disconnected');
                setIsLoading(false);
                if (hlsRef.current) {
                  hlsRef.current.destroy();
                  hlsRef.current = null;
                }
              }
            } else {
              // Non-fatal errors - just log them
              console.warn('Non-fatal HLS error:', data.details);
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
          console.log('🧹 Cleaning up video player resources');

          // Remove video event listeners
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('error', handleError);
          video.removeEventListener('loadstart', handleLoadStart);
          video.removeEventListener('canplay', handleCanPlay);

          // Destroy HLS instance to prevent memory leaks
          if (hlsRef.current) {
            console.log('🧹 Destroying HLS instance');
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
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

  const handlePlayClick = async () => {
    const video = videoRef.current;
    if (video) {
      try {
        // Ensure muted state for first playback
        video.muted = true;
        await video.play();
        setShowPlayButton(false);
        console.log('✅ Video playback started after user interaction');

        // After successful play, we can try unmuting if needed
        const unmuteIfAllowed = async () => {
          try {
            video.muted = false;
            // If unmuting fails, revert to muted
            await video.play().catch(() => {
              video.muted = true;
            });
          } catch (err) {
            // Keep muted if unmuting fails
            video.muted = true;
          }
        };
        unmuteIfAllowed();
      } catch (err) {
        console.error('Failed to start playback:', err);
        setError('Unable to start video playback. Please ensure autoplay is allowed.');
      }
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
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        preload="auto"
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

      {/* Play Button Overlay (for autoplay blocked) */}
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
            <p className="text-gray-300 text-xs mt-1">Autoplay was blocked by your browser</p>
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
