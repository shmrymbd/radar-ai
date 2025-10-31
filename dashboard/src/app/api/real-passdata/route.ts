import { NextRequest, NextResponse } from 'next/server';
import { RedisStorage } from '@/lib/redis-storage';
import { withApiProtection } from '@/lib/middleware';

const redisStorage = RedisStorage.getInstance();

export async function GET(request: NextRequest) {
  // Authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    console.log('📡 Fetching real pass data from Redis...');
    
    // Get real pass data from Redis
    const realPassData = await redisStorage.getLatestPassData(20); // Get last 20 entries
    
    if (realPassData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No real pass data available in Redis',
        message: 'Please ensure radar data is being streamed to Redis'
      }, { status: 404 });
    }
    
    console.log(`📊 Found ${realPassData.length} real pass data entries`);
    
    // Process the data for classification
    const processedData = realPassData.map(data => {
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
      
      return {
        ...data,
        vehicleType: vehicleType,
        deviceId: 'test' // Use test device ID for classification
      };
    });
    
    return NextResponse.json({
      success: true,
      message: `Found ${realPassData.length} real pass data entries`,
      data: {
        count: realPassData.length,
        entries: processedData,
        sample: processedData.slice(0, 3) // Show first 3 as sample
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching real pass data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch real pass data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
