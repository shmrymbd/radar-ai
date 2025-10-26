/**
 * Timezone utilities for UTC+8 (Asia/Singapore, Asia/Shanghai, etc.)
 */

// UTC+8 offset in milliseconds
const UTC_PLUS_8_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Convert a Date object to UTC+8 timezone
 * @param date Date object (can be UTC or any timezone)
 * @returns New Date object adjusted to UTC+8
 */
export function toUTC8(date: Date): Date {
  // Get UTC timestamp
  const utcTime = date.getTime();

  // Get current timezone offset and convert to UTC+8
  const localOffset = date.getTimezoneOffset() * 60 * 1000;
  const utcTimestamp = utcTime + localOffset;
  const utc8Timestamp = utcTimestamp + UTC_PLUS_8_OFFSET_MS;

  return new Date(utc8Timestamp);
}

/**
 * Format a date as UTC+8 time slot string (YYYY-MM-DD-HH-MM)
 * Rounds down to nearest 15-minute interval
 */
export function formatUTC8TimeSlot(date: Date): string {
  const utc8Date = toUTC8(date);

  const year = utc8Date.getUTCFullYear();
  const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc8Date.getUTCDate()).padStart(2, '0');
  const hour = String(utc8Date.getUTCHours()).padStart(2, '0');
  const minute = String(Math.floor(utc8Date.getUTCMinutes() / 15) * 15).padStart(2, '0');

  return `${year}-${month}-${day}-${hour}-${minute}`;
}

/**
 * Get UTC+8 hour from a date (0-23)
 */
export function getUTC8Hour(date: Date): number {
  const utc8Date = toUTC8(date);
  return utc8Date.getUTCHours();
}

/**
 * Format date as UTC+8 ISO string
 */
export function toUTC8ISOString(date: Date): string {
  const utc8Date = toUTC8(date);
  return utc8Date.toISOString().replace('Z', '+08:00');
}

/**
 * Format date for display in UTC+8
 * Example: "2025-10-26 20:30:00"
 */
export function formatUTC8Display(date: Date): string {
  const utc8Date = toUTC8(date);

  const year = utc8Date.getUTCFullYear();
  const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc8Date.getUTCDate()).padStart(2, '0');
  const hour = String(utc8Date.getUTCHours()).padStart(2, '0');
  const minute = String(utc8Date.getUTCMinutes()).padStart(2, '0');
  const second = String(utc8Date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * Parse a UTC+8 time slot string back to Date object
 * @param timeSlot Format: "YYYY-MM-DD-HH-MM"
 * @returns Date object in UTC+8
 */
export function parseUTC8TimeSlot(timeSlot: string): Date {
  const [year, month, day, hour, minute] = timeSlot.split('-').map(Number);

  // Create date in UTC, then shift back to get UTC+8
  const utc8Timestamp = Date.UTC(year, month - 1, day, hour, minute);
  const utcTimestamp = utc8Timestamp - UTC_PLUS_8_OFFSET_MS;

  return new Date(utcTimestamp);
}

/**
 * Get current time in UTC+8
 */
export function nowUTC8(): Date {
  return toUTC8(new Date());
}
