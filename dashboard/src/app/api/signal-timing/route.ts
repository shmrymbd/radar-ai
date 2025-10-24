import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lane, newTiming, userId, reason } = body;

    if (!lane || !newTiming) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: lane and newTiming' 
        },
        { status: 400 }
      );
    }

    // Log signal timing change to MongoDB
    const db = await connectToDatabase();
    
    const logEntry = {
      timestamp: new Date(),
      user_id: userId || 'unknown',
      action: 'signal_timing_change',
      lane: lane,
      old_timing: null, // Would need to fetch current timing
      new_timing: newTiming,
      reason: reason || 'Manual adjustment',
      status: 'completed'
    };

    await db.collection('signal_timing_logs').insertOne(logEntry);

    return NextResponse.json({
      success: true,
      message: 'Signal timing change logged successfully',
      data: logEntry,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging signal timing change:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to log signal timing change' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const lane = searchParams.get('lane');

    const db = await connectToDatabase();
    
    let query: any = {};
    if (lane) {
      query.lane = lane;
    }

    const logs = await db.collection('signal_timing_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching signal timing logs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch signal timing logs' 
      },
      { status: 500 }
    );
  }
}
