const { ClassificationProcessor } = require('./src/lib/classification-processor.ts');

async function testClassification() {
  try {
    console.log('🧪 Testing classification processor...');
    
    const processor = ClassificationProcessor.getInstance();
    
    // Generate some test data
    const testData = {
      deviceId: 'test',
      timestamp: new Date().toISOString(),
      laneNumber: 11,
      crossSectionPosition: 25.5,
      crossSectionSpeed: 45.2,
      headwayTime: 2.1,
      passingTime: new Date().toISOString(),
      occupancyDuration: 1.8,
      occupancyStatus: 1,
      vehicleType: 1 // car
    };
    
    console.log('📊 Processing test data...');
    processor.processPassDataForClassification(testData);
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get metrics
    const metrics = processor.getClassificationMetrics('test');
    console.log('📈 Classification metrics:', metrics);
    
    // Test historical data
    const timeFilter = {
      type: '24hrs',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date()
    };
    
    const historicalData = await processor.getHistoricalData('test', timeFilter);
    console.log('📚 Historical data:', historicalData);
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testClassification();
