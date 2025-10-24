'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VehiclePosition, VehicleState, VehicleRenderOptions, VEHICLE_COLORS, CANVAS_CONFIG, DETECTION_ZONE, LANE_BOUNDARIES } from '@/types/tracking';

interface LiveTrackingProps {
  className?: string;
}

export default function LiveTracking({ className = '' }: LiveTrackingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vehicles, setVehicles] = useState<VehicleState[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleState | null>(null);
  const [renderOptions, setRenderOptions] = useState<VehicleRenderOptions>({
    showTrails: true,
    showSpeedVectors: true,
    showVehicleDetails: false,
    zoomLevel: 1,
    panX: 0,
    panY: 0
  });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Coordinate transformation functions
  const radarToVisual = useCallback((radarX: number, radarY: number) => {
    const scale = CANVAS_CONFIG.scale;
    const canvasHeight = CANVAS_CONFIG.height;
    
    return {
      x: (radarX + 15) * scale,
      y: canvasHeight - (radarY * scale)
    };
  }, []);

  const calculateVehicleSize = useCallback((vehicle: VehiclePosition) => {
    const baseWidth = Math.max(vehicle.width * CANVAS_CONFIG.scale, CANVAS_CONFIG.vehicleMinSize);
    const baseHeight = Math.max(vehicle.length * CANVAS_CONFIG.scale, CANVAS_CONFIG.vehicleMinSize);
    
    return {
      width: Math.min(baseWidth, CANVAS_CONFIG.vehicleMaxSize),
      height: Math.min(baseHeight, CANVAS_CONFIG.vehicleMaxSize)
    };
  }, []);

  const getSpeedIntensity = useCallback((speed: number): number => {
    if (speed < 20) return 0.6;
    if (speed < 50) return 0.8;
    return 1.0;
  }, []);

  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }, []);

  // Drawing functions
  const drawDetectionZone = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    const visualZone = radarToVisual(DETECTION_ZONE.minX, DETECTION_ZONE.minY);
    const visualZoneEnd = radarToVisual(DETECTION_ZONE.maxX, DETECTION_ZONE.maxY);
    
    ctx.strokeRect(
      visualZone.x,
      visualZone.y,
      visualZoneEnd.x - visualZone.x,
      visualZoneEnd.y - visualZone.y
    );
    
    ctx.setLineDash([]);
  }, [radarToVisual]);

  const drawLaneBoundaries = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1;
    
    LANE_BOUNDARIES.forEach(lane => {
      const start = radarToVisual(lane.startX, lane.startY);
      const end = radarToVisual(lane.endX, lane.endY);
      
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      
      // Draw lane label
      ctx.fillStyle = '#6B7280';
      ctx.font = '12px system-ui';
      ctx.fillText(`Lane ${lane.laneNumber}`, start.x + 5, start.y + 15);
    });
  }, [radarToVisual]);

  const drawVehicleTrail = useCallback((ctx: CanvasRenderingContext2D, trajectory: VehiclePosition[]) => {
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    
    ctx.beginPath();
    trajectory.forEach((pos, index) => {
      const visualPos = radarToVisual(pos.x, pos.y);
      if (index === 0) {
        ctx.moveTo(visualPos.x, visualPos.y);
      } else {
        ctx.lineTo(visualPos.x, visualPos.y);
      }
    });
    ctx.stroke();
    
    ctx.globalAlpha = 1;
  }, [radarToVisual]);

  const drawVehicle = useCallback((ctx: CanvasRenderingContext2D, vehicle: VehicleState, pos: { x: number; y: number }, size: { width: number; height: number }) => {
    const color = VEHICLE_COLORS[vehicle.position.vehicleType as keyof typeof VEHICLE_COLORS] || VEHICLE_COLORS.unknown;
    const speedIntensity = getSpeedIntensity(vehicle.position.speed);
    
    // Apply speed-based color intensity
    const rgb = hexToRgb(color);
    if (rgb) {
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${speedIntensity})`;
    } else {
      ctx.fillStyle = color;
    }
    
    // Draw vehicle rectangle
    ctx.fillRect(pos.x - size.width / 2, pos.y - size.height / 2, size.width, size.height);
    
    // Draw vehicle border
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - size.width / 2, pos.y - size.height / 2, size.width, size.height);
    
    // Draw vehicle ID
    ctx.fillStyle = '#1F2937';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(vehicle.targetId.slice(-4), pos.x, pos.y - size.height / 2 - 5);
  }, [getSpeedIntensity, hexToRgb]);

  const drawSpeedVector = useCallback((ctx: CanvasRenderingContext2D, vehicle: VehicleState, pos: { x: number; y: number }) => {
    if (vehicle.position.speed < 1) return; // Don't draw vectors for stationary vehicles
    
    const speed = vehicle.position.speed;
    const angle = Math.atan2(vehicle.position.ySpeed, vehicle.position.xSpeed);
    const length = Math.min(speed / 5, 20); // Scale vector length
    
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(
      pos.x + Math.cos(angle) * length,
      pos.y + Math.sin(angle) * length
    );
    ctx.stroke();
    
    // Draw arrowhead
    const arrowSize = 4;
    ctx.beginPath();
    ctx.moveTo(
      pos.x + Math.cos(angle) * length,
      pos.y + Math.sin(angle) * length
    );
    ctx.lineTo(
      pos.x + Math.cos(angle) * length - Math.cos(angle - Math.PI / 6) * arrowSize,
      pos.y + Math.sin(angle) * length - Math.sin(angle - Math.PI / 6) * arrowSize
    );
    ctx.moveTo(
      pos.x + Math.cos(angle) * length,
      pos.y + Math.sin(angle) * length
    );
    ctx.lineTo(
      pos.x + Math.cos(angle) * length - Math.cos(angle + Math.PI / 6) * arrowSize,
      pos.y + Math.sin(angle) * length - Math.sin(angle + Math.PI / 6) * arrowSize
    );
    ctx.stroke();
  }, []);

  const drawVehicles = useCallback((ctx: CanvasRenderingContext2D) => {
    vehicles.forEach(vehicle => {
      if (!vehicle.isVisible) return;
      
      const pos = radarToVisual(vehicle.position.x, vehicle.position.y);
      const size = calculateVehicleSize(vehicle.position);
      
      // Draw vehicle trail
      if (renderOptions.showTrails && vehicle.trajectory.length > 1) {
        drawVehicleTrail(ctx, vehicle.trajectory);
      }
      
      // Draw vehicle
      drawVehicle(ctx, vehicle, pos, size);
      
      // Draw speed vector
      if (renderOptions.showSpeedVectors) {
        drawSpeedVector(ctx, vehicle, pos);
      }
    });
  }, [vehicles, renderOptions, radarToVisual, calculateVehicleSize, drawVehicleTrail, drawVehicle, drawSpeedVector]);

  useEffect(() => {
    // Connect to tracking WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8081`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('🔌 Connected to Tracking WebSocket');
      setConnectionStatus('connected');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'tracking_update') {
          // Update vehicles from tracking data
          setVehicles(prevVehicles => {
            const vehicleMap = new Map(prevVehicles.map(v => [v.targetId, v]));
            
            data.data.vehicles.forEach((vehicle: VehiclePosition) => {
              const existingVehicle = vehicleMap.get(vehicle.targetId);
              if (existingVehicle) {
                existingVehicle.previousPosition = existingVehicle.position;
                existingVehicle.position = vehicle;
                existingVehicle.trajectory.push(vehicle);
                if (existingVehicle.trajectory.length > CANVAS_CONFIG.maxTrailLength) {
                  existingVehicle.trajectory.shift();
                }
              } else {
                vehicleMap.set(vehicle.targetId, {
                  targetId: vehicle.targetId,
                  position: vehicle,
                  trajectory: [vehicle],
                  isVisible: true,
                  lastSeen: vehicle.timestamp,
                  enterTime: vehicle.timestamp
                });
              }
            });
            
            return Array.from(vehicleMap.values());
          });
        } else if (data.type === 'tracking_summary') {
          // Update tracking summary
          console.log('Tracking summary:', data.data);
        }
      } catch (error) {
        console.error('Error parsing tracking WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('🔌 Tracking WebSocket disconnected');
      setConnectionStatus('disconnected');
    };

    websocket.onerror = (error) => {
      console.error('Tracking WebSocket error:', error);
      setConnectionStatus('disconnected');
    };

    return () => {
      websocket.close();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = CANVAS_CONFIG.width;
    canvas.height = CANVAS_CONFIG.height;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw detection zone
      drawDetectionZone(ctx);
      
      // Draw lane boundaries
      drawLaneBoundaries(ctx);
      
      // Draw vehicles
      drawVehicles(ctx);
      
      requestAnimationFrame(animate);
    };

    animate();
  }, [vehicles, renderOptions, drawDetectionZone, drawLaneBoundaries, drawVehicles]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked vehicle
    const clickedVehicle = vehicles.find(vehicle => {
      if (!vehicle.isVisible) return false;
      
      const pos = radarToVisual(vehicle.position.x, vehicle.position.y);
      const size = calculateVehicleSize(vehicle.position);
      
      return x >= pos.x - size.width / 2 &&
             x <= pos.x + size.width / 2 &&
             y >= pos.y - size.height / 2 &&
             y <= pos.y + size.height / 2;
    });

    setSelectedVehicle(clickedVehicle || null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Live Vehicle Tracking</h2>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              connectionStatus === 'connected' ? 'text-green-500' : 
              connectionStatus === 'connecting' ? 'text-yellow-500' : 'text-red-500'
            }`}>
              <div className="w-2 h-2 bg-current rounded-full"></div>
              <span className="text-sm font-medium">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {vehicles.filter(v => v.isVisible).length} vehicles
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={renderOptions.showTrails}
              onChange={(e) => setRenderOptions(prev => ({ ...prev, showTrails: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show Trails</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={renderOptions.showSpeedVectors}
              onChange={(e) => setRenderOptions(prev => ({ ...prev, showSpeedVectors: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show Speed Vectors</span>
          </label>
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair"
          style={{ height: '600px' }}
        />
      </div>

      {/* Vehicle Details */}
      {selectedVehicle && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Vehicle ID</label>
              <p className="text-sm text-gray-900">{selectedVehicle.targetId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="text-sm text-gray-900 capitalize">{selectedVehicle.position.vehicleType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Speed</label>
              <p className="text-sm text-gray-900">{selectedVehicle.position.speed.toFixed(1)} km/h</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Lane</label>
              <p className="text-sm text-gray-900">{selectedVehicle.position.laneNo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Position</label>
              <p className="text-sm text-gray-900">
                ({selectedVehicle.position.x.toFixed(1)}m, {selectedVehicle.position.y.toFixed(1)}m)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Size</label>
              <p className="text-sm text-gray-900">
                {selectedVehicle.position.length.toFixed(1)}m × {selectedVehicle.position.width.toFixed(1)}m
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Seen</label>
              <p className="text-sm text-gray-900">
                {new Date(selectedVehicle.lastSeen).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Time in Zone</label>
              <p className="text-sm text-gray-900">
                {Math.round((new Date().getTime() - selectedVehicle.enterTime.getTime()) / 1000)}s
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}