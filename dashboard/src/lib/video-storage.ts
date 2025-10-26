import fs from 'fs';
import path from 'path';

export interface VideoRecording {
  id: string;
  cameraId: string;
  filename: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  size: number;
  path: string;
}

export class VideoStorageManager {
  private storagePath: string;
  private maxRetentionDays: number;
  private maxStorageGB: number;

  constructor() {
    this.storagePath = path.join(process.cwd(), 'video-storage');
    this.maxRetentionDays = 30; // Keep videos for 30 days
    this.maxStorageGB = 10; // Maximum 10GB storage
  }

  /**
   * Get video storage directory path
   */
  getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * Ensure storage directory exists
   */
  ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Generate filename for video recording
   */
  generateFilename(cameraId: string, timestamp: Date): string {
    const dateStr = timestamp.toISOString().replace(/[:.]/g, '-');
    return `${cameraId}_${dateStr}.webm`;
  }

  /**
   * Get full path for video file
   */
  getVideoPath(filename: string): string {
    return path.join(this.storagePath, filename);
  }

  /**
   * List all video recordings
   */
  listRecordings(): VideoRecording[] {
    this.ensureStorageDirectory();
    
    const files = fs.readdirSync(this.storagePath);
    const recordings: VideoRecording[] = [];

    for (const file of files) {
      if (file.endsWith('.webm') || file.endsWith('.mp4')) {
        const filePath = path.join(this.storagePath, file);
        const stats = fs.statSync(filePath);
        
        // Parse filename to extract camera ID and timestamp
        const parts = file.split('_');
        if (parts.length >= 2) {
          const cameraId = parts[0];
          const timestampStr = parts[1].replace(/\.(webm|mp4)$/, '');
          const timestamp = new Date(timestampStr.replace(/-/g, ':'));
          
          recordings.push({
            id: file.replace(/\.(webm|mp4)$/, ''),
            cameraId,
            filename: file,
            startTime: timestamp,
            endTime: new Date(timestamp.getTime() + 60000), // Assume 1 minute duration
            duration: 60000,
            size: stats.size,
            path: filePath
          });
        }
      }
    }

    return recordings.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get recordings for a specific camera
   */
  getRecordingsByCamera(cameraId: string): VideoRecording[] {
    return this.listRecordings().filter(recording => recording.cameraId === cameraId);
  }

  /**
   * Delete old recordings based on retention policy
   */
  cleanupOldRecordings(): number {
    const recordings = this.listRecordings();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxRetentionDays);
    
    let deletedCount = 0;
    
    for (const recording of recordings) {
      if (recording.startTime < cutoffDate) {
        try {
          fs.unlinkSync(recording.path);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete recording ${recording.filename}:`, error);
        }
      }
    }
    
    return deletedCount;
  }

  /**
   * Get total storage usage in bytes
   */
  getStorageUsage(): number {
    const recordings = this.listRecordings();
    return recordings.reduce((total, recording) => total + recording.size, 0);
  }

  /**
   * Check if storage is approaching limit
   */
  isStorageNearLimit(): boolean {
    const usageBytes = this.getStorageUsage();
    const usageGB = usageBytes / (1024 * 1024 * 1024);
    return usageGB > (this.maxStorageGB * 0.8); // 80% threshold
  }

  /**
   * Delete oldest recordings to free up space
   */
  freeUpSpace(targetGB: number): number {
    const recordings = this.listRecordings();
    const targetBytes = targetGB * 1024 * 1024 * 1024;
    const currentUsage = this.getStorageUsage();
    
    if (currentUsage <= targetBytes) {
      return 0;
    }
    
    const bytesToFree = currentUsage - targetBytes;
    let bytesFreed = 0;
    let deletedCount = 0;
    
    // Sort by oldest first
    const sortedRecordings = recordings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    for (const recording of sortedRecordings) {
      if (bytesFreed >= bytesToFree) {
        break;
      }
      
      try {
        fs.unlinkSync(recording.path);
        bytesFreed += recording.size;
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete recording ${recording.filename}:`, error);
      }
    }
    
    return deletedCount;
  }

  /**
   * Get video file stream for download
   */
  getVideoStream(filename: string): fs.ReadStream | null {
    const filePath = this.getVideoPath(filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    return fs.createReadStream(filePath);
  }

  /**
   * Delete specific recording
   */
  deleteRecording(filename: string): boolean {
    const filePath = this.getVideoPath(filename);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete recording ${filename}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const videoStorage = new VideoStorageManager();
