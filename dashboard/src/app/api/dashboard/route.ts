import { NextRequest, NextResponse } from 'next/server';
import { RedisStorage } from '@/lib/redis-storage';

export async function GET(request: NextRequest) {
  try {
    const redisStorage = RedisStorage.getInstance();
    const dashboardSummary = await redisStorage.getDashboardSummary();
    
    return NextResponse.json({
      success: true,
      data: dashboardSummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
