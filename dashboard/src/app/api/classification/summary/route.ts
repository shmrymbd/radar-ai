import { NextRequest, NextResponse } from 'next/server';
import { PassDataMongoDBService } from '@/lib/passdata-mongodb-service';
import { withApiProtection } from '@/lib/middleware';

const mongoService = PassDataMongoDBService.getInstance();

export async function GET(request: NextRequest) {
  // Apply authentication and rate limiting
  const protection = await withApiProtection(request);
  if (!protection.ok) return protection.response;

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';

    const summary = await mongoService.getClassificationSummary(deviceId);

    return NextResponse.json({
      success: true,
      data: summary,
      deviceId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching classification summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch classification summary',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
