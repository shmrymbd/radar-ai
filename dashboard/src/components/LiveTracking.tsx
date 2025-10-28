'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { VehiclePosition, VehicleState, VehicleRenderOptions, TrailConfig, VEHICLE_COLORS, SPEED_COLORS, CANVAS_CONFIG, DEFAULT_TRAIL_CONFIG, DETECTION_ZONE } from '@/types/tracking';
import RadarAnalysisCard from '@/components/RadarAnalysisCard';

interface LiveTrackingProps {
  className?: string;
  hideRadarCard?: boolean;
}

export default function LiveTracking({ className = '', hideRadarCard = false }: LiveTrackingProps) {
  const { selectedDevice } = useDevice();
  const { ws, connectionStatus, subscribeToChannel } = useUnifiedWebSocket();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vehicles, setVehicles] = useState<VehicleState[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleState | null>(null);
  const [renderOptions, setRenderOptions] = useState<VehicleRenderOptions>({
    showTrails: true,
    showSpeedVectors: true,
    showVehicleDetails: false,
    zoomLevel: 1,
    panX: 0,
    panY: 0,
    trailConfig: DEFAULT_TRAIL_CONFIG
  });
  const [selectedScenario, setSelectedScenario] = useState<number>(0);
  const [showCoordinateSystem, setShowCoordinateSystem] = useState(true);
  const [trailConfigExpanded, setTrailConfigExpanded] = useState(false);

  // Heat map state for trail-based road visualization
  const [globalTrailHistory, setGlobalTrailHistory] = useState<Map<string, number>>(new Map());
  const heatMapCanvasRef = useRef<HTMLCanvasElement>(null);
  const [heatMapInitialized, setHeatMapInitialized] = useState(false);

  // Helper function to convert radar coordinates to grid cells
  const getGridKey = useCallback((x: number, y: number, gridSize: number = 2): string => {
    const gridX = Math.floor(x / gridSize) * gridSize;
    const gridY = Math.floor(y / gridSize) * gridSize;
    return `${gridX}_${gridY}`;
  }, []);

  // Coordinate transformation functions
  const radarToVisual = useCallback((radarX: number, radarY: number) => {
    const baseScale = CANVAS_CONFIG.scale;
    const canvasWidth = CANVAS_CONFIG.width;
    const canvasHeight = CANVAS_CONFIG.height;
    
    // Apply zoom and pan transformations
    const scale = baseScale * renderOptions.zoomLevel;
    const centerX = (canvasWidth / 2) + renderOptions.panX;
    const centerY = (canvasHeight / 2) + renderOptions.panY;
    
    // Transform coordinates with road centered, zoom, and pan applied
    return {
      x: centerX + (radarX * scale),
      y: centerY - (radarY * scale) // Invert Y so positive Y goes up
    };
  }, [renderOptions.zoomLevel, renderOptions.panX, renderOptions.panY]);

  const calculateVehicleSize = useCallback((vehicle: VehiclePosition) => {
    const scale = CANVAS_CONFIG.scale * renderOptions.zoomLevel;
    const baseWidth = Math.max(vehicle.width * scale, CANVAS_CONFIG.vehicleMinSize);
    const baseHeight = Math.max(vehicle.length * scale, CANVAS_CONFIG.vehicleMinSize);
    
    return {
      width: Math.min(baseWidth, CANVAS_CONFIG.vehicleMaxSize),
      height: Math.min(baseHeight, CANVAS_CONFIG.vehicleMaxSize)
    };
  }, [renderOptions.zoomLevel]);

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

  // Generate consistent color for vehicle ID
  const getVehicleColor = useCallback((targetId: string): string => {
    // Predefined vibrant color palette for better visibility
    const colorPalette = [
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#10B981', // Green
      '#F59E0B', // Orange
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#EC4899', // Pink
      '#F97316', // Orange-red
      '#14B8A6', // Teal
      '#A855F7', // Violet
      '#84CC16', // Lime
      '#F43F5E', // Rose
      '#22D3EE', // Sky
      '#FBBF24', // Amber
      '#6366F1', // Indigo
      '#FB923C', // Orange-light
      '#4ADE80', // Green-light
      '#C026D3', // Fuchsia
      '#2DD4BF', // Teal-light
      '#FACC15', // Yellow
    ];

    // Generate hash from targetId for consistent color assignment
    let hash = 0;
    for (let i = 0; i < targetId.length; i++) {
      hash = targetId.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Use hash to select color from palette
    const colorIndex = Math.abs(hash) % colorPalette.length;
    return colorPalette[colorIndex];
  }, []);

  // Get current scenario lanes
  const getCurrentScenarioLanes = useCallback(() => {
    // This will be handled by RadarAnalysisCard component
    return [
      { laneNumber: 1, startX: -15, endX: -5, description: 'Left Lane', width: 10 },
      { laneNumber: 2, startX: -5, endX: 5, description: 'Center Lane', width: 10 },
      { laneNumber: 3, startX: 5, endX: 15, description: 'Right Lane', width: 10 }
    ];
  }, []);

  // Drawing functions
  const drawRoadBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw road surface with better visual design
    const roadWidth = DETECTION_ZONE.maxX - DETECTION_ZONE.minX; // 30 meters wide road
    const roadLength = DETECTION_ZONE.maxY - DETECTION_ZONE.minY; // Full 300 meters detection range
    const shoulderWidth = 5; // 5 meters shoulder on each side
    
    // Draw road shoulders (darker gray)
    ctx.fillStyle = '#4B5563';
    const leftShoulderStart = radarToVisual(-roadWidth/2 - shoulderWidth, 0);
    const leftShoulderEnd = radarToVisual(-roadWidth/2, roadLength);
    const rightShoulderStart = radarToVisual(roadWidth/2, 0);
    const rightShoulderEnd = radarToVisual(roadWidth/2 + shoulderWidth, roadLength);
    
    // Left shoulder
    ctx.fillRect(
      leftShoulderStart.x,
      leftShoulderStart.y,
      leftShoulderEnd.x - leftShoulderStart.x,
      leftShoulderEnd.y - leftShoulderStart.y
    );
    
    // Right shoulder
    ctx.fillRect(
      rightShoulderStart.x,
      rightShoulderStart.y,
      rightShoulderEnd.x - rightShoulderStart.x,
      rightShoulderEnd.y - rightShoulderStart.y
    );
    
    // Draw main road surface (asphalt color)
    ctx.fillStyle = '#1F2937';
    const roadStart = radarToVisual(-roadWidth/2, 0);
    const roadEnd = radarToVisual(roadWidth/2, roadLength);
    
    ctx.fillRect(
      roadStart.x,
      roadStart.y,
      roadEnd.x - roadStart.x,
      roadEnd.y - roadStart.y
    );
    
    // Draw road center line (yellow dashed)
    ctx.strokeStyle = '#FCD34D';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    
    const centerStart = radarToVisual(0, 0);
    const centerEnd = radarToVisual(0, roadLength);
    
    ctx.beginPath();
    ctx.moveTo(centerStart.x, centerStart.y);
    ctx.lineTo(centerEnd.x, centerEnd.y);
    ctx.stroke();
    
    // Draw lane dividers (white dashed)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    
    // Left lane divider
    const leftDividerStart = radarToVisual(-roadWidth/4, 0);
    const leftDividerEnd = radarToVisual(-roadWidth/4, roadLength);
    
    ctx.beginPath();
    ctx.moveTo(leftDividerStart.x, leftDividerStart.y);
    ctx.lineTo(leftDividerEnd.x, leftDividerEnd.y);
    ctx.stroke();
    
    // Right lane divider
    const rightDividerStart = radarToVisual(roadWidth/4, 0);
    const rightDividerEnd = radarToVisual(roadWidth/4, roadLength);
    
    ctx.beginPath();
    ctx.moveTo(rightDividerStart.x, rightDividerStart.y);
    ctx.lineTo(rightDividerEnd.x, rightDividerEnd.y);
    ctx.stroke();
    
    // Reset line dash
    ctx.setLineDash([]);
  }, [radarToVisual]);

  const drawDetectionZone = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw detection zone with better visual design
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    
    const roadLength = DETECTION_ZONE.maxY - DETECTION_ZONE.minY;
    const detectionZoneStart = radarToVisual(DETECTION_ZONE.minX, DETECTION_ZONE.minY);
    const detectionZoneEnd = radarToVisual(DETECTION_ZONE.maxX, DETECTION_ZONE.maxY);
    
    ctx.strokeRect(
      detectionZoneStart.x,
      detectionZoneStart.y,
      detectionZoneEnd.x - detectionZoneStart.x,
      detectionZoneEnd.y - detectionZoneStart.y
    );
    
    // Add detection zone label
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    
    const labelPos = radarToVisual(0, roadLength - 15);
    ctx.fillText('Detection Zone', labelPos.x, labelPos.y);
    
    // Reset line dash and text alignment
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
  }, [radarToVisual]);

  const drawLaneBoundaries = useCallback((ctx: CanvasRenderingContext2D) => {
    const currentLanes = getCurrentScenarioLanes();
    
    // Draw lane boundary lines (white solid)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    
    // Draw lane boundaries using current scenario
    currentLanes.forEach(lane => {
      // Left boundary of lane
      const leftStart = radarToVisual(lane.startX, DETECTION_ZONE.minY);
      const leftEnd = radarToVisual(lane.startX, DETECTION_ZONE.maxY);
      
      ctx.beginPath();
      ctx.moveTo(leftStart.x, leftStart.y);
      ctx.lineTo(leftEnd.x, leftEnd.y);
      ctx.stroke();
      
      // Right boundary of lane
      const rightStart = radarToVisual(lane.endX, DETECTION_ZONE.minY);
      const rightEnd = radarToVisual(lane.endX, DETECTION_ZONE.maxY);
      
      ctx.beginPath();
      ctx.moveTo(rightStart.x, rightStart.y);
      ctx.lineTo(rightEnd.x, rightEnd.y);
      ctx.stroke();
    });
    
    // Draw lane labels using current scenario
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    
    currentLanes.forEach(lane => {
      const laneCenterX = (lane.startX + lane.endX) / 2;
      const labelPos = radarToVisual(laneCenterX, 20);
      ctx.fillText(lane.description, labelPos.x, labelPos.y);
    });
    
    // Reset text alignment
    ctx.textAlign = 'left';
  }, [radarToVisual, getCurrentScenarioLanes]);

  const drawCoordinateSystem = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw coordinate system indicators
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // X-axis (horizontal)
    const xStart = radarToVisual(-15, 0);
    const xEnd = radarToVisual(15, 0);
    ctx.beginPath();
    ctx.moveTo(xStart.x, xStart.y);
    ctx.lineTo(xEnd.x, xEnd.y);
    ctx.stroke();

    // Y-axis (vertical) - REMOVED to eliminate red vertical line
    // const yStart = radarToVisual(0, 0);
    // const yEnd = radarToVisual(0, 300);
    // ctx.beginPath();
    // ctx.moveTo(yStart.x, yStart.y);
    // ctx.lineTo(yEnd.x, yEnd.y);
    // ctx.stroke();

    // Draw origin marker
    const yStart = radarToVisual(0, 0);
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(yStart.x, yStart.y, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Draw labels
    ctx.fillStyle = '#DC2626';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Road Center (0,0)', yStart.x, yStart.y - 10);
  }, [radarToVisual]);

  const drawScaleIndicator = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw scale indicator showing 0-300m
    const scaleWidth = 200; // pixels for scale bar
    const scaleHeight = 20;
    const margin = 20;
    
    // Position scale at bottom right of canvas
    const scaleX = CANVAS_CONFIG.width - scaleWidth - margin;
    const scaleY = CANVAS_CONFIG.height - scaleHeight - margin;
    
    // Draw scale background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(scaleX - 10, scaleY - 5, scaleWidth + 20, scaleHeight + 10);
    
    // Draw scale bar
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.moveTo(scaleX, scaleY + scaleHeight/2);
    ctx.lineTo(scaleX + scaleWidth, scaleY + scaleHeight/2);
    ctx.stroke();
    
    // Draw scale markers
    ctx.lineWidth = 2;
    const markerCount = 6; // 0, 60, 120, 180, 240, 300
    for (let i = 0; i < markerCount; i++) {
      const markerX = scaleX + (i * scaleWidth / (markerCount - 1));
      const markerHeight = i % 2 === 0 ? 8 : 4; // Alternating marker heights
      
      ctx.beginPath();
      ctx.moveTo(markerX, scaleY + scaleHeight/2 - markerHeight/2);
      ctx.lineTo(markerX, scaleY + scaleHeight/2 + markerHeight/2);
      ctx.stroke();
    }
    
    // Draw scale labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    
    // Main scale label
    ctx.fillText('0-300m Scale', scaleX + scaleWidth/2, scaleY - 8);
    
    // Distance markers
    ctx.font = '10px system-ui';
    for (let i = 0; i < markerCount; i++) {
      const markerX = scaleX + (i * scaleWidth / (markerCount - 1));
      const distance = i * 60; // 0, 60, 120, 180, 240, 300
      ctx.fillText(`${distance}m`, markerX, scaleY + scaleHeight + 15);
    }
    
    // Reset text alignment
    ctx.textAlign = 'left';
  }, []);

  const drawVehicleLegend = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw vehicle type legend - ClairWav Protocol V2.1
    const legendWidth = 220;
    const legendHeight = 280;
    const margin = 20;

    // Position legend at top left of canvas
    const legendX = margin;
    const legendY = margin;

    // Draw legend background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    // Draw legend border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Draw legend title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Vehicle Types (ClairWav)', legendX + legendWidth/2, legendY + 18);

    // Draw vehicle type items organized by category
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';

    const vehicleTypes = [
      // Standard vehicles
      { type: 'car', label: 'Car' },
      { type: 'suv', label: 'SUV' },
      { type: 'van', label: 'Van' },
      // Trucks
      { type: 'large_truck', label: 'Large Truck' },
      { type: 'medium_truck', label: 'Medium Truck' },
      { type: 'light_truck', label: 'Light Truck' },
      // Buses
      { type: 'bus', label: 'Bus' },
      { type: 'medium_bus', label: 'Medium Bus' },
      // Two-wheelers
      { type: 'motorcycle', label: 'Motorcycle' },
      { type: 'bicycle', label: 'Bicycle' },
      { type: 'tricycle', label: 'Tricycle' },
      // Special
      { type: 'dangerous_goods', label: 'Dangerous Goods' },
      { type: 'engineering_vehicle', label: 'Engineering' },
      { type: 'pedestrian', label: 'Pedestrian' },
      { type: 'other', label: 'Other/Unknown' }
    ];

    vehicleTypes.forEach((item, index) => {
      const itemY = legendY + 38 + (index * 16);
      const color = VEHICLE_COLORS[item.type as keyof typeof VEHICLE_COLORS];

      // Draw color square
      ctx.fillStyle = color;
      ctx.fillRect(legendX + 10, itemY - 8, 10, 10);

      // Draw label
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(item.label, legendX + 28, itemY);
    });

    // Reset text alignment
    ctx.textAlign = 'left';
  }, []);

  // Helper function to interpolate trail points for smooth curves
  const interpolateTrailPoints = useCallback((points: VehiclePosition[]): VehiclePosition[] => {
    if (points.length < 2) return points;
    
    const { trailConfig } = renderOptions;
    const smoothness = trailConfig.smoothness;
    
    if (smoothness === 0) return points; // No interpolation
    
    const interpolatedPoints: VehiclePosition[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      // Add current point
      interpolatedPoints.push(current);
      
      // Add interpolated points between current and next
      const steps = Math.floor(smoothness * 5); // 0-5 interpolated points
      for (let j = 1; j <= steps; j++) {
        const ratio = j / (steps + 1);
        const interpolatedPoint: VehiclePosition = {
          ...current,
          x: current.x + (next.x - current.x) * ratio,
          y: current.y + (next.y - current.y) * ratio,
          timestamp: new Date(current.timestamp.getTime() + (next.timestamp.getTime() - current.timestamp.getTime()) * ratio)
        };
        interpolatedPoints.push(interpolatedPoint);
      }
    }
    
    // Add the last point
    interpolatedPoints.push(points[points.length - 1]);
    
    return interpolatedPoints;
  }, [renderOptions]);

  const drawVehicleTrail = useCallback((ctx: CanvasRenderingContext2D, trajectory: VehiclePosition[], vehicleType: string, vehicleSpeed: number) => {
    const { trailConfig } = renderOptions;
    
    // Filter trajectory points to only include those within the detection zone
    const filteredTrajectory = trajectory.filter(pos =>
      pos.x >= DETECTION_ZONE.minX && pos.x <= DETECTION_ZONE.maxX &&
      pos.y >= DETECTION_ZONE.minY && pos.y <= DETECTION_ZONE.maxY
    );

    if (filteredTrajectory.length < 2) return; // Need at least 2 points for a trail

    // Apply interpolation for smooth curves
    const smoothTrajectory = interpolateTrailPoints(filteredTrajectory);

    // Determine trail color based on configuration
    let trailColor: string;
    switch (trailConfig.colorMode) {
      case 'vehicle':
        trailColor = VEHICLE_COLORS[vehicleType as keyof typeof VEHICLE_COLORS] || VEHICLE_COLORS.unknown;
        break;
      case 'speed':
        if (vehicleSpeed < 20) trailColor = '#10B981'; // Green for slow
        else if (vehicleSpeed < 50) trailColor = '#F59E0B'; // Orange for medium
        else trailColor = '#EF4444'; // Red for fast
        break;
      default:
        trailColor = '#FFEB3B'; // Default yellow
    }

    // Calculate speed-based thickness and opacity
    const speedMultiplier = Math.min(vehicleSpeed / 50, 2); // Cap at 2x
    const thickness = trailConfig.thickness * (0.5 + speedMultiplier * 0.5);
    const baseOpacity = trailConfig.opacity;

    // Apply fade effect over time
    const currentTime = Date.now();
    const fadeDuration = trailConfig.fadeDuration;

    ctx.beginPath();
    let isFirstPoint = true;

    smoothTrajectory.forEach((pos, index) => {
      const visualPos = radarToVisual(pos.x, pos.y);
      
      // Calculate fade based on point age
      const pointAge = currentTime - pos.timestamp.getTime();
      const fadeRatio = Math.max(0, 1 - (pointAge / fadeDuration));
      const pointOpacity = baseOpacity * fadeRatio;

      // Set trail styling for this segment
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = thickness;
      ctx.globalAlpha = pointOpacity;

      if (isFirstPoint) {
        ctx.moveTo(visualPos.x, visualPos.y);
        isFirstPoint = false;
      } else {
        ctx.lineTo(visualPos.x, visualPos.y);
      }
    });

    ctx.stroke();
    ctx.globalAlpha = 1; // Reset global alpha
  }, [radarToVisual, renderOptions, interpolateTrailPoints]);

  const drawHeatMapRoad = useCallback((ctx: CanvasRenderingContext2D) => {
    if (globalTrailHistory.size === 0) return;
    
    const maxCount = Math.max(...Array.from(globalTrailHistory.values()));
    const gridSize = 2; // meters
    
    globalTrailHistory.forEach((count, key) => {
      const [x, y] = key.split('_').map(Number);
      
      // Skip if outside detection zone
      if (x < DETECTION_ZONE.minX || x > DETECTION_ZONE.maxX ||
          y < DETECTION_ZONE.minY || y > DETECTION_ZONE.maxY) {
        return;
      }
      
      const intensity = count / maxCount;
      const alpha = Math.min(intensity * 0.6, 0.5); // Cap at 50% opacity
      
      // Use blue-to-red gradient based on intensity
      const hue = (1 - intensity) * 240; // 240 (blue) to 0 (red)
      ctx.fillStyle = `hsla(${hue}, 80%, 50%, ${alpha})`;
      
      // Draw grid cell
      const pos1 = radarToVisual(x, y);
      const pos2 = radarToVisual(x + gridSize, y + gridSize);
      const width = Math.abs(pos2.x - pos1.x);
      const height = Math.abs(pos2.y - pos1.y);
      
      ctx.fillRect(pos1.x, pos1.y, width, height);
    });
  }, [globalTrailHistory, radarToVisual]);

  const drawVehicle = useCallback((ctx: CanvasRenderingContext2D, vehicle: VehicleState, pos: { x: number; y: number }, size: { width: number; height: number }) => {
    // Use color based on vehicle type to match the legend
    const vehicleType = vehicle.position.vehicleType || 'unknown';
    const color = VEHICLE_COLORS[vehicleType as keyof typeof VEHICLE_COLORS] || VEHICLE_COLORS.unknown;
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

    // Draw callout line extending diagonally upward
    const calloutLengthX = 80; // Horizontal length of callout line
    const calloutLengthY = -50; // Vertical length (negative = upward)
    const calloutOffsetX = vehicle.position.x > 0 ? 1 : -1; // Extend right if on right side, left if on left side
    const calloutStartX = pos.x + (size.width / 2) * calloutOffsetX;
    const calloutStartY = pos.y;
    const calloutEndX = calloutStartX + (calloutLengthX * calloutOffsetX);
    const calloutEndY = calloutStartY + calloutLengthY;

    // Draw callout line
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(calloutStartX, calloutStartY);
    ctx.lineTo(calloutEndX, calloutEndY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash pattern

    // Draw vehicle ID at end of callout with background
    const vehicleId = vehicle.targetId.slice(-6);
    const speed = (vehicle.position.speed || 0).toFixed(0);
    const labelText = `${vehicleId} | ${vehicleType} | ${speed}km/h`;

    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = calloutOffsetX > 0 ? 'left' : 'right';
    const textMetrics = ctx.measureText(labelText);
    const textWidth = textMetrics.width;
    const textHeight = 20;
    const padding = 6;

    // Draw label background
    const bgX = calloutOffsetX > 0 ? calloutEndX : calloutEndX - textWidth - padding * 2;
    const bgY = calloutEndY - textHeight / 2 - padding;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(bgX, bgY, textWidth + padding * 2, textHeight + padding * 2);

    // Draw label border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(bgX, bgY, textWidth + padding * 2, textHeight + padding * 2);

    // Draw label text
    ctx.fillStyle = '#1F2937';
    ctx.fillText(labelText, calloutEndX + (calloutOffsetX > 0 ? padding : -padding), calloutEndY + 6);
  }, [getSpeedIntensity, hexToRgb, getVehicleColor]);

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
    if (vehicles.length === 0) {
      return;
    }
    
    vehicles.forEach(vehicle => {
      if (!vehicle.isVisible) {
        return;
      }
      
      const pos = radarToVisual(vehicle.position.x, vehicle.position.y);
      const size = calculateVehicleSize(vehicle.position);
      
      
      // Draw vehicle trail
      if (renderOptions.showTrails && vehicle.trajectory.length > 1) {
        drawVehicleTrail(ctx, vehicle.trajectory, vehicle.position.vehicleType, vehicle.position.speed);
      }
      
      // Draw vehicle
      drawVehicle(ctx, vehicle, pos, size);
      
      // Draw speed vector
      if (renderOptions.showSpeedVectors) {
        drawSpeedVector(ctx, vehicle, pos);
      }
    });
  }, [vehicles, renderOptions, radarToVisual, calculateVehicleSize, drawVehicleTrail, drawVehicle, drawSpeedVector]);

  // Automatic trail cleanup effect
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const { trailConfig } = renderOptions;
      
      // Clean up old trail history for heat map
      if (globalTrailHistory.size > 1000) { // Prevent memory growth
        const entries = Array.from(globalTrailHistory.entries());
        const recentEntries = entries.slice(-500); // Keep only recent 500 entries
        setGlobalTrailHistory(new Map(recentEntries));
      }
      
      // Clean up old vehicle trails based on persistence setting
      if (!trailConfig.persistence) {
        setVehicles(prevVehicles => 
          prevVehicles.map(vehicle => ({
            ...vehicle,
            trajectory: vehicle.trajectory.filter(pos => {
              const age = Date.now() - pos.timestamp.getTime();
              return age < trailConfig.fadeDuration * 2; // Keep trails for 2x fade duration
            })
          })).filter(vehicle => vehicle.trajectory.length > 0)
        );
      }
    }, 10000); // Cleanup every 10 seconds

    return () => clearInterval(cleanupInterval);
  }, [renderOptions, globalTrailHistory]);

  // Subscribe to tracking channel when WebSocket is connected
  useEffect(() => {
    if (ws && connectionStatus === 'connected') {
      // Add small delay for Firefox to ensure WebSocket is fully ready
      const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');
      const delay = isFirefox ? 100 : 0;

      const timer = setTimeout(() => {
        console.log('📡 Subscribing to tracking channel...');
        subscribeToChannel('tracking');
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [ws, connectionStatus, subscribeToChannel]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'tracking_data' || data.type === 'tracking_update') {
          // Handle tracking updates
          if (data.data && data.data.vehicles) {
            const incomingVehicles: VehiclePosition[] = data.data.vehicles;

            setVehicles(prevVehicles => {
              const updatedVehicles = incomingVehicles.map((vehicle: VehiclePosition) => {
                const existingVehicle = prevVehicles.find(v => v.targetId === vehicle.targetId);

                const newPosition: VehiclePosition = {
                  targetId: vehicle.targetId,
                  x: vehicle.x,
                  y: vehicle.y,
                  length: vehicle.length || 4.5,
                  width: vehicle.width || 1.8,
                  height: vehicle.height || 1.5,
                  speed: vehicle.speed,
                  vehicleType: vehicle.vehicleType,
                  laneNo: vehicle.laneNo,
                  timestamp: new Date(),
                  xSpeed: vehicle.xSpeed || 0,
                  ySpeed: vehicle.ySpeed || 0,
                  acceleration: vehicle.acceleration || 0
                };

                if (existingVehicle) {
                  // Accumulate trajectory with new position
                  const updatedTrajectory = [...existingVehicle.trajectory, newPosition];

                  // Limit trajectory length based on config
                  const maxLength = renderOptions.trailConfig.length;
                  const trimmedTrajectory = updatedTrajectory.slice(-maxLength);

                  return {
                    ...existingVehicle,
                    position: newPosition,
                    trajectory: trimmedTrajectory,
                    lastSeen: new Date(),
                    isVisible: true
                  };
                } else {
                  // New vehicle - create with initial position
                  return {
                    targetId: vehicle.targetId,
                    position: newPosition,
                    trajectory: [newPosition],
                    isVisible: true,
                    lastSeen: new Date(),
                    enterTime: new Date()
                  };
                }
              });

              // Accumulate trail history for heat map
              const newTrailHistory = new Map(globalTrailHistory);
              updatedVehicles.forEach(vehicle => {
                vehicle.trajectory.forEach(pos => {
                  const key = getGridKey(pos.x, pos.y);
                  newTrailHistory.set(key, (newTrailHistory.get(key) || 0) + 1);
                });
              });
              setGlobalTrailHistory(newTrailHistory);

              return updatedVehicles;
            });
          }
        } else if (data.type === 'tracking_summary') {
          // Handle tracking summary updates
          console.log('📊 Tracking summary:', data.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, getGridKey, globalTrailHistory, renderOptions.trailConfig.length]);

  // Effect to draw heat map once when sufficient data accumulated
  useEffect(() => {
    if (heatMapInitialized || globalTrailHistory.size < 100) return;
    
    const canvas = heatMapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHeatMapRoad(ctx);
    
    // Use setTimeout to avoid setState in effect
    setTimeout(() => {
      setHeatMapInitialized(true);
    }, 0);
  }, [globalTrailHistory, heatMapInitialized, drawHeatMapRoad]);

  // Handle canvas wheel for zoom (defined before useEffect to avoid hoisting issues)
  const handleCanvasWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoomLevel = Math.max(0.1, Math.min(3.0, renderOptions.zoomLevel * zoomFactor));

    setRenderOptions(prev => ({
      ...prev,
      zoomLevel: newZoomLevel
    }));
  }, [renderOptions.zoomLevel]);

  // Attach wheel event listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleCanvasWheel);
    };
  }, [handleCanvasWheel]);

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


      // Road background removed as requested
      // drawRoadBackground(ctx);

      // Draw detection zone
      drawDetectionZone(ctx);

      // Lane boundaries removed as part of road background
      // drawLaneBoundaries(ctx);

      // Draw coordinate system indicator
      if (showCoordinateSystem) {
        drawCoordinateSystem(ctx);
      }

      // Draw scale indicator
      drawScaleIndicator(ctx);

      // Draw vehicle legend
      drawVehicleLegend(ctx);

      // Draw vehicles
      drawVehicles(ctx);


      requestAnimationFrame(animate);
    };

    animate();
  }, [vehicles, renderOptions, showCoordinateSystem, drawRoadBackground, drawDetectionZone, drawLaneBoundaries, drawCoordinateSystem, drawScaleIndicator, drawVehicleLegend, drawVehicles]);

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

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button === 0) { // Left mouse button
      const startX = event.clientX;
      const startY = event.clientY;
      const startPanX = renderOptions.panX;
      const startPanY = renderOptions.panY;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        setRenderOptions(prev => ({
          ...prev,
          panX: startPanX + deltaX,
          panY: startPanY + deltaY
        }));
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  return (
    <div className={`space-y-6 w-full ${className}`}>
      {/* Header Controls - Compact at top */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
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
            <div className="text-sm text-gray-500">
              Zoom: {(renderOptions.zoomLevel * 100).toFixed(0)}% | Pan: ({renderOptions.panX.toFixed(0)}, {renderOptions.panY.toFixed(0)})
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
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showCoordinateSystem}
              onChange={(e) => setShowCoordinateSystem(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show Coordinate System</span>
          </label>
        </div>
      </div>

      {/* Side-by-side layout or full-width based on hideRadarCard prop */}
      <div className={hideRadarCard ? "w-full" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
        {/* Radar Analysis Card - Only show if not hidden */}
        {!hideRadarCard && (
          <div className="lg:col-span-1">
            <RadarAnalysisCard
              vehicles={vehicles}
              selectedScenario={selectedScenario}
              onScenarioChange={setSelectedScenario}
              className="h-fit"
            />
          </div>
        )}

        {/* Tracking Map - Full width if hideRadarCard, otherwise right side */}
        <div className={hideRadarCard ? "w-full" : "lg:col-span-2"}>
          <div className="bg-white rounded-lg shadow overflow-hidden relative" style={{ height: hideRadarCard ? '100%' : '700px' }}>
            <canvas
              ref={heatMapCanvasRef}
              width={CANVAS_CONFIG.width}
              height={CANVAS_CONFIG.height}
              className="absolute top-0 left-0 w-full h-full canvas-heatmap"
            />
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              className="relative w-full h-full cursor-crosshair canvas-main"
            />
          </div>
        </div>
      </div>

      {/* Zoom Controls - Below Canvas */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Zoom:</label>
          <button
            onClick={() => setRenderOptions(prev => ({ ...prev, zoomLevel: Math.max(0.1, prev.zoomLevel - 0.2) }))}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            -
          </button>
          <span className="text-sm text-gray-600 w-16 text-center">
            {(renderOptions.zoomLevel * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setRenderOptions(prev => ({ ...prev, zoomLevel: Math.min(3.0, prev.zoomLevel + 0.2) }))}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            +
          </button>
          <button
            onClick={() => setRenderOptions(prev => ({ ...prev, zoomLevel: 1.0, panX: 0, panY: 0 }))}
            className="px-3 py-1 bg-blue-200 hover:bg-blue-300 rounded text-sm"
          >
            Reset View
          </button>
          <div className="text-xs text-gray-500">
            Mouse wheel to zoom • Drag to pan
          </div>
        </div>

        {/* Preset Zoom Levels */}
        <div className="flex items-center space-x-2 mt-3">
          <span className="text-xs text-gray-600">Quick zoom:</span>
          <button
            onClick={() => setRenderOptions(prev => ({ ...prev, zoomLevel: 0.1, panX: 0, panY: 0 }))}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            1/10 Scale
          </button>
          <button
            onClick={() => setRenderOptions(prev => ({ ...prev, zoomLevel: 0.5, panX: 0, panY: 0 }))}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Fit All
          </button>
          <button
            onClick={() => setRenderOptions(prev => ({ ...prev, zoomLevel: 1.0, panX: 0, panY: 0 }))}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Normal
          </button>
          <button
            onClick={() => setRenderOptions(prev => ({ ...prev, zoomLevel: 2.0, panX: 0, panY: 0 }))}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Close Up
          </button>
          <button
            onClick={() => setRenderOptions(prev => ({ ...prev, zoomLevel: 3.0, panX: 0, panY: 0 }))}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            Detail
          </button>
        </div>
      </div>

      {/* Trail Configuration Panel - MOVED TO BOTTOM - Collapsible */}
      {renderOptions.showTrails && (
        <div className="bg-white rounded-lg shadow">
          <button
            onClick={() => setTrailConfigExpanded(!trailConfigExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-sm font-semibold text-gray-700">Trail Configuration</h3>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${trailConfigExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {trailConfigExpanded && (
            <div className="p-4 pt-0 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Trail Length */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Trail Length: {renderOptions.trailConfig.length} points
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={renderOptions.trailConfig.length}
                    onChange={(e) => setRenderOptions(prev => ({
                      ...prev,
                      trailConfig: { ...prev.trailConfig, length: parseInt(e.target.value) }
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    aria-label="Trail Length"
                    title="Adjust trail length from 10 to 200 points"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10</span>
                    <span>200</span>
                  </div>
                </div>

                {/* Trail Opacity */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Opacity: {(renderOptions.trailConfig.opacity * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={renderOptions.trailConfig.opacity}
                    onChange={(e) => setRenderOptions(prev => ({
                      ...prev,
                      trailConfig: { ...prev.trailConfig, opacity: parseFloat(e.target.value) }
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    aria-label="Trail Opacity"
                    title="Adjust trail opacity from 10% to 100%"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Trail Thickness */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Thickness: {renderOptions.trailConfig.thickness}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={renderOptions.trailConfig.thickness}
                    onChange={(e) => setRenderOptions(prev => ({
                      ...prev,
                      trailConfig: { ...prev.trailConfig, thickness: parseFloat(e.target.value) }
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    aria-label="Trail Thickness"
                    title="Adjust trail thickness from 1px to 5px"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1px</span>
                    <span>5px</span>
                  </div>
                </div>

                {/* Color Mode */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Color Mode</label>
                  <select
                    value={renderOptions.trailConfig.colorMode}
                    onChange={(e) => setRenderOptions(prev => ({
                      ...prev,
                      trailConfig: { ...prev.trailConfig, colorMode: e.target.value as 'vehicle' | 'speed' | 'custom' }
                    }))}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                    aria-label="Trail Color Mode"
                    title="Select how trail colors are determined"
                  >
                    <option value="vehicle">Vehicle Type</option>
                    <option value="speed">Speed Based</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Fade Duration */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Fade Duration: {(renderOptions.trailConfig.fadeDuration / 1000).toFixed(1)}s
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={renderOptions.trailConfig.fadeDuration}
                    onChange={(e) => setRenderOptions(prev => ({
                      ...prev,
                      trailConfig: { ...prev.trailConfig, fadeDuration: parseInt(e.target.value) }
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    aria-label="Trail Fade Duration"
                    title="Adjust how long trails take to fade out"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1s</span>
                    <span>100s</span>
                  </div>
                </div>

                {/* Smoothness */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Smoothness: {(renderOptions.trailConfig.smoothness * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={renderOptions.trailConfig.smoothness}
                    onChange={(e) => setRenderOptions(prev => ({
                      ...prev,
                      trailConfig: { ...prev.trailConfig, smoothness: parseFloat(e.target.value) }
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    aria-label="Trail Smoothness"
                    title="Adjust how smooth the trail curves are"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Additional Trail Options */}
              <div className="flex items-center space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={renderOptions.trailConfig.persistence}
                    onChange={(e) => setRenderOptions(prev => ({
                      ...prev,
                      trailConfig: { ...prev.trailConfig, persistence: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700">Persist Trails</span>
                </label>
                <button
                  onClick={() => {
                    setGlobalTrailHistory(new Map());
                    setHeatMapInitialized(false);
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                >
                  Reset Heat Map
                </button>
                <div className="text-xs text-gray-600">
                  Trail Data Points: {globalTrailHistory.size}
                  {heatMapInitialized && <span className="ml-2 text-green-600">✓ Rendered</span>}
                </div>
              </div>

              {/* Trail Analytics and Traffic Pattern Analysis - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trail Analytics */}
                <div className="p-3 bg-gray-50 rounded border">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Trail Analytics</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    <div>
                      <span className="text-gray-600">Active Trails:</span>
                      <span className="ml-2 font-medium">{vehicles.filter(v => v.trajectory.length > 1).length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Trail Points:</span>
                      <span className="ml-2 font-medium">
                        {vehicles.reduce((sum, v) => sum + v.trajectory.length, 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Trail Length:</span>
                      <span className="ml-2 font-medium">
                        {vehicles.length > 0
                          ? (vehicles.reduce((sum, v) => sum + v.trajectory.length, 0) / vehicles.length).toFixed(1)
                          : '0'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Memory Usage:</span>
                      <span className="ml-2 font-medium">
                        {(globalTrailHistory.size * 0.001).toFixed(1)}KB
                      </span>
                    </div>
                  </div>

                  {/* Export Controls */}
                  <div className="flex space-x-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => {
                        const trailData = {
                          timestamp: new Date().toISOString(),
                          config: renderOptions.trailConfig,
                          vehicles: vehicles.map(v => ({
                            targetId: v.targetId,
                            vehicleType: v.position.vehicleType,
                            trajectory: v.trajectory.map(pos => ({
                              x: pos.x,
                              y: pos.y,
                              speed: pos.speed,
                              timestamp: pos.timestamp.toISOString()
                            }))
                          })),
                          analytics: {
                            activeTrails: vehicles.filter(v => v.trajectory.length > 1).length,
                            totalPoints: vehicles.reduce((sum, v) => sum + v.trajectory.length, 0),
                            memoryUsage: globalTrailHistory.size
                          }
                        };

                        const blob = new Blob([JSON.stringify(trailData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `trail-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      title="Export trail data as JSON"
                    >
                      Export JSON
                    </button>

                    <button
                      onClick={() => {
                        const canvas = canvasRef.current;
                        if (canvas) {
                          const link = document.createElement('a');
                          link.download = `trail-visualization-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
                          link.href = canvas.toDataURL();
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                      title="Export current visualization as PNG"
                    >
                      Export PNG
                    </button>
                  </div>
                </div>

                {/* Traffic Pattern Analysis */}
                <div className="p-3 bg-gray-50 rounded border">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Traffic Pattern Analysis</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-600">Avg Speed:</span>
                      <span className="ml-2 font-medium">
                        {vehicles.length > 0
                          ? (vehicles.reduce((sum, v) => sum + v.position.speed, 0) / vehicles.length).toFixed(1)
                          : '0'
                        } km/h
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Speed Variance:</span>
                      <span className="ml-2 font-medium">
                        {vehicles.length > 1
                          ? (() => {
                              const avgSpeed = vehicles.reduce((sum, v) => sum + v.position.speed, 0) / vehicles.length;
                              const variance = vehicles.reduce((sum, v) => sum + Math.pow(v.position.speed - avgSpeed, 2), 0) / vehicles.length;
                              return Math.sqrt(variance).toFixed(1);
                            })()
                          : '0'
                        } km/h
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Congestion Level:</span>
                      <span className="ml-2 font-medium">
                        {(() => {
                          const slowVehicles = vehicles.filter(v => v.position.speed < 20).length;
                          const congestionLevel = vehicles.length > 0 ? (slowVehicles / vehicles.length) * 100 : 0;
                          if (congestionLevel < 20) return 'Low';
                          if (congestionLevel < 50) return 'Medium';
                          return 'High';
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Flow Direction:</span>
                      <span className="ml-2 font-medium">
                        {(() => {
                          const forwardVehicles = vehicles.filter(v => v.position.y > 150).length;
                          const backwardVehicles = vehicles.filter(v => v.position.y <= 150).length;
                          if (forwardVehicles > backwardVehicles) return 'Northbound';
                          if (backwardVehicles > forwardVehicles) return 'Southbound';
                          return 'Mixed';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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