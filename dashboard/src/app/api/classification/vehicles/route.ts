import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * GET /api/classification/vehicles - Get paginated list of individual vehicles
 * Query params:
 * - deviceId: string (default: 'P1-center')
 * - page: number (default: 1)
 * - limit: number (default: 50, no max limit)
 * - sortBy: string (default: 'timestamp')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // No max limit
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const db = await connectToDatabase();
    const collection = db.collection('passdata');

    // Get total count
    const totalCount = await collection.countDocuments({ deviceId });

    // Get paginated vehicles
    const vehicles = await collection
      .find({ deviceId })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        vehicles: vehicles.map(v => ({
          id: v._id.toString(),
          timestamp: v.timestamp,
          vehicleType: v.vehicleType,
          laneNumber: v.laneNumber,
          speed: v.crossSectionSpeed,
          position: v.crossSectionPosition,
          headwayTime: v.headwayTime,
          occupancyDuration: v.occupancyDuration,
          occupancyStatus: v.occupancyStatus,
          processedAt: v.processedAt
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching paginated vehicles:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch vehicles',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
