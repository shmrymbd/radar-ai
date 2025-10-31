const http = require('http');

/**
 * Trigger the Classification Processor to load data from Redis PassData
 */
async function loadRedisToClassification() {
  console.log('🔄 Loading Redis PassData into ClassificationProcessor...\n');

  // Call the process-real-data API endpoint
  const result = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({ deviceId: 'test' });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/classification/process-real-data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });

  if (result.success) {
    console.log('✅ Successfully loaded data!');
    console.log('   Vehicles processed:', result.data.processedCount);
    console.log('   Source:', result.data.source);
    console.log('');

    // Now check the classification API to see if data is there
    console.log('🔍 Verifying ClassificationProcessor data...');

    const classificationData = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/classification?deviceId=test',
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });

    if (classificationData.success) {
      console.log('✅ ClassificationProcessor now has:');
      console.log('   Total vehicles:', classificationData.data.summary.totalVehicles);
      console.log('   Peak hour:', classificationData.data.summary.peakHour?.hour || 'N/A');
      console.log('   Busiest lane:', classificationData.data.summary.busiestLane?.lane || 'N/A');
      console.log('');
      console.log('🎉 Classification Dashboard should now show real-time analytics!');
    }
  } else {
    console.log('❌ Failed to load data:', result.error);
  }
}

// Run the loader
loadRedisToClassification().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
