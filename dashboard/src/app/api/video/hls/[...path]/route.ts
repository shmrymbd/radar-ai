import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = join(process.cwd(), 'hls-output', ...pathSegments);
    
    // Security check - ensure the path is within hls-output directory
    const hlsOutputDir = join(process.cwd(), 'hls-output');
    if (!filePath.startsWith(hlsOutputDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const fileContent = await readFile(filePath);
    
    // Set appropriate content type based on file extension
    const contentType = filePath.endsWith('.m3u8') 
      ? 'application/vnd.apple.mpegurl'
      : filePath.endsWith('.ts')
      ? 'video/mp2t'
      : 'application/octet-stream';

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error serving HLS file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
}
