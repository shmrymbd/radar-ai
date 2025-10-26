/**
 * MongoDB Index Management
 * Creates and manages database indexes for optimal query performance
 */

import { connectToDatabase } from './mongodb';

/**
 * Create all necessary indexes for the application
 */
export async function createIndexes(): Promise<void> {
  console.log('📊 Creating MongoDB indexes...');

  try {
    const db = await connectToDatabase();

    // Classification History Collection Indexes
    const classificationHistory = db.collection('classification_history');

    // Primary index for device-scoped time-range queries
    await classificationHistory.createIndex(
      { deviceId: 1, timestamp: -1 },
      {
        name: 'deviceId_timestamp_desc',
        background: true
      }
    );
    console.log('✅ Created index: classification_history.deviceId_timestamp_desc');

    // Index for aggregation queries by time period
    await classificationHistory.createIndex(
      { deviceId: 1, timeSlot: 1 },
      {
        name: 'deviceId_timeSlot',
        background: true
      }
    );
    console.log('✅ Created index: classification_history.deviceId_timeSlot');

    // Index for vehicle type filtering
    await classificationHistory.createIndex(
      { deviceId: 1, 'vehicleTypes.type': 1, timestamp: -1 },
      {
        name: 'deviceId_vehicleType_timestamp',
        background: true,
        sparse: true
      }
    );
    console.log('✅ Created index: classification_history.deviceId_vehicleType_timestamp');

    // Vehicle Tracking Collection Indexes (if exists)
    const vehicleTracking = db.collection('vehicle_tracking');

    // Index for device and targetId lookups
    await vehicleTracking.createIndex(
      { deviceId: 1, targetId: 1, timestamp: -1 },
      {
        name: 'deviceId_targetId_timestamp',
        background: true
      }
    );
    console.log('✅ Created index: vehicle_tracking.deviceId_targetId_timestamp');

    // Index for lane-based queries
    await vehicleTracking.createIndex(
      { deviceId: 1, laneNo: 1, timestamp: -1 },
      {
        name: 'deviceId_lane_timestamp',
        background: true
      }
    );
    console.log('✅ Created index: vehicle_tracking.deviceId_lane_timestamp');

    // TTL index for automatic cleanup of old tracking data (optional, 30 days)
    await vehicleTracking.createIndex(
      { timestamp: 1 },
      {
        name: 'timestamp_ttl',
        expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
        background: true
      }
    );
    console.log('✅ Created TTL index: vehicle_tracking.timestamp_ttl (30 days)');

    // PassData Collection Indexes (if exists)
    const passData = db.collection('pass_data');

    // Index for device-scoped queries
    await passData.createIndex(
      { deviceId: 1, timestamp: -1 },
      {
        name: 'deviceId_timestamp_desc',
        background: true
      }
    );
    console.log('✅ Created index: pass_data.deviceId_timestamp_desc');

    // Index for vehicle type analysis
    await passData.createIndex(
      { deviceId: 1, vehicleType: 1, timestamp: -1 },
      {
        name: 'deviceId_vehicleType_timestamp',
        background: true
      }
    );
    console.log('✅ Created index: pass_data.deviceId_vehicleType_timestamp');

    // Index for lane-based analysis
    await passData.createIndex(
      { deviceId: 1, laneNumber: 1, timestamp: -1 },
      {
        name: 'deviceId_lane_timestamp',
        background: true
      }
    );
    console.log('✅ Created index: pass_data.deviceId_lane_timestamp');

    console.log('✅ All MongoDB indexes created successfully');

  } catch (error) {
    console.error('❌ Error creating MongoDB indexes:', error);
    throw error;
  }
}

/**
 * List all indexes for a collection
 */
export async function listIndexes(collectionName: string): Promise<any[]> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(collectionName);
    const indexes = await collection.indexes();

    console.log(`\n📋 Indexes for collection "${collectionName}":`);
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`);
      console.log(`   Keys: ${JSON.stringify(index.key)}`);
      if (index.expireAfterSeconds) {
        console.log(`   TTL: ${index.expireAfterSeconds} seconds`);
      }
    });

    return indexes;
  } catch (error) {
    console.error(`❌ Error listing indexes for ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Drop all indexes for a collection (except _id)
 */
export async function dropIndexes(collectionName: string): Promise<void> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(collectionName);

    await collection.dropIndexes();
    console.log(`✅ Dropped all indexes for collection "${collectionName}" (except _id)`);
  } catch (error) {
    console.error(`❌ Error dropping indexes for ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats(collectionName: string): Promise<any> {
  try {
    const db = await connectToDatabase();
    const stats = await db.command({
      collStats: collectionName,
      indexDetails: true
    });

    console.log(`\n📊 Index statistics for "${collectionName}":`);
    console.log(`Total indexes: ${stats.nindexes}`);
    console.log(`Total index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    return stats;
  } catch (error) {
    console.error(`❌ Error getting index stats for ${collectionName}:`, error);
    throw error;
  }
}

// If running directly (e.g., node mongodb-indexes.ts)
if (require.main === module) {
  createIndexes()
    .then(() => {
      console.log('\n🎉 Index creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Index creation failed:', error);
      process.exit(1);
    });
}
