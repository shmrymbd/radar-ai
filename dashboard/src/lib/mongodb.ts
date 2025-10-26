import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnecting = false;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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
      console.warn('MongoDB connection lost, reconnecting...');
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

  const uri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DASHBOARD_DATABASE}?authSource=${process.env.MONGODB_AUTH_DATABASE}`;

  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`MongoDB connection attempt ${attempt}/${MAX_RETRIES}...`);

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
      console.log('✅ Connected to MongoDB server');

      db = client.db(process.env.MONGODB_DASHBOARD_DATABASE);

      // Verify connection
      await db.command({ ping: 1 });
      console.log('✅ MongoDB connection verified');

      isConnecting = false;
      return db;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error);

      // Clean up failed connection
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.error('Error closing failed MongoDB client:', closeError);
        }
        client = null;
      }

      db = null;

      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  isConnecting = false;

  throw new Error(
    `Failed to connect to MongoDB after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown error'}`
  );
}

export async function closeDatabaseConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}
