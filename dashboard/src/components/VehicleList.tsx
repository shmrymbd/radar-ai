'use client';

import { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  timestamp: string;
  vehicleType: string;
  laneNumber: number;
  speed: number;
  position: number;
  headwayTime: number;
  occupancyDuration: number;
  occupancyStatus: string;
  processedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface VehicleListProps {
  deviceId: string;
}

export default function VehicleList({ deviceId }: VehicleListProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchVehicles();
  }, [deviceId, page, limit]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/classification/vehicles?deviceId=${deviceId}&page=${page}&limit=${limit}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const result = await response.json();
        setVehicles(result.data.vehicles);
        setPagination(result.data.pagination);
      } else {
        setError('Failed to fetch vehicles');
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = () => {
    if (pagination?.hasPrevPage) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      setPage(page + 1);
    }
  };

  const handlePageSelect = (pageNum: number) => {
    setPage(pageNum);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // All 15 vehicle types from ClairWav Protocol V2.1 (codes 0-14)
  // Colors match the protocol vehicle classification system
  const getVehicleTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      other: 'bg-gray-100 text-gray-800',
      bicycle: 'bg-green-50 text-green-700',
      motorcycle: 'bg-green-100 text-green-800',
      tricycle: 'bg-lime-100 text-lime-800',
      bus: 'bg-orange-100 text-orange-800',
      van: 'bg-purple-100 text-purple-800',
      car: 'bg-blue-100 text-blue-800',
      suv: 'bg-cyan-100 text-cyan-800',
      large_truck: 'bg-red-100 text-red-800',
      medium_truck: 'bg-orange-200 text-orange-900',
      light_truck: 'bg-orange-50 text-orange-700',
      dangerous_goods: 'bg-red-200 text-red-900',
      engineering_vehicle: 'bg-yellow-100 text-yellow-800',
      pedestrian: 'bg-purple-200 text-purple-900',
      medium_bus: 'bg-amber-100 text-amber-800'
    };
    return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-blue-600 text-xl mb-4">Loading vehicles...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={fetchVehicles}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!pagination) return [];
    const { totalPages, page: currentPage } = pagination;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Header with pagination info */}
      <div className="flex justify-between items-center">
        <div className="text-gray-700">
          Showing {pagination ? ((pagination.page - 1) * pagination.limit + 1) : 0} to{' '}
          {pagination ? Math.min(pagination.page * pagination.limit, pagination.totalCount) : 0} of{' '}
          {pagination?.totalCount || 0} vehicles
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Vehicles per page:</label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* Vehicle table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lane
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Speed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Headway
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occupancy
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTimestamp(vehicle.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getVehicleTypeColor(vehicle.vehicleType)}`}>
                    {vehicle.vehicleType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vehicle.laneNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vehicle.speed.toFixed(1)} km/h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vehicle.position.toFixed(0)} cm
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vehicle.headwayTime.toFixed(2)} s
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vehicle.occupancyDuration} ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={!pagination.hasPrevPage}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>

          {getPageNumbers().map((pageNum, index) => (
            pageNum === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
            ) : (
              <button
                key={pageNum}
                onClick={() => handlePageSelect(pageNum as number)}
                className={`px-3 py-1 border rounded text-sm ${
                  pageNum === pagination.page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            )
          ))}

          <button
            onClick={handleNextPage}
            disabled={!pagination.hasNextPage}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
