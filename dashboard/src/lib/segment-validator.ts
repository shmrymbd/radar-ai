/**
 * Segment Validator
 * Validates HLS segments for duration, keyframes, and size consistency
 */

import { spawn } from 'child_process';
import * as fs from 'fs';

export interface ValidationResult {
  valid: boolean;
  duration?: number;
  hasKeyframe?: boolean;
  fileSize?: number;
  errors: string[];
}

export class SegmentValidator {
  private static instance: SegmentValidator;

  private constructor() {}

  public static getInstance(): SegmentValidator {
    if (!SegmentValidator.instance) {
      SegmentValidator.instance = new SegmentValidator();
    }
    return SegmentValidator.instance;
  }

  /**
   * Validate a segment file for duration, keyframes, and size
   */
  public async validateSegment(
    segmentPath: string,
    expectedBitrate: number = 2000000, // 2 Mbps default
    tolerance: number = 0.01 // ±10ms tolerance for 1-second segments
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // 1. Check file exists and size > 0
      if (!fs.existsSync(segmentPath)) {
        errors.push('Segment file does not exist');
        return { valid: false, errors };
      }

      const stats = fs.statSync(segmentPath);
      const fileSize = stats.size;

      if (fileSize === 0) {
        errors.push('Segment file is empty');
        return { valid: false, fileSize: 0, errors };
      }

      // 2. Verify duration using ffprobe
      const duration = await this.getSegmentDuration(segmentPath);
      if (duration === null) {
        errors.push('Failed to read segment duration');
        return { valid: false, fileSize, errors };
      }

      // Check duration is 1.0s ± tolerance (default ±10ms)
      const expectedDuration = 1.0;
      const durationDiff = Math.abs(duration - expectedDuration);
      if (durationDiff > tolerance) {
        errors.push(
          `Duration ${duration.toFixed(3)}s outside tolerance (expected ${expectedDuration}s ±${(tolerance * 1000).toFixed(0)}ms)`
        );
      }

      // 3. Check for keyframe at start
      const hasKeyframe = await this.hasKeyframeAtStart(segmentPath);
      if (hasKeyframe === null) {
        errors.push('Failed to check for keyframe');
      } else if (!hasKeyframe) {
        errors.push('No keyframe found at segment start');
      }

      // 4. Validate file size within expected range for bitrate
      // Expected size = (bitrate × duration) ± 20% tolerance
      const expectedSize = (expectedBitrate / 8) * duration; // Convert bits to bytes
      const minSize = expectedSize * 0.8;
      const maxSize = expectedSize * 1.2;

      if (fileSize < minSize || fileSize > maxSize) {
        errors.push(
          `File size ${(fileSize / 1024).toFixed(1)}KB outside expected range (${(minSize / 1024).toFixed(1)}-${(maxSize / 1024).toFixed(1)}KB for ${(expectedBitrate / 1000000).toFixed(1)}Mbps)`
        );
      }

      return {
        valid: errors.length === 0,
        duration,
        hasKeyframe: hasKeyframe ?? undefined,
        fileSize,
        errors,
      };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors };
    }
  }

  /**
   * Get segment duration using ffprobe
   */
  private async getSegmentDuration(segmentPath: string): Promise<number | null> {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        segmentPath,
      ]);

      let output = '';

      ffprobe.stdout?.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const duration = parseFloat(output.trim());
          resolve(isNaN(duration) ? null : duration);
        } else {
          resolve(null);
        }
      });

      ffprobe.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Check if segment has keyframe at start using ffprobe
   */
  private async hasKeyframeAtStart(segmentPath: string): Promise<boolean | null> {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'frame=key_frame,pkt_pts_time',
        '-of',
        'json',
        '-read_intervals',
        '%+#1', // Read only first frame
        segmentPath,
      ]);

      let output = '';

      ffprobe.stdout?.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0 && output.trim()) {
          try {
            const result = JSON.parse(output);
            const firstFrame = result.frames?.[0];
            if (firstFrame && 'key_frame' in firstFrame) {
              resolve(firstFrame.key_frame === 1);
              return;
            }
          } catch (error) {
            // JSON parse error
          }
        }
        resolve(null);
      });

      ffprobe.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Check if ffprobe is available
   */
  public async checkFfprobeAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('ffprobe', ['-version']);

      process.on('exit', (code) => {
        resolve(code === 0);
      });

      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Validate multiple segments and return statistics
   */
  public async validateMultipleSegments(
    segmentPaths: string[],
    expectedBitrate: number = 2000000
  ): Promise<{
    totalSegments: number;
    validSegments: number;
    invalidSegments: number;
    avgDuration: number;
    avgFileSize: number;
    errors: Array<{ segment: string; errors: string[] }>;
  }> {
    const results = await Promise.all(
      segmentPaths.map(async (path) => ({
        path,
        result: await this.validateSegment(path, expectedBitrate),
      }))
    );

    const validResults = results.filter((r) => r.result.valid);
    const invalidResults = results.filter((r) => !r.result.valid);

    const avgDuration =
      validResults.reduce((sum, r) => sum + (r.result.duration || 0), 0) /
      (validResults.length || 1);

    const avgFileSize =
      validResults.reduce((sum, r) => sum + (r.result.fileSize || 0), 0) /
      (validResults.length || 1);

    return {
      totalSegments: segmentPaths.length,
      validSegments: validResults.length,
      invalidSegments: invalidResults.length,
      avgDuration,
      avgFileSize,
      errors: invalidResults.map((r) => ({
        segment: r.path,
        errors: r.result.errors,
      })),
    };
  }
}

export const segmentValidator = SegmentValidator.getInstance();
export default SegmentValidator;
