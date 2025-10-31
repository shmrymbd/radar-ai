import { NextRequest, NextResponse } from 'next/server';
import { PassDataMongoDBService } from '@/lib/passdata-mongodb-service';
import { withApiProtection } from '@/lib/middleware';
import '@/lib/server-init'; // Initialize subscriber in Next.js process

const mongoService = PassDataMongoDBService.getInstance();

export async function GET(request: NextRequest) {
  // Apply authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';

    const metrics = await mongoService.getClassificationMetrics(deviceId);

    return NextResponse.json({
      success: true,
      data: metrics,
      deviceId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching classification metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch classification metrics',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
