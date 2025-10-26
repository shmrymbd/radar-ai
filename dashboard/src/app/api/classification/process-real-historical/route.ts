import { NextResponse } from 'next/server';
import { RedisStorage } from '@/lib/redis-storage';
import { ClassificationHistoryStorage } from '@/lib/classification-history-storage';
import { ClassificationHistory } from '@/types/classification-history';

const redisStorage = RedisStorage.getInstance();
const historyStorage = new ClassificationHistoryStorage();

export async function POST() {
  try {
    console.log('📡 Processing real radar data for historical classification...');
    
    // Get real pass data from Redis
    const realPassData = await redisStorage.getLatestPassData(100); // Get last 100 entries
    
    if (realPassData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No real pass data available in Redis',
        message: 'Please ensure radar data is being streamed to Redis'
      }, { status: 404 });
    }
    
    console.log(`📊 Found ${realPassData.length} real pass data entries`);
    
    // Process the data and group by 15-minute intervals
    const intervalData = new Map<string, any[]>();
    
    for (const data of realPassData) {
      // Map vehicle types to classification strings
      const typeMap: { [key: string]: string } = {
        'car': 'car',
        'van': 'van', 
        'suv': 'suv',
        'truck': 'truck',
        'motorcycle': 'motorcycle',
        'bus': 'van',
        'unknown': 'car'
      };
      
      const vehicleType = typeMap[data.vehicleType?.toLowerCase()] || 'car';
      const processedData = {
        ...data,
        vehicleType: vehicleType,
        deviceId: 'test'
      };
      
      // Group by 15-minute intervals
      const timestamp = new Date(processedData.timestamp);
      const intervalStart = new Date(timestamp);
      intervalStart.setMinutes(Math.floor(timestamp.getMinutes() / 15) * 15, 0, 0);
      
      const timeSlot = `${intervalStart.getFullYear()}-${(intervalStart.getMonth() + 1).toString().padStart(2, '0')}-${intervalStart.getDate().toString().padStart(2, '0')}-${intervalStart.getHours().toString().padStart(2, '0')}-${intervalStart.getMinutes().toString().padStart(2, '0')}`;
      
      if (!intervalData.has(timeSlot)) {
        intervalData.set(timeSlot, []);
      }
      intervalData.get(timeSlot)!.push(processedData);
    }
    
    console.log(`📅 Grouped into ${intervalData.size} time intervals`);
    
    // Process each interval and create historical records
    const historicalRecords: ClassificationHistory[] = [];
    
    for (const [timeSlot, data] of intervalData.entries()) {
      // Calculate vehicle type counts
      const vehicleTypes = {
        car: 0,
        suv: 0,
        truck: 0,
        motorcycle: 0,
        van: 0
      };
      
      const laneUtilization = {
        lane11: 0,
        lane12: 0,
        lane31: 0,
        lane32: 0
      };
      
      let totalSpeed = 0;
      let speedViolations = 0;
      const speeds: number[] = [];
      
      for (const entry of data) {
        // Count vehicle types
        if (vehicleTypes.hasOwnProperty(entry.vehicleType)) {
          vehicleTypes[entry.vehicleType as keyof typeof vehicleTypes]++;
        }
        
        // Count lane utilization
        const laneKey = `lane${entry.laneNumber}` as keyof typeof laneUtilization;
        if (laneUtilization.hasOwnProperty(laneKey)) {
          laneUtilization[laneKey]++;
        }
        
        // Calculate speed metrics
        const speed = entry.crossSectionSpeed;
        totalSpeed += speed;
        speeds.push(speed);
        
        if (speed > 60) { // Assuming 60 km/h speed limit
          speedViolations++;
        }
      }
      
      const totalVehicles = data.length;
      const averageSpeed = totalVehicles > 0 ? totalSpeed / totalVehicles : 0;
      
      // Create speed distribution
      const speedDistribution = [
        { min: 0, max: 20, count: speeds.filter(s => s >= 0 && s < 20).length, percentage: 0 },
        { min: 20, max: 40, count: speeds.filter(s => s >= 20 && s < 40).length, percentage: 0 },
        { min: 40, max: 60, count: speeds.filter(s => s >= 40 && s < 60).length, percentage: 0 },
        { min: 60, max: 80, count: speeds.filter(s => s >= 60 && s < 80).length, percentage: 0 },
        { min: 80, max: 100, count: speeds.filter(s => s >= 80 && s < 100).length, percentage: 0 }
      ];
      
      // Calculate percentages
      speedDistribution.forEach(dist => {
        dist.percentage = totalVehicles > 0 ? (dist.count / totalVehicles) * 100 : 0;
      });
      
      const historicalRecord: ClassificationHistory = {
        deviceId: 'test',
        timestamp: new Date(timeSlot.replace(/-/g, '-')),
        timeSlot: timeSlot,
        vehicleTypes,
        laneUtilization,
        speedAnalysis: {
          averageSpeed,
          speedViolations,
          speedDistribution
        },
        totalVehicles,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      historicalRecords.push(historicalRecord);
    }
    
    // Store all historical records in MongoDB
    await historyStorage.connect();
    for (const record of historicalRecords) {
      await historyStorage.storeClassificationData(record);
    }
    
    console.log(`✅ Successfully processed and stored ${historicalRecords.length} historical records`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${realPassData.length} real radar data entries into ${historicalRecords.length} historical records`,
      data: {
        processedEntries: realPassData.length,
        historicalRecords: historicalRecords.length,
        timeIntervals: Array.from(intervalData.keys()),
        sampleRecord: historicalRecords[0]
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing real historical data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process real historical data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
