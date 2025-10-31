/**
 * Device ID validation utility
 * Prevents Redis key enumeration and injection attacks
 */

import { z } from 'zod';

// Known valid device IDs (from CLAUDE.md)
const KNOWN_DEVICES = ['P1-center', 'P3', 'P1-o/h'];

// Device ID schema - alphanumeric, dash, slash, underscore only
export const deviceIdSchema = z
  .string()
  .min(1, 'Device ID cannot be empty')
  .max(50, 'Device ID too long')
  .regex(/^[a-zA-Z0-9_/-]+$/, 'Device ID contains invalid characters');

/**
 * Validate device ID format
 * Throws error if invalid
 */
export function validateDeviceId(deviceId: string): string {
  return deviceIdSchema.parse(deviceId);
}

/**
 * Safe device ID validation
 * Returns validation result without throwing
 */
export function safeValidateDeviceId(deviceId: string): {
  valid: boolean;
  deviceId?: string;
  error?: string;
} {
  const result = deviceIdSchema.safeParse(deviceId);

  if (result.success) {
    return {
      valid: true,
      deviceId: result.data
    };
  } else {
    return {
      valid: false,
      error: result.error.errors[0]?.message || 'Invalid device ID'
    };
  }
}

/**
 * Check if device ID is in the known list
 * Useful for strict validation
 */
export function isKnownDevice(deviceId: string): boolean {
  return KNOWN_DEVICES.includes(deviceId);
}

/**
 * Get list of known devices
 */
export function getKnownDevices(): string[] {
  return [...KNOWN_DEVICES];
}

/**
 * Sanitize device ID for logging
 * Prevents log injection attacks
 */
export function sanitizeDeviceIdForLog(deviceId: string): string {
  return deviceId.replace(/[^\w/-]/g, '_');
}

/**
 * Validate and sanitize device ID
 * Primary validation function for API routes
 */
export function validateAndSanitizeDeviceId(
  deviceId: string | null | undefined,
  defaultDevice: string = 'P1-center',
  requireKnown: boolean = false
): {
  valid: boolean;
  deviceId: string;
  error?: string;
} {
  // Use default if not provided
  const id = deviceId || defaultDevice;

  // Validate format
  const validation = safeValidateDeviceId(id);
  if (!validation.valid) {
    return {
      valid: false,
      deviceId: defaultDevice,
      error: validation.error
    };
  }

  // Check if in known list (optional strict mode)
  if (requireKnown && !isKnownDevice(id)) {
    return {
      valid: false,
      deviceId: defaultDevice,
      error: `Unknown device: ${sanitizeDeviceIdForLog(id)}. Known devices: ${KNOWN_DEVICES.join(', ')}`
    };
  }

  return {
    valid: true,
    deviceId: id
  };
}
