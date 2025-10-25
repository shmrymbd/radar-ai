'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching test data...');
        const response = await fetch('/api/classification/metrics');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Data received:', result);
          setData(result);
        } else {
          setError('Failed to fetch data');
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Test Page</h1>
      <p>Total Vehicles: {data?.data?.totalVehicles || 'No data'}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
