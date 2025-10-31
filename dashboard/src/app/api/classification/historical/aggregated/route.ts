import { NextRequest, NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';
import { TimePeriodFilter } from '@/types/classification-history';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';
    const timePeriod = searchParams.get('timePeriod') || '24hrs';
    
    // Create time filter based on period
    const timeFilter = createTimeFilter(timePeriod);
    
    // Get aggregated historical data
    const aggregatedData = await classificationProcessor.getAggregatedHistoricalData(deviceId, timeFilter);
    
    return NextResponse.json({
      success: true,
      data: aggregatedData,
      deviceId,
      timePeriod,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching aggregated historical data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch aggregated data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function createTimeFilter(timePeriod: string): TimePeriodFilter {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;
  
  switch (timePeriod) {
    case '24hrs':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      startDate = yesterday;
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return {
    type: timePeriod as '24hrs' | 'yesterday' | 'month',
    startDate,
    endDate
  };
}
