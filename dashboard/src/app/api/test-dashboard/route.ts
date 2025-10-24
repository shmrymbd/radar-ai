import { NextResponse } from 'next/server';
import { RedisStorage } from '@/lib/redis-storage';

export async function GET() {
  try {
    console.log('🧪 Testing dashboard data retrieval...');
    
    const redisStorage = RedisStorage.getInstance();
    const dashboardData = await redisStorage.getDashboardSummary();
    
    console.log('✅ Dashboard data retrieved successfully');
    console.log('📊 Summary:', JSON.stringify(dashboardData.summary, null, 2));
    
    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Dashboard test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
