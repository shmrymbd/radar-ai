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
        let response = await fetch(`/api/video/streams?cameraId=${cameraId}`);
        let data = await response.json();

        // If no stream exists, try to start one
        if (!data.success || !data.streams || data.streams.length === 0) {
          console.log('No active stream found, attempting to start stream...');

          // Get camera details to start the stream
          const cameraResponse = await fetch('/api/video/cameras');
          const cameraData = await cameraResponse.json();

          if (!cameraData.success || !cameraData.cameras) {
            throw new Error('Failed to fetch camera configuration');
          }

          const camera = cameraData.cameras.find((cam: any) => cam.id === cameraId);
          if (!camera) {
            throw new Error('Camera configuration not found');
          }

          // Start the stream
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
            throw new Error(startData.error || 'Failed to start video stream');
          }

          // Get the stream info
          data = startData;
        }

        const stream = data.stream || data.streams?.[0];
        if (!stream) {
          throw new Error('No stream information available');
        }

        // Determine the HLS URL - API returns relative path like /api/video/hls/stream_xxx/playlist.m3u8
        let hlsUrl = data.hlsUrl || stream.hlsUrl;

        // If it's a relative path, make it absolute using the current origin
        if (hlsUrl && hlsUrl.startsWith('/')) {
          hlsUrl = `${window.location.origin}${hlsUrl}`;
        } else if (!hlsUrl && stream.streamId) {
          // Fallback: construct URL from streamId
          hlsUrl = `${window.location.origin}/api/video/hls/${stream.streamId}/playlist.m3u8`;
        } else if (!hlsUrl) {
          throw new Error('No HLS URL available for stream');
        }

        console.log('🎥 Loading HLS stream:', hlsUrl);

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
            // Handle append errors gracefully (critical for Firefox)
            appendErrorMaxRetry: 5, // Increased from 3 for Firefox
            // Prefetch for smoother playback
            startFragPrefetch: true,
            // Debug mode off to reduce console noise
            debug: false,
            // Firefox-specific: More aggressive buffer management
            nudgeMaxRetry: 5,
            nudgeOffset: 0.1,
            // Use more conservative approach for Firefox
            abrEwmaDefaultEstimate: 500000, // 500kbps default estimate
            abrBandWidthFactor: 0.95, // Be more conservative with bandwidth
            abrBandWidthUpFactor: 0.7 // Slower upward adaptation
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

            // Enhanced autoplay strategy with multiple fallbacks
            const attemptAutoplay = async () => {
              try {
                // Strategy 1: Start muted (required for most browsers)
                video.muted = true;
                video.volume = 0;

                // Try immediate play
                const playPromise = video.play();

                if (playPromise !== undefined) {
                  await playPromise;
                  console.log('✅ Autoplay successful (muted)');
                  setShowPlayButton(false);

                  // Optional: Try to unmute after 1 second if user hasn't interacted
                  setTimeout(() => {
                    if (video && !video.paused) {
                      video.muted = false;
                      video.volume = 0.5;
                      // If unmuting causes issues, revert to muted
                      video.play().catch(() => {
                        video.muted = true;
                        video.volume = 0;
                      });
                    }
                  }, 1000);
                }
              } catch (err) {
                console.warn('⚠️ Autoplay blocked, trying fallbacks:', err);

                // Strategy 2: Try playing on next user interaction
                setShowPlayButton(true);

                const handleUserInteraction = async () => {
                  try {
                    video.muted = true;
                    await video.play();
                    console.log('✅ Playback started after user interaction');
                    setShowPlayButton(false);

                    // Cleanup listeners
                    ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'].forEach(type =>
                      document.removeEventListener(type, handleUserInteraction)
                    );

                    // Try unmuting after successful play
                    setTimeout(() => {
                      if (video && !video.paused) {
                        video.muted = false;
                        video.volume = 0.5;
                        video.play().catch(() => {
                          video.muted = true;
                          video.volume = 0;
                        });
                      }
                    }, 500);
                  } catch (innerErr) {
                    console.error('Failed to play after user interaction:', innerErr);
                  }
                };

                // Listen for any user interaction (including scroll and mousemove)
                ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'].forEach(type =>
                  document.addEventListener(type, handleUserInteraction, { once: true })
                );
              }
            };

            // Start autoplay attempt immediately
            attemptAutoplay();

            // Strategy 3: Retry autoplay after a short delay (helps with some browsers)
            setTimeout(() => {
              if (video.paused) {
                console.log('🔄 Retrying autoplay...');
                attemptAutoplay();
              }
            }, 500);
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
            // Handle non-fatal errors first
            if (!data.fatal) {
              // Firefox-specific: buffer append errors are common and usually recoverable
              if (data.details === 'bufferAppendError') {
                // Silently handle - HLS.js will retry automatically
                // Only log if we see too many
                return;
              }

              // Log other non-fatal errors for debugging
              console.warn('Non-fatal HLS error:', data.details);
              return;
            }

            // Fatal errors - need recovery
            console.error('HLS fatal error:', data);
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
