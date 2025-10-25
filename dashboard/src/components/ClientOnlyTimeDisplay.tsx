'use client';

import { useState, useEffect } from 'react';

interface ClientOnlyTimeDisplayProps {
  className?: string;
  updateInterval?: number;
}

export default function ClientOnlyTimeDisplay({ 
  className = '', 
  updateInterval = 1000 
}: ClientOnlyTimeDisplayProps) {
  const [time, setTime] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Only run on client side
    setIsClient(true);
    
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString());
    };

    // Initial time update
    updateTime();

    // Set up interval for time updates
    const interval = setInterval(updateTime, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  // Show nothing during SSR to prevent hydration mismatch
  if (!isClient) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <span className="animate-pulse">--:--:--</span>
      </div>
    );
  }

  return (
    <div className={`text-sm text-gray-500 ${className}`}>
      <span suppressHydrationWarning>
        {time}
      </span>
    </div>
  );
}
