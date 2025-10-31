/**
 * Coordinate Transformation Utilities
 *
 * Transforms radar coordinates to video pixel coordinates for overlay rendering
 */

export interface RadarCoordinate {
  x: number; // Radar X coordinate (meters or device units)
  y: number; // Radar Y coordinate (meters or device units)
}

export interface VideoCoordinate {
  x: number; // Video pixel X coordinate
  y: number; // Video pixel Y coordinate
}

export interface TransformConfig {
  videoWidth: number;
  videoHeight: number;
  radarScale?: number; // Scale factor for radar coordinates (default: 1)
  radarOriginX?: number; // Radar origin offset X (default: 0)
  radarOriginY?: number; // Radar origin offset Y (default: 0)
}

/**
 * Transform radar coordinates to video pixel coordinates
 *
 * Basic 1:1 mapping with center offset (MVP implementation)
 * Can be extended with calibration matrix for precise alignment
 *
 * @param radar - Radar coordinate (x, y)
 * @param config - Transformation configuration
 * @returns Video pixel coordinate
 */
export function radarToVideo(
  radar: RadarCoordinate,
  config: TransformConfig
): VideoCoordinate {
  const {
    videoWidth,
    videoHeight,
    radarScale = 1,
    radarOriginX = 0,
    radarOriginY = 0
  } = config;

  // Center of video canvas
  const centerX = videoWidth / 2;
  const centerY = videoHeight / 2;

  // Apply scale and origin offset
  const scaledX = (radar.x - radarOriginX) * radarScale;
  const scaledY = (radar.y - radarOriginY) * radarScale;

  // Transform to video coordinates (Y-axis inverted for screen coordinates)
  const videoX = centerX + scaledX;
  const videoY = centerY - scaledY; // Invert Y-axis

  return {
    x: Math.round(videoX),
    y: Math.round(videoY)
  };
}

/**
 * Check if video coordinate is within canvas bounds
 *
 * @param coord - Video coordinate to check
 * @param config - Transformation configuration
 * @returns True if coordinate is visible on canvas
 */
export function isWithinBounds(
  coord: VideoCoordinate,
  config: TransformConfig
): boolean {
  return (
    coord.x >= 0 &&
    coord.x <= config.videoWidth &&
    coord.y >= 0 &&
    coord.y <= config.videoHeight
  );
}

/**
 * Get vehicle type color for overlay rendering
 *
 * @param vehicleType - Vehicle type string
 * @returns CSS color string
 */
export function getVehicleTypeColor(vehicleType: string | undefined): string {
  switch (vehicleType?.toLowerCase()) {
    case 'car':
    case 'sedan':
      return '#3B82F6'; // Blue
    case 'truck':
    case 'heavy':
      return '#EF4444'; // Red
    case 'bus':
      return '#F59E0B'; // Orange
    case 'motorcycle':
    case 'bike':
      return '#10B981'; // Green
    case 'van':
      return '#8B5CF6'; // Purple
    default:
      return '#6B7280'; // Gray
  }
}

/**
 * Check if vehicle data is stale (older than threshold)
 *
 * @param timestamp - Vehicle data timestamp
 * @param thresholdMs - Staleness threshold in milliseconds (default: 2000ms)
 * @returns True if data is stale
 */
export function isDataStale(timestamp: Date, thresholdMs: number = 2000): boolean {
  return Date.now() - timestamp.getTime() > thresholdMs;
}
