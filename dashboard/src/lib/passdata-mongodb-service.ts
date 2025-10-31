/**
 * MongoDB service for querying PassData classification metrics
 * Replaces in-memory ClassificationProcessor with MongoDB aggregations
 */

import { connectToDatabase } from './mongodb';

export class PassDataMongoDBService {
  private static instance: PassDataMongoDBService;
  private collectionName = 'passdata';

  private constructor() {}

  public static getInstance(): PassDataMongoDBService {
    if (!PassDataMongoDBService.instance) {
      PassDataMongoDBService.instance = new PassDataMongoDBService();
    }
    return PassDataMongoDBService.instance;
  }

  /**
   * Initialize MongoDB collection with indexes
   */
  public async initialize(): Promise<void> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(this.collectionName);

      // Create indexes for efficient querying
      await collection.createIndex({ deviceId: 1, timestamp: -1 });
      await collection.createIndex({ deviceId: 1, vehicleType: 1 });
      await collection.createIndex({ deviceId: 1, laneNumber: 1 });
      await collection.createIndex({ timestamp: -1 });

      // Unique index to prevent duplicates
      await collection.createIndex(
        { deviceId: 1, timestamp: 1, laneNumber: 1, vehicleType: 1 },
        { unique: true, sparse: true }
      );

      console.log('✅ MongoDB PassData indexes created');
    } catch (error) {
      console.error('❌ Error creating MongoDB indexes:', error);
    }
  }

  /**
   * Get classification metrics for a device
   */
  public async getClassificationMetrics(deviceId: string) {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(this.collectionName);

      // Get total vehicles
      const totalVehicles = await collection.countDocuments({ deviceId });

      // Get vehicle types with counts and averages
      const vehicleTypes = await collection.aggregate([
        { $match: { deviceId } },
        {
          $group: {
            _id: '$vehicleType',
            count: { $sum: 1 },
            averageSpeed: { $avg: '$crossSectionSpeed' },
            minSpeed: { $min: '$crossSectionSpeed' },
            maxSpeed: { $max: '$crossSectionSpeed' }
          }
        },
        {
          $project: {
            vehicleType: '$_id',
            count: 1,
            percentage: { $multiply: [{ $divide: ['$count', totalVehicles || 1] }, 100] },
            averageSpeed: { $round: ['$averageSpeed', 1] },
            speedRange: {
              min: '$minSpeed',
              max: '$maxSpeed',
              median: '$averageSpeed' // Simplified; true median requires more complex aggregation
            }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();

      // Get lane utilization
      const laneUtilization = await collection.aggregate([
        { $match: { deviceId } },
        {
          $group: {
            _id: '$laneNumber',
            totalVehicles: { $sum: 1 },
            averageSpeed: { $avg: '$crossSectionSpeed' },
            avgOccupancy: { $avg: '$occupancyDuration' }
          }
        },
        {
          $project: {
            laneNumber: '$_id',
            totalVehicles: 1,
            utilizationRate: { $divide: ['$totalVehicles', totalVehicles || 1] },
            averageSpeed: { $round: ['$averageSpeed', 1] },
            occupancyRate: { $divide: ['$avgOccupancy', 100] } // Normalize to 0-1
          }
        },
        { $sort: { laneNumber: 1 } }
      ]).toArray();

      // Get speed distribution and violations
      const speedLimit = 60; // km/h
      const averageSpeeds = await collection.aggregate([
        { $match: { deviceId } },
        {
          $group: {
            _id: '$vehicleType',
            averageSpeed: { $avg: '$crossSectionSpeed' },
            speeds: { $push: '$crossSectionSpeed' }
          }
        },
        {
          $project: {
            vehicleType: '$_id',
            averageSpeed: { $round: ['$averageSpeed', 1] },
            speedDistribution: {
              '0-20': {
                $size: {
                  $filter: {
                    input: '$speeds',
                    cond: { $and: [{ $gte: ['$$this', 0] }, { $lt: ['$$this', 20] }] }
                  }
                }
              },
              '20-40': {
                $size: {
                  $filter: {
                    input: '$speeds',
                    cond: { $and: [{ $gte: ['$$this', 20] }, { $lt: ['$$this', 40] }] }
                  }
                }
              },
              '40-60': {
                $size: {
                  $filter: {
                    input: '$speeds',
                    cond: { $and: [{ $gte: ['$$this', 40] }, { $lt: ['$$this', 60] }] }
                  }
                }
              },
              '60-80': {
                $size: {
                  $filter: {
                    input: '$speeds',
                    cond: { $and: [{ $gte: ['$$this', 60] }, { $lt: ['$$this', 80] }] }
                  }
                }
              },
              '80+': {
                $size: {
                  $filter: {
                    input: '$speeds',
                    cond: { $gte: ['$$this', 80] }
                  }
                }
              }
            },
            violationCount: {
              $size: {
                $filter: {
                  input: '$speeds',
                  cond: { $gt: ['$$this', speedLimit] }
                }
              }
            }
          }
        }
      ]).toArray();

      // Format speed distribution
      const formattedAverageSpeeds = averageSpeeds.map((item: any) => {
        const total = item.speedDistribution['0-20'] + item.speedDistribution['20-40'] +
          item.speedDistribution['40-60'] + item.speedDistribution['60-80'] +
          item.speedDistribution['80+'];

        return {
          vehicleType: item.vehicleType,
          averageSpeed: item.averageSpeed,
          speedDistribution: [
            {
              range: '0-20 km/h',
              count: item.speedDistribution['0-20'],
              percentage: total > 0 ? (item.speedDistribution['0-20'] / total) * 100 : 0
            },
            {
              range: '20-40 km/h',
              count: item.speedDistribution['20-40'],
              percentage: total > 0 ? (item.speedDistribution['20-40'] / total) * 100 : 0
            },
            {
              range: '40-60 km/h',
              count: item.speedDistribution['40-60'],
              percentage: total > 0 ? (item.speedDistribution['40-60'] / total) * 100 : 0
            },
            {
              range: '60-80 km/h',
              count: item.speedDistribution['60-80'],
              percentage: total > 0 ? (item.speedDistribution['60-80'] / total) * 100 : 0
            },
            {
              range: '80+ km/h',
              count: item.speedDistribution['80+'],
              percentage: total > 0 ? (item.speedDistribution['80+'] / total) * 100 : 0
            }
          ],
          violationCount: item.violationCount,
          violationRate: total > 0 ? (item.violationCount / total) * 100 : 0
        };
      });

      // Get peak hours
      const peakHours = await collection.aggregate([
        { $match: { deviceId } },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            totalVehicles: { $sum: 1 },
            averageSpeed: { $avg: '$crossSectionSpeed' }
          }
        },
        {
          $project: {
            hour: '$_id',
            totalVehicles: 1,
            averageSpeed: { $round: ['$averageSpeed', 1] },
            trafficDensity: { $divide: ['$totalVehicles', 1000] } // Normalize
          }
        },
        { $sort: { totalVehicles: -1 } },
        { $limit: 5 }
      ]).toArray();

      // Add vehicle types breakdown for peak hours
      const formattedPeakHours = await Promise.all(
        peakHours.map(async (peak: any) => {
          const vehicleTypes = await collection.aggregate([
            { $match: { deviceId, $expr: { $eq: [{ $hour: '$timestamp' }, peak.hour] } } },
            {
              $group: {
                _id: '$vehicleType',
                count: { $sum: 1 }
              }
            }
          ]).toArray();

          return {
            ...peak,
            vehicleTypes: vehicleTypes.map((vt: any) => ({
              vehicleType: vt._id,
              count: vt.count,
              percentage: peak.totalVehicles > 0 ? (vt.count / peak.totalVehicles) * 100 : 0,
              averageSpeed: 0,
              speedRange: { min: 0, max: 0, median: 0 }
            }))
          };
        })
      );

      return {
        totalVehicles,
        vehicleTypes,
        averageSpeeds: formattedAverageSpeeds,
        laneUtilization,
        peakHours: formattedPeakHours,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting classification metrics from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get classification summary
   */
  public async getClassificationSummary(deviceId: string) {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(this.collectionName);

      const totalVehicles = await collection.countDocuments({ deviceId });

      const uniqueVehicleTypes = await collection.distinct('vehicleType', { deviceId });

      const avgSpeedResult = await collection.aggregate([
        { $match: { deviceId } },
        { $group: { _id: null, averageSpeed: { $avg: '$crossSectionSpeed' } } }
      ]).toArray();

      const averageSpeed = avgSpeedResult.length > 0 ? avgSpeedResult[0].averageSpeed : 0;

      const speedLimit = 60;
      const violations = await collection.countDocuments({
        deviceId,
        crossSectionSpeed: { $gt: speedLimit }
      });

      const laneUtilResult = await collection.aggregate([
        { $match: { deviceId } },
        { $group: { _id: '$laneNumber', count: { $sum: 1 } } },
        { $group: { _id: null, avgUtil: { $avg: '$count' } } }
      ]).toArray();

      const laneUtilization = laneUtilResult.length > 0
        ? laneUtilResult[0].avgUtil / (totalVehicles || 1)
        : 0;

      const peakHourResult = await collection.aggregate([
        { $match: { deviceId } },
        { $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]).toArray();

      const peakHour = peakHourResult.length > 0 ? peakHourResult[0]._id : 0;

      // Get traffic composition
      const trafficComposition = await collection.aggregate([
        { $match: { deviceId } },
        {
          $group: {
            _id: '$vehicleType',
            count: { $sum: 1 },
            averageSpeed: { $avg: '$crossSectionSpeed' },
            minSpeed: { $min: '$crossSectionSpeed' },
            maxSpeed: { $max: '$crossSectionSpeed' }
          }
        },
        {
          $project: {
            vehicleType: '$_id',
            count: 1,
            percentage: { $multiply: [{ $divide: ['$count', totalVehicles || 1] }, 100] },
            averageSpeed: { $round: ['$averageSpeed', 1] },
            speedRange: {
              min: '$minSpeed',
              max: '$maxSpeed',
              median: '$averageSpeed'
            }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();

      return {
        totalVehicles,
        uniqueVehicleTypes: uniqueVehicleTypes.length,
        averageSpeed: Math.round(averageSpeed * 10) / 10,
        speedViolations: violations,
        laneUtilization: Math.round(laneUtilization * 100) / 100,
        peakHour,
        trafficComposition
      };

    } catch (error) {
      console.error('❌ Error getting classification summary from MongoDB:', error);
      throw error;
    }
  }
}

export default PassDataMongoDBService;
