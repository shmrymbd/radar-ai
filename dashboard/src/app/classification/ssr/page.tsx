import { NextResponse } from 'next/server';

export default async function SSRClassificationPage() {
  // Fetch data server-side
  const metricsResponse = await fetch('http://localhost:3000/api/classification/metrics', {
    cache: 'no-store'
  });
  const summaryResponse = await fetch('http://localhost:3000/api/classification/summary', {
    cache: 'no-store'
  });

  const metricsData = metricsResponse.ok ? await metricsResponse.json() : null;
  const summaryData = summaryResponse.ok ? await summaryResponse.json() : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Vehicle Classification Dashboard</h1>
        
        {metricsData && summaryData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Total Vehicles</h2>
              <p className="text-3xl font-bold text-blue-600">{metricsData.data.totalVehicles}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Average Speed</h2>
              <p className="text-3xl font-bold text-green-600">{summaryData.data.averageSpeed.toFixed(1)} km/h</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle Types</h2>
              <p className="text-3xl font-bold text-purple-600">{summaryData.data.uniqueVehicleTypes}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 col-span-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle Type Distribution</h2>
              <div className="space-y-2">
                {metricsData.data.vehicleTypes.map((vehicle: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="font-medium capitalize">{vehicle.vehicleType}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{vehicle.count} vehicles</span>
                      <span className="text-sm font-bold text-blue-600">{vehicle.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
