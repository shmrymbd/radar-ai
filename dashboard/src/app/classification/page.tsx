import { NextResponse } from 'next/server';

async function getClassificationData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const [metricsResponse, summaryResponse] = await Promise.all([
      fetch(`${baseUrl}/api/classification/metrics`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/classification/summary`, { cache: 'no-store' })
    ]);

    if (metricsResponse.ok && summaryResponse.ok) {
      const metricsData = await metricsResponse.json();
      const summaryData = await summaryResponse.json();
      return { metrics: metricsData.data, summary: summaryData.data };
    }
    return null;
  } catch (error) {
    console.error('Error fetching classification data:', error);
    return null;
  }
}

export default async function ClassificationPage() {
  const data = await getClassificationData();

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading data</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Vehicle Classification Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Total Vehicles</h2>
            <p className="text-3xl font-bold text-blue-600">{data.metrics.totalVehicles}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Average Speed</h2>
            <p className="text-3xl font-bold text-green-600">{data.summary.averageSpeed.toFixed(1)} km/h</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle Types</h2>
            <p className="text-3xl font-bold text-purple-600">{data.summary.uniqueVehicleTypes}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 col-span-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle Type Distribution</h2>
            <div className="space-y-2">
              {data.metrics.vehicleTypes.map((vehicle: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium capitalize">{vehicle.vehicleType}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{vehicle.count} vehicles</span>
                    <span className="text-sm font-bold text-blue-600">{vehicle.percentage.toFixed(1)}%</span>
                    <span className="text-sm text-gray-500">{vehicle.averageSpeed.toFixed(1)} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 col-span-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Lane Utilization</h2>
            <div className="space-y-2">
              {data.metrics.laneUtilization.map((lane: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">Lane {lane.laneNumber}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{lane.totalVehicles} vehicles</span>
                    <span className="text-sm font-bold text-green-600">{(lane.utilizationRate * 100).toFixed(1)}%</span>
                    <span className="text-sm text-gray-500">{lane.averageSpeed.toFixed(1)} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}