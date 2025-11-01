/**
 * Environment Configuration
 * Validates and exports environment variables using Zod
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file if it exists
dotenv.config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('8080'),
  HEALTH_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('6379'),

  // MongoDB
  MONGODB_HOST: z.string().default('localhost'),
  MONGODB_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('27017'),
  MONGODB_USERNAME: z.string().default('admin'),
  MONGODB_PASSWORD: z.string().default('admin123'),
  MONGODB_AUTH_DATABASE: z.string().default('admin'),
  MONGODB_DASHBOARD_DATABASE: z.string().default('traffic_signal_dashboard'),

  // Radar
  RADAR_PROTOCOL_VERSION: z.string().default('2.1'),
  RADAR_DEVICE_ID: z.string().default('P1-center'),

  // Dashboard
  DASHBOARD_REFRESH_INTERVAL: z.string().transform(Number).pipe(z.number().positive()).default('1000'),
  QUEUE_THRESHOLD: z.string().transform(Number).pipe(z.number().positive()).default('50'),
  SPEED_LIMIT: z.string().transform(Number).pipe(z.number().positive()).default('60'),
  LANES: z.string().default('11,12,13,485'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('1000'),
  DISABLE_RATE_LIMITING: z.string().transform(val => val === 'true').default('false'),
});

type EnvSchema = z.infer<typeof envSchema>;

// Validate environment variables
let env: EnvSchema;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    console.error(error.errors);
    process.exit(1);
  }
  throw error;
}

export const config = {
  // Server
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  healthPort: env.HEALTH_PORT,
  logLevel: env.LOG_LEVEL,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Redis
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
  },

  // MongoDB
  mongodb: {
    host: env.MONGODB_HOST,
    port: env.MONGODB_PORT,
    username: env.MONGODB_USERNAME,
    password: env.MONGODB_PASSWORD,
    authDatabase: env.MONGODB_AUTH_DATABASE,
    dashboardDatabase: env.MONGODB_DASHBOARD_DATABASE,
    url: `mongodb://${env.MONGODB_USERNAME}:${env.MONGODB_PASSWORD}@${env.MONGODB_HOST}:${env.MONGODB_PORT}/${env.MONGODB_DASHBOARD_DATABASE}?authSource=${env.MONGODB_AUTH_DATABASE}`,
  },

  // Radar
  radar: {
    protocolVersion: env.RADAR_PROTOCOL_VERSION,
    deviceId: env.RADAR_DEVICE_ID,
  },

  // Dashboard
  dashboard: {
    refreshInterval: env.DASHBOARD_REFRESH_INTERVAL,
    queueThreshold: env.QUEUE_THRESHOLD,
    speedLimit: env.SPEED_LIMIT,
    lanes: env.LANES.split(',').map(l => parseInt(l.trim(), 10)),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    disabled: env.DISABLE_RATE_LIMITING,
  },
};

export type Config = typeof config;
