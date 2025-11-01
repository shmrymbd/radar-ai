/**
 * MongoDB Client Configuration
 * Connection pooling with retry logic and health checks
 */

import { MongoClient, Db } from 'mongodb';
import { config } from './env';
import { createLogger } from '../utils/logger';

const logger = createLogger('mongodb');

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnecting = false;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Sanitize MongoDB URI for logging
 * Removes password from connection string to prevent credential exposure
 */
function sanitizeMongoUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Connect to MongoDB with connection pooling and retry logic
 */
export async function connectToDatabase(): Promise<Db> {
  // Return existing connection if available
  if (db && client) {
    try {
      // Verify connection is alive
      await client.db('admin').command({ ping: 1 });
      return db;
    } catch (error) {
      // Connection is dead, reset and reconnect
      logger.warn('MongoDB connection lost, reconnecting...');
      db = null;
      client = null;
    }
  }

  // Prevent concurrent connection attempts
  if (isConnecting) {
    // Wait for existing connection attempt
    while (isConnecting) {
      await sleep(100);
    }
    if (db) return db;
  }

  isConnecting = true;

  const uri = config.mongodb.url;
  const sanitizedUri = sanitizeMongoUri(uri);

  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(`MongoDB connection attempt ${attempt}/${MAX_RETRIES}`, {
        uri: sanitizedUri,
      });

      client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
      });

      await client.connect();
      logger.info('Connected to MongoDB server', {
        database: config.mongodb.dashboardDatabase,
      });

      db = client.db(config.mongodb.dashboardDatabase);

      // Verify connection
      await db.command({ ping: 1 });
      logger.info('MongoDB ping successful');

      isConnecting = false;
      return db;
    } catch (error) {
      lastError = error as Error;
      logger.error(`MongoDB connection attempt ${attempt} failed`, {
        error: lastError.message,
      });

      // Close client on error
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          // Ignore close errors
        }
        client = null;
      }

      // Wait before retrying (except on last attempt)
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        logger.info(`Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  isConnecting = false;

  // All retries failed
  logger.error('Failed to connect to MongoDB after all retries', {
    attempts: MAX_RETRIES,
    lastError: lastError?.message,
  });

  throw new Error(
    `MongoDB connection failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * Close MongoDB connection
 * Should be called during graceful shutdown
 */
export async function closeMongoConnection(): Promise<void> {
  if (client) {
    try {
      await client.close();
      logger.info('MongoDB connection closed gracefully');
    } catch (error) {
      logger.error('Error closing MongoDB connection', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      client = null;
      db = null;
    }
  }
}

/**
 * Check if MongoDB is connected
 */
export function isMongoConnected(): boolean {
  return db !== null && client !== null;
}

/**
 * Get MongoDB client instance
 */
export function getMongoClient(): MongoClient | null {
  return client;
}

/**
 * Get database instance
 */
export function getDatabase(): Db | null {
  return db;
}

export { client, db };
