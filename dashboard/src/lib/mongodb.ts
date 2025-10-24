import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DASHBOARD_DATABASE}?authSource=${process.env.MONGODB_AUTH_DATABASE}`;
  
  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB server');
    
    db = client.db(process.env.MONGODB_DASHBOARD_DATABASE);
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function closeDatabaseConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}
