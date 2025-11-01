import { NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';

const classificationProcessor = ClassificationProcessor.getInstance();

export async function GET() {
  try {
    console.log('🧪 Testing historical classification data functionality...');
    
    // Test getting historical data
    const timeFilter = {
      type: '24hrs' as const,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date()
    };
    
    const historicalData = await classificationProcessor.getHistoricalData('test', timeFilter.startDate, timeFilter.endDate);
    const aggregatedData = await classificationProcessor.getAggregatedHistoricalData('test', timeFilter);
    
    console.log('✅ Historical data test completed');
    console.log(`📊 Historical records found: ${historicalData.length}`);
    console.log(`📈 Aggregated data:`, aggregatedData);
    
    return NextResponse.json({
      success: true,
      message: 'Historical classification data test completed',
      data: {
        historicalRecords: historicalData.length,
        aggregatedData: aggregatedData,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Historical data test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Historical data test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
