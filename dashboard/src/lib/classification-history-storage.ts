import { MongoClient, Db, Collection } from 'mongodb';
import { ClassificationHistory, HistoricalChartData, TimePeriodFilter } from '@/types/classification-history';

export class ClassificationHistoryStorage {
  private client: MongoClient;
  private db: Db;
  private collection: Collection<ClassificationHistory>;

  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI || 'mongodb://admin:admin123@192.168.6.22:27017/traffic_analysis?authSource=admin');
    this.db = this.client.db('traffic_analysis');
    this.collection = this.db.collection<ClassificationHistory>('classification_history');
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ Connected to MongoDB for classification history storage');
      
      // Create indexes for performance
      await this.createIndexes();
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  private async createIndexes(): Promise<void> {
    try {
      // Create compound index for efficient time-based queries
      await this.collection.createIndex({ deviceId: 1, timestamp: 1 });
      
      // Create index for time slot queries
      await this.collection.createIndex({ timeSlot: 1 });
      
      // Create index for device-specific queries
      await this.collection.createIndex({ deviceId: 1 });
      
      console.log('✅ Created MongoDB indexes for classification history');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
    }
  }

  /**
   * Store 15-minute aggregated classification data
   */
  async storeClassificationData(data: ClassificationHistory): Promise<void> {
    try {
      // Use upsert to handle duplicate time slots
      await this.collection.updateOne(
        { 
          deviceId: data.deviceId, 
          timeSlot: data.timeSlot 
        },
        { 
          $set: {
            ...data,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      console.log(`✅ Stored classification data for ${data.deviceId} at ${data.timeSlot}`);
    } catch (error) {
      console.error('❌ Error storing classification data:', error);
      throw error;
    }
  }

  /**
   * Retrieve historical data for charting with pagination
   */
  async getHistoricalData(
    deviceId: string,
    timeFilter: TimePeriodFilter,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: 'timestamp' | 'totalVehicles';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    data: HistoricalChartData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      // Ensure connection is established
      try {
        await this.client.db().admin().ping();
      } catch {
        await this.connect();
      }

      const page = options?.page || 1;
      const limit = options?.limit || 100;
      const sortBy = options?.sortBy || 'timestamp';
      const sortOrder = options?.sortOrder || 'asc';
      const skip = (page - 1) * limit;

      const query = {
        deviceId,
        timestamp: {
          $gte: timeFilter.startDate,
          $lte: timeFilter.endDate
        }
      };

      // Get total count for pagination
      const total = await this.collection.countDocuments(query);

      // Get paginated data with optimized query
      const data = await this.collection
        .find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .project({
          timeSlot: 1,
          vehicleTypes: 1,
          totalVehicles: 1,
          'speedAnalysis.averageSpeed': 1,
          'speedAnalysis.speedViolations': 1
        })
        .toArray();

      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map(item => ({
          timeSlot: item.timeSlot,
          vehicleTypes: item.vehicleTypes,
          totalVehicles: item.totalVehicles,
          averageSpeed: item.speedAnalysis.averageSpeed,
          speedViolations: item.speedAnalysis.speedViolations
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('❌ Error retrieving historical data:', error);
      throw error;
    }
  }

  /**
   * Get aggregated data for specific time periods
   */
  async getAggregatedData(
    deviceId: string,
    timeFilter: TimePeriodFilter
  ): Promise<{
    totalVehicles: number;
    vehicleTypeDistribution: Record<string, number>;
    averageSpeed: number;
    speedViolations: number;
    peakHour: number;
  }> {
    try {
      // Ensure connection is established
      try {
        await this.client.db().admin().ping();
      } catch {
        await this.connect();
      }

      const pipeline = [
        {
          $match: {
            deviceId,
            timestamp: {
              $gte: timeFilter.startDate,
              $lte: timeFilter.endDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalVehicles: { $sum: '$totalVehicles' },
            avgSpeed: { $avg: '$speedAnalysis.averageSpeed' },
            totalViolations: { $sum: '$speedAnalysis.speedViolations' },
            carCount: { $sum: '$vehicleTypes.car' },
            suvCount: { $sum: '$vehicleTypes.suv' },
            truckCount: { $sum: '$vehicleTypes.truck' },
            motorcycleCount: { $sum: '$vehicleTypes.motorcycle' },
            vanCount: { $sum: '$vehicleTypes.van' }
          }
        }
      ];

      const result = await this.collection.aggregate(pipeline).toArray();
      
      if (result.length === 0) {
        return {
          totalVehicles: 0,
          vehicleTypeDistribution: {},
          averageSpeed: 0,
          speedViolations: 0,
          peakHour: 0
        };
      }

      const data = result[0];
      const total = data.totalVehicles;

      return {
        totalVehicles: total,
        vehicleTypeDistribution: {
          car: total > 0 ? (data.carCount / total) * 100 : 0,
          suv: total > 0 ? (data.suvCount / total) * 100 : 0,
          truck: total > 0 ? (data.truckCount / total) * 100 : 0,
          motorcycle: total > 0 ? (data.motorcycleCount / total) * 100 : 0,
          van: total > 0 ? (data.vanCount / total) * 100 : 0
        },
        averageSpeed: data.avgSpeed || 0,
        speedViolations: data.totalViolations || 0,
        peakHour: 0 // TODO: Implement peak hour calculation
      };
    } catch (error) {
      console.error('❌ Error getting aggregated data:', error);
      throw error;
    }
  }

  /**
   * Clean up old data based on retention policy
   */
  async cleanupOldData(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.collection.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`✅ Cleaned up ${result.deletedCount} old classification records`);
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error);
      throw error;
    }
  }

  /**
   * Compress old data by aggregating to hourly intervals
   * This reduces storage for data older than specified days
   */
  async compressOldData(compressAfterDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - compressAfterDays);

      // Find all data older than cutoff date
      const oldData = await this.collection.find({
        timestamp: { $lt: cutoffDate }
      }).toArray();

      if (oldData.length === 0) {
        console.log('✅ No data to compress');
        return;
      }

      // Group by hour and device
      const hourlyGroups = new Map<string, ClassificationHistory[]>();

      for (const record of oldData) {
        const hourKey = `${record.deviceId}:${record.timestamp.toISOString().slice(0, 13)}`;
        if (!hourlyGroups.has(hourKey)) {
          hourlyGroups.set(hourKey, []);
        }
        hourlyGroups.get(hourKey)!.push(record);
      }

      // Aggregate each hourly group
      const bulkOps = [];
      const deleteIds = [];

      for (const [hourKey, records] of hourlyGroups.entries()) {
        if (records.length <= 1) continue; // Skip if only one record

        const [deviceId, hour] = hourKey.split(':');

        // Aggregate vehicle types
        const aggregatedVehicleTypes = {
          car: 0,
          suv: 0,
          truck: 0,
          motorcycle: 0,
          van: 0
        };

        let totalVehicles = 0;
        let totalSpeed = 0;
        let totalViolations = 0;
        let recordCount = 0;

        for (const record of records) {
          aggregatedVehicleTypes.car += record.vehicleTypes.car || 0;
          aggregatedVehicleTypes.suv += record.vehicleTypes.suv || 0;
          aggregatedVehicleTypes.truck += record.vehicleTypes.truck || 0;
          aggregatedVehicleTypes.motorcycle += record.vehicleTypes.motorcycle || 0;
          aggregatedVehicleTypes.van += record.vehicleTypes.van || 0;

          totalVehicles += record.totalVehicles || 0;
          totalSpeed += record.speedAnalysis.averageSpeed || 0;
          totalViolations += record.speedAnalysis.speedViolations || 0;
          recordCount++;

          // Mark for deletion
          deleteIds.push(record._id);
        }

        // Create compressed hourly record
        const compressedRecord: Partial<ClassificationHistory> = {
          deviceId,
          timestamp: new Date(hour + ':00:00Z'),
          timeSlot: `${hour.slice(0, 10)}-${hour.slice(11, 13)}-00`, // Hourly slot
          vehicleTypes: aggregatedVehicleTypes,
          laneUtilization: records[0].laneUtilization, // Keep first record's lane data
          speedAnalysis: {
            averageSpeed: recordCount > 0 ? totalSpeed / recordCount : 0,
            speedViolations: totalViolations,
            speedDistribution: records[0].speedAnalysis.speedDistribution // Keep first record's distribution
          },
          totalVehicles,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        bulkOps.push({
          updateOne: {
            filter: { deviceId, timeSlot: compressedRecord.timeSlot },
            update: { $set: compressedRecord },
            upsert: true
          }
        });
      }

      // Execute bulk operations
      if (bulkOps.length > 0) {
        await this.collection.bulkWrite(bulkOps);
        console.log(`✅ Compressed ${bulkOps.length} hourly groups`);
      }

      // Delete original 15-minute records
      const validDeleteIds = deleteIds.filter((id): id is NonNullable<typeof id> => id !== undefined);
      if (validDeleteIds.length > 0) {
        await this.collection.deleteMany({ _id: { $in: validDeleteIds } });
        console.log(`✅ Deleted ${validDeleteIds.length} compressed records`);
      }

    } catch (error) {
      console.error('❌ Error compressing old data:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalRecords: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
    storageSize: number;
    deviceCounts: Record<string, number>;
  }> {
    try {
      const totalRecords = await this.collection.countDocuments();

      const oldest = await this.collection.findOne({}, { sort: { timestamp: 1 } });
      const newest = await this.collection.findOne({}, { sort: { timestamp: -1 } });

      // Get device counts
      const deviceAggregation = await this.collection.aggregate([
        { $group: { _id: '$deviceId', count: { $sum: 1 } } }
      ]).toArray();

      const deviceCounts: Record<string, number> = {};
      for (const item of deviceAggregation) {
        deviceCounts[item._id] = item.count;
      }

      // Get collection stats
      const stats = await this.db.command({ collStats: 'classification_history' });

      return {
        totalRecords,
        oldestRecord: oldest?.timestamp || null,
        newestRecord: newest?.timestamp || null,
        storageSize: stats.size || 0,
        deviceCounts
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      throw error;
    }
  }

  /**
   * Run maintenance tasks (cleanup + compression)
   */
  async runMaintenance(options: {
    retentionDays?: number;
    compressAfterDays?: number;
  } = {}): Promise<void> {
    const { retentionDays = 90, compressAfterDays = 30 } = options;

    console.log('🔧 Starting maintenance tasks...');

    try {
      // First compress old data
      await this.compressOldData(compressAfterDays);

      // Then cleanup very old data
      await this.cleanupOldData(retentionDays);

      // Get final stats
      const stats = await this.getStorageStats();
      console.log(`✅ Maintenance complete. Total records: ${stats.totalRecords}, Storage: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('❌ Error during maintenance:', error);
      throw error;
    }
  }

  /**
   * Batch insert multiple classification history records
   * Optimized for bulk data migration scenarios
   */
  async batchInsert(
    records: ClassificationHistory[],
    batchSize: number = 100
  ): Promise<{
    inserted: number;
    updated: number;
    failed: number;
    errors: Error[];
  }> {
    const result = {
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [] as Error[]
    };

    try {
      // Ensure connection
      try {
        await this.client.db().admin().ping();
      } catch {
        await this.connect();
      }

      // Process in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const bulkOps = batch.map(record => ({
          updateOne: {
            filter: {
              deviceId: record.deviceId,
              timeSlot: record.timeSlot
            },
            update: {
              $set: {
                ...record,
                updatedAt: new Date()
              }
            },
            upsert: true
          }
        }));

        try {
          const batchResult = await this.collection.bulkWrite(bulkOps, { ordered: false });
          result.inserted += batchResult.upsertedCount || 0;
          result.updated += batchResult.modifiedCount || 0;
        } catch (error) {
          result.failed += batch.length;
          result.errors.push(error as Error);
          console.error(`❌ Error in batch ${i / batchSize + 1}:`, error);
        }

        // Progress log every 10 batches
        if ((i / batchSize + 1) % 10 === 0) {
          console.log(`📊 Progress: ${i + batch.length}/${records.length} records processed`);
        }
      }

      console.log(`✅ Batch insert complete: ${result.inserted} inserted, ${result.updated} updated, ${result.failed} failed`);
      return result;

    } catch (error) {
      console.error('❌ Error in batch insert:', error);
      result.errors.push(error as Error);
      return result;
    }
  }

  /**
   * Migrate historical data from a different source/format
   * Useful for migrating from Redis or other legacy storage
   */
  async migrateFromSource(
    getData: (offset: number, limit: number) => Promise<ClassificationHistory[]>,
    totalRecords: number,
    batchSize: number = 100
  ): Promise<{
    totalProcessed: number;
    successful: number;
    failed: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let successful = 0;
    let failed = 0;

    console.log(`🔄 Starting migration of ${totalRecords} records...`);

    try {
      for (let offset = 0; offset < totalRecords; offset += batchSize) {
        const limit = Math.min(batchSize, totalRecords - offset);

        // Get data from source
        const records = await getData(offset, limit);

        if (records.length === 0) {
          console.log(`⚠️ No more records at offset ${offset}`);
          break;
        }

        // Batch insert
        const result = await this.batchInsert(records, batchSize);
        successful += result.inserted + result.updated;
        failed += result.failed;
        totalProcessed += records.length;

        // Progress update
        const progress = ((totalProcessed / totalRecords) * 100).toFixed(2);
        console.log(`📊 Migration progress: ${progress}% (${totalProcessed}/${totalRecords})`);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Migration complete in ${(duration / 1000).toFixed(2)}s`);
      console.log(`   Total: ${totalProcessed}, Successful: ${successful}, Failed: ${failed}`);

      return {
        totalProcessed,
        successful,
        failed,
        duration
      };

    } catch (error) {
      console.error('❌ Error during migration:', error);
      throw error;
    }
  }

  /**
   * Batch update records matching a criteria
   */
  async batchUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    batchSize: number = 100
  ): Promise<number> {
    try {
      let totalUpdated = 0;
      let hasMore = true;

      while (hasMore) {
        const result = await this.collection.updateMany(
          filter,
          { $set: update },
          { maxTimeMS: 30000 }
        );

        totalUpdated += result.modifiedCount;

        // Check if there are more documents to update
        const remaining = await this.collection.countDocuments(filter);
        hasMore = remaining > 0;

        if (hasMore) {
          console.log(`📊 Updated ${totalUpdated} records, ${remaining} remaining...`);
        }
      }

      console.log(`✅ Batch update complete: ${totalUpdated} records updated`);
      return totalUpdated;

    } catch (error) {
      console.error('❌ Error in batch update:', error);
      throw error;
    }
  }
}
