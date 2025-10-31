const http = require('http');

/**
 * Debug script to trace all data sources used by Classification Dashboard
 */
async function debugClassificationSources() {
  console.log('🔍 Classification Dashboard Data Source Debug\n');
  console.log('='.repeat(70));
  console.log('\n');

  // 1. Check Classification API (in-memory ClassificationProcessor)
  console.log('1️⃣ Classification API (/api/classification)');
  console.log('   Uses: ClassificationProcessor (in-memory)');
  console.log('   Data fed by:');
  console.log('     - Redis Poller (classification-redis-poller.ts)');
  console.log('     - Redis Pub/Sub (redis-pubsub-service.ts)');
  console.log('');

  const classificationData = await makeRequest('/api/classification?deviceId=test');
  if (classificationData.success) {
    console.log('   ✅ API Response:');
    console.log('      Total vehicles:', classificationData.data.summary.totalVehicles);
    console.log('      Peak hour:', classificationData.data.summary.peakHour?.hour || 'N/A');
    console.log('      Busiest lane:', classificationData.data.summary.busiestLane?.lane || 'N/A');
  } else {
    console.log('   ❌ API Error:', classificationData.error);
  }
  console.log('');

  // 2. Check Vehicle List API (MongoDB)
  console.log('2️⃣ Vehicle List API (/api/classification/vehicles)');
  console.log('   Uses: MongoDB passdata collection');
  console.log('');

  const vehiclesData = await makeRequest('/api/classification/vehicles?deviceId=test&limit=5');
  if (vehiclesData.success) {
    console.log('   ✅ API Response:');
    console.log('      Total vehicles:', vehiclesData.data.pagination.totalCount);
    console.log('      Latest 3 vehicles:');
    vehiclesData.data.vehicles.slice(0, 3).forEach((v, i) => {
      console.log(`        ${i+1}. ${v.timestamp} - ${v.vehicleType} Lane ${v.laneNumber}`);
    });
  } else {
    console.log('   ❌ API Error:', vehiclesData.error);
  }
  console.log('');

  // 3. Check Redis Poller Status
  console.log('3️⃣ Redis Poller Status');
  console.log('   Polls: Redis deviceId/PassData (capital P) ✅');
  console.log('   Feeds: ClassificationProcessor (in-memory)');
  console.log('');

  const pollerStatus = await makeRequest('/api/classification/poller');
  if (pollerStatus.success) {
    console.log('   ✅ Poller Status:');
    console.log('      Running:', pollerStatus.data.isRunning);
    console.log('      Interval:', pollerStatus.data.pollIntervalMs, 'ms');
    console.log('      Devices:', pollerStatus.data.deviceIds.join(', '));
    console.log('      Last processed:', pollerStatus.data.lastProcessedTimestamp);
  } else {
    console.log('   ❌ Poller Error:', pollerStatus.error);
  }
  console.log('');

  // 4. Summary
  console.log('='.repeat(70));
  console.log('📊 SUMMARY:');
  console.log('');
  console.log('Classification Dashboard has TWO data sources:');
  console.log('');
  console.log('A. Real-time Analytics (Overview tab):');
  console.log('   - Source: ClassificationProcessor (in-memory)');
  console.log('   - Fed by: Redis Poller + Redis Pub/Sub');
  console.log('   - Redis key: deviceId/PassData (capital P) ✅ FIXED');
  console.log('   - Total vehicles: ' + (classificationData.data?.summary?.totalVehicles || 0));
  console.log('');
  console.log('B. Vehicle List (Vehicle List tab):');
  console.log('   - Source: MongoDB passdata collection');
  console.log('   - Populated by: PassData Subscriber');
  console.log('   - Total vehicles: ' + (vehiclesData.data?.pagination?.totalCount || 0));
  console.log('');

  if (classificationData.data?.summary?.totalVehicles === 0 &&
      vehiclesData.data?.pagination?.totalCount > 0) {
    console.log('⚠️  WARNING: In-memory data is empty but MongoDB has data!');
    console.log('    Possible causes:');
    console.log('    1. Redis Poller needs to process data');
    console.log('    2. WebSocket server restarted recently (in-memory data cleared)');
    console.log('    3. Redis PassData key has expired entries');
    console.log('');
    console.log('💡 Solution: Trigger Redis Poller to reload data from Redis');
    console.log('    POST /api/classification/poller with action: start');
  } else if (classificationData.data?.summary?.totalVehicles > 0) {
    console.log('✅ Both data sources are populated correctly!');
  }

  console.log('');
  console.log('='.repeat(70));
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Run debug
debugClassificationSources().catch((error) => {
  console.error('\n❌ Debug Error:', error.message);
  process.exit(1);
});
