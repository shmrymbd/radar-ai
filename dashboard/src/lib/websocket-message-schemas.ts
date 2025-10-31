/**
 * Zod schemas for WebSocket message validation
 * Prevents message injection and ensures type safety
 */

import { z } from 'zod';

// Device ID validation - alphanumeric, dash, slash, underscore only
const deviceIdSchema = z.string().regex(/^[a-zA-Z0-9_/-]+$/).max(50);

// Channel names - predefined allowed channels
const channelSchema = z.enum(['dashboard', 'tracking', 'classification']);

// Target ID for vehicle tracking
const targetIdSchema = z.string().max(100);

/**
 * WebSocket message schemas
 * All messages must have a 'type' field
 */
export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  // Device management
  z.object({
    type: z.literal('subscribe_device'),
    deviceId: deviceIdSchema
  }),
  z.object({
    type: z.literal('unsubscribe_device'),
    deviceId: deviceIdSchema
  }),
  z.object({
    type: z.literal('get_available_devices')
  }),

  // Channel subscriptions
  z.object({
    type: z.literal('subscribe_channel'),
    channel: channelSchema
  }),
  z.object({
    type: z.literal('unsubscribe_channel'),
    channel: channelSchema
  }),

  // Dashboard data requests
  z.object({
    type: z.literal('get_dashboard_data'),
    deviceId: deviceIdSchema.optional()
  }),

  // Tracking data requests
  z.object({
    type: z.literal('get_tracking_data')
  }),
  z.object({
    type: z.literal('get_vehicle_details'),
    targetId: targetIdSchema
  }),
  z.object({
    type: z.literal('get_visible_vehicles')
  }),

  // Classification data requests
  z.object({
    type: z.literal('get_classification_data')
  }),

  // Health check
  z.object({
    type: z.literal('ping')
  })
]);

/**
 * Type inference from schema
 */
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

/**
 * Validate WebSocket message
 * Returns validated message or throws ZodError
 */
export function validateWebSocketMessage(rawMessage: unknown): WebSocketMessage {
  return WebSocketMessageSchema.parse(rawMessage);
}

/**
 * Safe validation that returns success/error result
 */
export function safeValidateWebSocketMessage(rawMessage: unknown): {
  success: boolean;
  data?: WebSocketMessage;
  error?: string;
} {
  const result = WebSocketMessageSchema.safeParse(rawMessage);

  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  } else {
    return {
      success: false,
      error: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
    };
  }
}
