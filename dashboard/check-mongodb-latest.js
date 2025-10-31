const { MongoClient } = require('mongodb');

async function checkLatest() {
  const client = new MongoClient('mongodb://admin:admin123@192.168.6.22:27017/?authSource=admin');

  try {
    await client.connect();
    const db = client.db('traffic_signal_dashboard');
    const collection = db.collection('passdata');

    // Get latest 5 entries
    const latest = await collection.find({ deviceId: 'test' })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    console.log('\n📊 Latest 5 vehicles in MongoDB:\n');
    latest.forEach((v, i) => {
      const ts = new Date(v.timestamp);
      const malaysiaTime = new Date(ts.getTime() + (8 * 60 * 60 * 1000));
      const timeStr = malaysiaTime.toISOString().replace('T', ' ').substring(0, 19);
      console.log(`${i+1}. ${timeStr} Malaysia Time - ${v.vehicleType} Lane ${v.laneNumber} - Source: ${v.source || 'old'}`);
    });

    // Check current time
    const now = new Date();
    const nowMalaysia = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const nowStr = nowMalaysia.toISOString().replace('T', ' ').substring(0, 19);
    console.log(`\n⏰ Current time: ${nowStr} Malaysia Time`);

    // Calculate age of latest data
    if (latest.length > 0) {
      const latestTime = new Date(latest[0].timestamp);
      const ageMinutes = Math.floor((now - latestTime) / 1000 / 60);
      const ageHours = Math.floor(ageMinutes / 60);
      console.log(`\n⏳ Latest data is ${ageHours} hours ${ageMinutes % 60} minutes old`);

      if (ageHours < 1) {
        console.log('✅ Data is RECENT - system is receiving updates!');
      } else if (ageHours < 6) {
        console.log('⚠️  Data is somewhat old - may be low traffic period');
      } else {
        console.log('❌ Data is OLD - radar may be offline or no traffic');
      }
    }

  } finally {
    await client.close();
  }
}

checkLatest().catch(console.error);
