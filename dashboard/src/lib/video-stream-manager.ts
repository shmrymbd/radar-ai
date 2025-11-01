/**
 * Video Stream Manager
 * Manages FFmpeg processes for RTSP to HLS conversion
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface StreamConfig {
  cameraId: string;
  rtspUrl: string;
  username?: string;
  password?: string;
  outputDir?: string;
}

export interface ActiveStream {
  streamId: string;
  cameraId: string;
  process: ChildProcess;
  outputDir: string;
  startTime: Date;
  isActive: boolean;
  usageCount: number; // Number of connected viewers
  lastAccessTime: Date; // Last time stream was accessed
}

class VideoStreamManager {
  private static instance: VideoStreamManager;
  private activeStreams: Map<string, ActiveStream> = new Map();
  private readonly hlsOutputBase = './hls-output';

  private constructor() {
    // Ensure output directory exists
    if (!fs.existsSync(this.hlsOutputBase)) {
      fs.mkdirSync(this.hlsOutputBase, { recursive: true });
    }
  }

  public static getInstance(): VideoStreamManager {
    if (!VideoStreamManager.instance) {
      VideoStreamManager.instance = new VideoStreamManager();
    }
    return VideoStreamManager.instance;
  }

  /**
   * Start a new video stream
   */
  public async startStream(config: StreamConfig): Promise<{ streamId: string; hlsUrl: string }> {
    const { cameraId, rtspUrl, username, password } = config;

    // Check if stream already exists for this camera (deduplication)
    const existingStream = Array.from(this.activeStreams.values())
      .find(stream => stream.cameraId === cameraId && stream.isActive);

    if (existingStream) {
      // Stream exists - check if it's healthy before reusing
      const isHealthy = await this.checkStreamHealth(existingStream);

      if (isHealthy) {
        console.log(`♻️ Reusing existing stream for camera ${cameraId} (usage: ${existingStream.usageCount} → ${existingStream.usageCount + 1})`);

        // Increment usage count and update last access time
        existingStream.usageCount++;
        existingStream.lastAccessTime = new Date();

        return {
          streamId: existingStream.streamId,
          hlsUrl: `/api/video/hls/${path.basename(existingStream.outputDir)}/playlist.m3u8`
        };
      } else {
        console.warn(`⚠️ Existing stream for camera ${cameraId} is unhealthy, creating new stream`);
        // Stop unhealthy stream and create a new one
        await this.stopStream(existingStream.streamId);
      }
    }

    // Create stream ID and output directory
    const streamId = `stream_${cameraId}_${Date.now()}`;
    const outputDir = path.join(this.hlsOutputBase, streamId);

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Build RTSP URL with credentials if provided
    let fullRtspUrl = rtspUrl;
    if (username && password) {
      // Insert credentials into RTSP URL
      const rtspMatch = rtspUrl.match(/rtsp:\/\/(.+)/);
      if (rtspMatch) {
        fullRtspUrl = `rtsp://${username}:${password}@${rtspMatch[1]}`;
      }
    }

    console.log(`🎥 Starting FFmpeg stream for camera ${cameraId}`);
    console.log(`📹 RTSP URL: ${rtspUrl.replace(/\/\/(.*?)@/, '//<credentials>@')}`);
    console.log(`📁 Output: ${outputDir}`);

    // FFmpeg arguments for 1-second latency HLS with CBR and stable buffering
    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
      '-analyzeduration', '1000000',
      '-probesize', '1000000',
      '-i', fullRtspUrl,
      // Video encoding with Constant Bitrate (CBR) for consistent segment sizes
      '-c:v', 'libx264',
      '-profile:v', 'baseline', // Baseline profile for maximum compatibility
      '-level', '3.0',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p', // Ensure proper pixel format
      // CBR configuration for 1080p quality (predictable segment sizes)
      '-b:v', '2M', // Target bitrate: 2 Mbps
      '-maxrate', '2.2M', // Maximum bitrate: 2.2 Mbps (10% tolerance)
      '-bufsize', '4M', // VBV buffer size: 4 MB (2× bitrate for stability)
      // Audio encoding
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100', // Standard audio sample rate
      // Forced keyframes every 1 second for exact segment boundaries
      '-force_key_frames', 'expr:gte(t,n_forced*1)',
      // HLS output format optimized for LOW LATENCY
      '-f', 'hls',
      '-hls_time', '1', // 1-second segments for stable buffering
      '-hls_list_size', '3', // Reduced to 3 segments for ~3-second latency (was 10)
      '-hls_flags', 'delete_segments+independent_segments',
      '-hls_segment_type', 'mpegts',
      '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
      // Keyframe settings aligned with forced keyframes (30fps assumption)
      '-g', '30', // GOP size: 30 frames (1 second at 30fps)
      '-keyint_min', '30', // Minimum keyframe interval
      '-sc_threshold', '0', // Disable scene change detection
      // Timing and sync
      '-fflags', '+genpts+nobuffer+flush_packets',
      '-avoid_negative_ts', 'make_zero',
      '-max_delay', '500000',
      '-flags', '+global_header',
      '-bsf:a', 'aac_adtstoasc',
      '-vsync', '1',
      '-fps_mode', 'passthrough',
      '-avioflags', 'direct',
      '-flush_packets', '1',
      // Network timeout and resilience
      '-rw_timeout', '10000000', // Increased to 10 seconds for better reliability
      '-reconnect', '1', // Enable automatic reconnection
      '-reconnect_streamed', '1', // Reconnect for streamed protocols
      '-reconnect_delay_max', '2', // Max 2 seconds between reconnects
      '-rtbufsize', '100M', // Larger buffer for RTSP
      '-reorder_queue_size', '0',
      path.join(outputDir, 'playlist.m3u8'),
      '-y'
    ];

    // Spawn FFmpeg process
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Store active stream
    const activeStream: ActiveStream = {
      streamId,
      cameraId,
      process: ffmpegProcess,
      outputDir,
      startTime: new Date(),
      isActive: true,
      usageCount: 1, // Initial viewer
      lastAccessTime: new Date()
    };

    this.activeStreams.set(streamId, activeStream);

    // Handle process output
    ffmpegProcess.stdout?.on('data', (data) => {
      console.log(`[FFmpeg ${streamId}] ${data.toString()}`);
    });

    ffmpegProcess.stderr?.on('data', (data) => {
      const message = data.toString();
      // Only log errors, not progress info
      if (message.includes('error') || message.includes('Error')) {
        console.error(`[FFmpeg ${streamId}] ${message}`);
      }
    });

    // Handle process exit
    ffmpegProcess.on('exit', (code, signal) => {
      console.log(`[FFmpeg ${streamId}] Process exited with code ${code}, signal ${signal}`);
      const stream = this.activeStreams.get(streamId);
      if (stream) {
        stream.isActive = false;
        this.activeStreams.delete(streamId);
      }
    });

    ffmpegProcess.on('error', (error) => {
      console.error(`[FFmpeg ${streamId}] Process error:`, error);
      const stream = this.activeStreams.get(streamId);
      if (stream) {
        stream.isActive = false;
        this.activeStreams.delete(streamId);
      }
    });

    // Wait a bit for FFmpeg to start and create initial playlist
    await this.waitForPlaylist(outputDir, 30000); // 30 second timeout for better reliability

    const hlsUrl = `/api/video/hls/${streamId}/playlist.m3u8`;
    console.log(`✅ Stream started successfully: ${hlsUrl}`);

    return { streamId, hlsUrl };
  }

  /**
   * Stop a video stream
   */
  public async stopStream(streamId: string): Promise<boolean> {
    const stream = this.activeStreams.get(streamId);

    if (!stream) {
      console.warn(`Stream ${streamId} not found`);
      return false;
    }

    console.log(`🛑 Stopping stream ${streamId} for camera ${stream.cameraId}`);

    // Kill FFmpeg process
    if (stream.process && !stream.process.killed) {
      stream.process.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force kill if still running
      if (!stream.process.killed) {
        stream.process.kill('SIGKILL');
      }
    }

    // Mark as inactive
    stream.isActive = false;

    // Remove from active streams
    this.activeStreams.delete(streamId);

    console.log(`✅ Stream ${streamId} stopped`);
    return true;
  }

  /**
   * Stop stream by camera ID
   */
  public async stopStreamByCamera(cameraId: string): Promise<boolean> {
    const stream = Array.from(this.activeStreams.values())
      .find(s => s.cameraId === cameraId && s.isActive);

    if (!stream) {
      return false;
    }

    return this.stopStream(stream.streamId);
  }

  /**
   * Get all active streams
   */
  public getActiveStreams(): ActiveStream[] {
    return Array.from(this.activeStreams.values())
      .filter(stream => stream.isActive);
  }

  /**
   * Get stream by camera ID
   */
  public getStreamByCamera(cameraId: string): ActiveStream | undefined {
    return Array.from(this.activeStreams.values())
      .find(stream => stream.cameraId === cameraId && stream.isActive);
  }

  /**
   * Get stream by stream ID
   */
  public getStream(streamId: string): ActiveStream | undefined {
    return this.activeStreams.get(streamId);
  }

  /**
   * Check stream health (for deduplication)
   */
  private async checkStreamHealth(stream: ActiveStream): Promise<boolean> {
    try {
      // Check 1: FFmpeg process is alive
      if (!stream.process || stream.process.killed) {
        return false;
      }

      // Check 2: Playlist file exists and is recent (updated within last 10 seconds)
      const playlistPath = path.join(stream.outputDir, 'playlist.m3u8');
      if (!fs.existsSync(playlistPath)) {
        return false;
      }

      const stats = fs.statSync(playlistPath);
      const ageMs = Date.now() - stats.mtimeMs;
      if (ageMs > 10000) { // 10 seconds
        console.warn(`⚠️ Playlist age ${(ageMs / 1000).toFixed(1)}s exceeds 10s threshold`);
        return false;
      }

      // Check 3: At least one segment exists
      const files = fs.readdirSync(stream.outputDir);
      const segments = files.filter(f => f.endsWith('.ts'));
      if (segments.length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking stream health:', error);
      return false;
    }
  }

  /**
   * Decrease usage count (called when viewer disconnects)
   */
  public decreaseUsageCount(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream && stream.usageCount > 0) {
      stream.usageCount--;
      console.log(`📉 Usage count decreased for stream ${streamId}: ${stream.usageCount + 1} → ${stream.usageCount}`);

      // If no more viewers, mark for potential cleanup (but don't stop immediately - grace period)
      if (stream.usageCount === 0) {
        console.log(`👀 Stream ${streamId} has no viewers, will be cleaned up if unused for 2 hours`);
      }
    }
  }

  /**
   * Update last access time (called when playlist/segments are accessed)
   */
  public updateLastAccessTime(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.lastAccessTime = new Date();
    }
  }

  /**
   * Check if FFmpeg is available
   */
  public async checkFFmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('ffmpeg', ['-version']);

      process.on('exit', (code) => {
        resolve(code === 0);
      });

      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Wait for playlist file to be created
   */
  private async waitForPlaylist(outputDir: string, timeout: number = 30000): Promise<void> {
    const playlistPath = path.join(outputDir, 'playlist.m3u8');
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (fs.existsSync(playlistPath)) {
          // Verify playlist has content
          const stats = fs.statSync(playlistPath);
          if (stats.size > 0) {
            // Also check for at least one segment
            const files = fs.readdirSync(outputDir);
            const segments = files.filter(f => f.endsWith('.ts'));

            if (segments.length > 0) {
              clearInterval(checkInterval);
              console.log(`✅ Playlist ready with ${segments.length} segments`);
              resolve();
              return;
            }
          }
        }

        if (elapsed > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Playlist not created within ${timeout}ms`));
        }
      }, 500); // Check every 500ms
    });
  }

  /**
   * Cleanup old HLS files
   */
  public cleanupOldStreams(olderThanHours: number = 24): void {
    if (!fs.existsSync(this.hlsOutputBase)) {
      return;
    }

    const now = Date.now();
    const maxAge = olderThanHours * 60 * 60 * 1000;

    const dirs = fs.readdirSync(this.hlsOutputBase);

    for (const dir of dirs) {
      const dirPath = path.join(this.hlsOutputBase, dir);
      const stats = fs.statSync(dirPath);

      if (stats.isDirectory() && (now - stats.mtimeMs > maxAge)) {
        // Check if this stream is still active
        const isActive = Array.from(this.activeStreams.values())
          .some(stream => path.basename(stream.outputDir) === dir);

        if (!isActive) {
          console.log(`🧹 Cleaning up old stream directory: ${dir}`);
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      }
    }
  }

  /**
   * Shutdown all streams
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down all video streams...');

    const promises = Array.from(this.activeStreams.keys())
      .map(streamId => this.stopStream(streamId));

    await Promise.all(promises);

    console.log('✅ All streams stopped');
  }
}

export const videoStreamManager = VideoStreamManager.getInstance();
export default VideoStreamManager;
