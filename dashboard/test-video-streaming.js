/**
 * Test Video Streaming API
 * Tests FFmpeg integration and HLS streaming
 */

// Use native fetch (Node 18+)
const API_BASE = 'http://localhost:3000/api/video';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testVideoStreaming() {
  console.log('🎬 Testing Video Streaming System\n');

  try {
    // Step 1: Check health
    console.log('1️⃣  Checking video service health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const health = await healthResponse.json();
    console.log('Health:', JSON.stringify(health, null, 2));

    if (!health.ffmpegAvailable) {
      console.error('❌ FFmpeg is not available! Please install FFmpeg.');
      console.error('Install: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)');
      return;
    }
    console.log('✅ FFmpeg is available\n');

    // Step 2: Get cameras
    console.log('2️⃣  Fetching configured cameras...');
    const camerasResponse = await fetch(`${API_BASE}/cameras`);
    const camerasData = await camerasResponse.json();

    if (!camerasData.success || camerasData.cameras.length === 0) {
      console.error('❌ No cameras configured!');
      console.log('Add a camera via the dashboard at http://localhost:3000');
      return;
    }

    const camera = camerasData.cameras[0];
    console.log(`Found camera: ${camera.name} (ID: ${camera.id})`);
    console.log(`RTSP URL: ${camera.rtspUrl}\n`);

    // Step 3: Check current streams
    console.log('3️⃣  Checking current streams...');
    const streamsResponse = await fetch(`${API_BASE}/streams`);
    const streamsData = await streamsResponse.json();
    console.log(`Active streams: ${streamsData.count || 0}\n`);

    // Step 4: Start stream
    console.log('4️⃣  Starting video stream...');
    console.log('This will spawn FFmpeg process to convert RTSP to HLS');
    console.log('Please wait...\n');

    const startResponse = await fetch(`${API_BASE}/streams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cameraId: camera.id,
        rtspUrl: camera.rtspUrl,
        username: camera.username,
        password: camera.password
      })
    });

    const startData = await startResponse.json();

    if (!startData.success) {
      console.error('❌ Failed to start stream:', startData.error);
      return;
    }

    console.log('✅ Stream started successfully!');
    console.log(`Stream ID: ${startData.stream.streamId}`);
    console.log(`HLS URL: http://localhost:3000${startData.hlsUrl}\n`);

    // Step 5: Wait for FFmpeg to initialize
    console.log('5️⃣  Waiting for FFmpeg to create HLS segments...');
    await sleep(5000);

    // Step 6: Verify stream is active
    console.log('6️⃣  Verifying stream status...');
    const verifyResponse = await fetch(`${API_BASE}/streams`);
    const verifyData = await verifyResponse.json();

    const activeStream = verifyData.streams.find(s => s.cameraId === camera.id);
    if (activeStream) {
      console.log('✅ Stream is active and running!');
      console.log(`Stream details:`, JSON.stringify(activeStream, null, 2));
    } else {
      console.log('⚠️  Stream not found in active streams list');
    }

    console.log('\n📺 Test your stream:');
    console.log(`1. Open http://localhost:3000 in your browser`);
    console.log(`2. Click the "Video Streaming" tab`);
    console.log(`3. Your camera should show as "Live"`);
    console.log(`4. The video player should display the stream\n`);

    console.log('🛑 To stop the stream, uncomment the cleanup section below\n');

    // Uncomment to stop stream after testing:
    /*
    console.log('7️⃣  Stopping stream...');
    await sleep(5000); // Keep running for 5 more seconds
    const stopResponse = await fetch(`${API_BASE}/streams?cameraId=${camera.id}`, {
      method: 'DELETE'
    });
    const stopData = await stopResponse.json();
    console.log('Stop result:', stopData.message);
    */

    console.log('✅ Video streaming test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run test
testVideoStreaming();
