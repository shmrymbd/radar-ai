'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { VehiclePosition, VehicleState, VehicleRenderOptions, VEHICLE_COLORS, CANVAS_CONFIG, DETECTION_ZONE } from '@/types/tracking';

interface LiveTrackingProps {
  className?: string;
}

export default function LiveTracking({ className = '' }: LiveTrackingProps) {
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
    panY: 0
  });
  const [selectedScenario, setSelectedScenario] = useState<number>(0);
  const [showCoordinateSystem, setShowCoordinateSystem] = useState(true);
  
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

  // Analyze radar data to create lane scenarios based on actual radar lane assignments
  const analyzeRadarData = useCallback(() => {
    if (vehicles.length === 0) {
      return {
        scenarios: [
          {
            id: 0,
            name: 'Standard 3-Lane',
            description: 'Default configuration',
            lanes: [
              { laneNumber: 1, startX: -15, endX: -5, description: 'Left Lane', width: 10 },
              { laneNumber: 2, startX: -5, endX: 5, description: 'Center Lane', width: 10 },
              { laneNumber: 3, startX: 5, endX: 15, description: 'Right Lane', width: 10 }
            ]
          }
        ],
        vehicleStats: { count: 0, avgWidth: 0, avgLength: 0, types: {} }
      };
    }

    // Analyze vehicle data
    const vehicleWidths = vehicles.map(v => v.position.width);
    const vehicleLengths = vehicles.map(v => v.position.length);
    const vehicleTypes = vehicles.map(v => v.position.vehicleType);
    
    const avgWidth = vehicleWidths.reduce((sum, w) => sum + w, 0) / vehicleWidths.length;
    const avgLength = vehicleLengths.reduce((sum, l) => sum + l, 0) / vehicleLengths.length;
    const maxWidth = Math.max(...vehicleWidths);
    const minWidth = Math.min(...vehicleWidths);
    
    // Count vehicle types
    const typeCount = vehicleTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyze actual radar lane assignments and X positions
    const laneData = vehicles.reduce((acc, v) => {
      const laneNo = v.position.laneNo;
      const x = v.position.x;
      
      if (!acc[laneNo]) {
        acc[laneNo] = { xPositions: [], vehicles: [] };
      }
      acc[laneNo].xPositions.push(x);
      acc[laneNo].vehicles.push(v);
      return acc;
    }, {} as Record<number, { xPositions: number[], vehicles: VehicleState[] }>);

    // Calculate lane boundaries based on actual radar data
    const radarLanes = Object.entries(laneData).map(([laneNo, data]) => {
      const xPositions = data.xPositions;
      const minX = Math.min(...xPositions);
      const maxX = Math.max(...xPositions);
      const avgX = xPositions.reduce((sum, x) => sum + x, 0) / xPositions.length;
      
      // Calculate lane width based on vehicle positions and widths
      const vehicleWidths = data.vehicles.map(v => v.position.width);
      const maxVehicleWidth = Math.max(...vehicleWidths);
      const laneWidth = Math.max(maxVehicleWidth * 1.5, 3.5); // Safety buffer
      
      return {
        laneNumber: parseInt(laneNo),
        startX: avgX - laneWidth / 2,
        endX: avgX + laneWidth / 2,
        description: `Radar Lane ${laneNo}`,
        width: laneWidth,
        vehicleCount: data.vehicles.length,
        avgX: avgX,
        minX: minX,
        maxX: maxX
      };
    }).sort((a, b) => a.avgX - b.avgX); // Sort by X position

    // Create scenarios based on radar data
    const scenarios = [
      // Scenario 1: Radar-Based (actual radar lane assignments)
      {
        id: 0,
        name: 'Radar-Based',
        description: `Based on actual radar lanes (${radarLanes.length} lanes)`,
        lanes: radarLanes
      },
      
      // Scenario 2: Optimized Radar (merge close lanes, expand wide ones)
      {
        id: 1,
        name: 'Optimized Radar',
        description: 'Optimized radar lanes with better spacing',
        lanes: (() => {
          if (radarLanes.length === 0) return radarLanes;
          
          // Merge lanes that are too close together
          const mergedLanes = [];
          let currentLane = radarLanes[0];
          
          for (let i = 1; i < radarLanes.length; i++) {
            const nextLane = radarLanes[i];
            const distance = nextLane.avgX - currentLane.avgX;
            
            if (distance < 4.0) { // Merge if too close
              currentLane = {
                ...currentLane,
                endX: nextLane.endX,
                width: nextLane.endX - currentLane.startX,
                description: `Merged Lane ${currentLane.laneNumber}-${nextLane.laneNumber}`,
                vehicleCount: currentLane.vehicleCount + nextLane.vehicleCount
              };
            } else {
              mergedLanes.push(currentLane);
              currentLane = nextLane;
            }
          }
          mergedLanes.push(currentLane);
          
          return mergedLanes;
        })()
      },
      
      // Scenario 3: Standardized (convert radar lanes to standard 3-lane)
      {
        id: 2,
        name: 'Standardized',
        description: 'Convert radar lanes to standard 3-lane configuration',
        lanes: (() => {
          const totalWidth = DETECTION_ZONE.maxX - DETECTION_ZONE.minX - 2;
          const laneWidth = totalWidth / 3;
          const startX = DETECTION_ZONE.minX + 1;
          
          return [
            { laneNumber: 1, startX: startX, endX: startX + laneWidth, description: 'Left Lane', width: laneWidth },
            { laneNumber: 2, startX: startX + laneWidth, endX: startX + 2 * laneWidth, description: 'Center Lane', width: laneWidth },
            { laneNumber: 3, startX: startX + 2 * laneWidth, endX: startX + 3 * laneWidth, description: 'Right Lane', width: laneWidth }
          ];
        })()
      }
    ];

    // Analyze lane usage from radar data
    const laneUsage = vehicles.reduce((acc, v) => {
      const lane = v.position.laneNo;
      acc[lane] = (acc[lane] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      scenarios,
      vehicleStats: {
        count: vehicles.length,
        avgWidth: avgWidth,
        avgLength: avgLength,
        maxWidth: maxWidth,
        minWidth: minWidth,
        types: typeCount,
        laneUsage: laneUsage,
        radarLanes: radarLanes
      }
    };
  }, [vehicles]);

  // Get current scenario lanes
  const getCurrentScenarioLanes = useCallback(() => {
    const analysis = analyzeRadarData();
    return analysis.scenarios[selectedScenario]?.lanes || analysis.scenarios[0].lanes;
  }, [analyzeRadarData, selectedScenario]);

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
    // Draw vehicle type legend
    const legendWidth = 180;
    const legendHeight = 140;
    const margin = 20;
    
    // Position legend at top left of canvas
    const legendX = margin;
    const legendY = margin;
    
    // Draw legend background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    
    // Draw legend border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
    
    // Draw legend title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Vehicle Types', legendX + legendWidth/2, legendY + 20);
    
    // Draw vehicle type items
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    
    const vehicleTypes = [
      { type: 'car', label: 'Car' },
      { type: 'truck', label: 'Truck' },
      { type: 'motorcycle', label: 'Motorcycle' },
      { type: 'bus', label: 'Bus' },
      { type: 'van', label: 'Van' },
      { type: 'suv', label: 'SUV' },
      { type: 'unknown', label: 'Unknown' }
    ];
    
    vehicleTypes.forEach((item, index) => {
      const itemY = legendY + 40 + (index * 16);
      const color = VEHICLE_COLORS[item.type as keyof typeof VEHICLE_COLORS];
      
      // Draw color square
      ctx.fillStyle = color;
      ctx.fillRect(legendX + 10, itemY - 8, 12, 12);
      
      // Draw label
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(item.label, legendX + 30, itemY);
    });
    
    // Reset text alignment
    ctx.textAlign = 'left';
  }, []);

  const drawVehicleTrail = useCallback((ctx: CanvasRenderingContext2D, trajectory: VehiclePosition[], vehicleType: string) => {
    // Filter trajectory points to only include those within the detection zone
    const filteredTrajectory = trajectory.filter(pos => 
      pos.x >= DETECTION_ZONE.minX && pos.x <= DETECTION_ZONE.maxX &&
      pos.y >= DETECTION_ZONE.minY && pos.y <= DETECTION_ZONE.maxY
    );
    
    if (filteredTrajectory.length < 2) return; // Need at least 2 points for a trail
    
    // Use vehicle-specific color for trail
    const color = VEHICLE_COLORS[vehicleType as keyof typeof VEHICLE_COLORS] || VEHICLE_COLORS.unknown;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1; // Smaller trail width
    ctx.globalAlpha = 0.4; // More transparent
    
    ctx.beginPath();
    filteredTrajectory.forEach((pos, index) => {
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
    // Use consistent color based on vehicle ID instead of vehicle type
    const color = getVehicleColor(vehicle.targetId);
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
    const vehicleType = vehicle.position.vehicleType || 'unknown';
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
        drawVehicleTrail(ctx, vehicle.trajectory, vehicle.position.vehicleType);
      }
      
      // Draw vehicle
      drawVehicle(ctx, vehicle, pos, size);
      
      // Draw speed vector
      if (renderOptions.showSpeedVectors) {
        drawSpeedVector(ctx, vehicle, pos);
      }
    });
  }, [vehicles, renderOptions, radarToVisual, calculateVehicleSize, drawVehicleTrail, drawVehicle, drawSpeedVector]);

  // Subscribe to tracking channel when WebSocket is connected
  useEffect(() => {
    if (ws && connectionStatus === 'connected') {
      subscribeToChannel('tracking');
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
            const vehicleStates: VehicleState[] = data.data.vehicles.map((vehicle: VehiclePosition) => ({
              targetId: vehicle.targetId,
              position: {
                targetId: vehicle.targetId,
                x: vehicle.x,
                y: vehicle.y,
                length: 4.5,
                width: 1.8,
                height: 1.5,
                speed: vehicle.speed,
                vehicleType: vehicle.vehicleType,
                laneNo: vehicle.laneNo,
                timestamp: new Date(),
                xSpeed: 0,
                ySpeed: 0,
                acceleration: 0
              },
              trajectory: [{
                targetId: vehicle.targetId,
                x: vehicle.x,
                y: vehicle.y,
                length: 4.5,
                width: 1.8,
                height: 1.5,
                speed: vehicle.speed,
                vehicleType: vehicle.vehicleType,
                laneNo: vehicle.laneNo,
                timestamp: new Date(),
                xSpeed: 0,
                ySpeed: 0,
                acceleration: 0
              }],
              isVisible: true,
              lastSeen: new Date(),
              enterTime: new Date()
            }));
            
            setVehicles(vehicleStates);
            
            // Accumulate trail history for heat map
            const newTrailHistory = new Map(globalTrailHistory);
            vehicleStates.forEach(vehicle => {
              vehicle.trajectory.forEach(pos => {
                const key = getGridKey(pos.x, pos.y);
                newTrailHistory.set(key, (newTrailHistory.get(key) || 0) + 1);
              });
            });
            setGlobalTrailHistory(newTrailHistory);
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
  }, [ws, getGridKey, globalTrailHistory]);

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

  const handleCanvasWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoomLevel = Math.max(0.1, Math.min(3.0, renderOptions.zoomLevel * zoomFactor));
    
    setRenderOptions(prev => ({
      ...prev,
      zoomLevel: newZoomLevel
    }));
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
        
        {/* Heat Map Controls */}
        <div className="flex items-center space-x-4 mt-4">
          <button
            onClick={() => {
              setGlobalTrailHistory(new Map());
              setHeatMapInitialized(false);
            }}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Reset Heat Map
          </button>
          <div className="text-sm text-gray-600">
            Trail Data Points: {globalTrailHistory.size}
            {heatMapInitialized && <span className="ml-2 text-green-600">✓ Rendered</span>}
          </div>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center space-x-4 mt-4">
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
          <div className="text-xs text-gray-500 ml-4">
            Mouse wheel to zoom • Drag to pan
          </div>
        </div>

        {/* Preset Zoom Levels */}
        <div className="flex items-center space-x-2 mt-2">
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

      {/* Canvas */}
      <div className="bg-white rounded-lg shadow overflow-hidden relative">
        <canvas
          ref={heatMapCanvasRef}
          width={CANVAS_CONFIG.width}
          height={CANVAS_CONFIG.height}
          className="absolute top-0 left-0 w-full h-full canvas-heatmap"
        />
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onWheel={handleCanvasWheel}
          onMouseDown={handleCanvasMouseDown}
          className="relative w-full h-full cursor-crosshair canvas-main"
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

      {/* Radar Data Analysis & Scenario Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Radar Data Analysis & Lane Scenarios</h3>
        <div className="text-sm text-gray-700 space-y-4">
          {(() => {
            const analysis = analyzeRadarData();
            const currentScenario = analysis.scenarios[selectedScenario];

            return (
              <>
                {/* Vehicle Statistics */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Vehicle Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Total Vehicles</label>
                      <p className="text-lg font-semibold text-gray-900">{analysis.vehicleStats.count}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Average Width</label>
                      <p className="text-lg font-semibold text-gray-900">{analysis.vehicleStats.avgWidth.toFixed(1)}m</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Average Length</label>
                      <p className="text-lg font-semibold text-gray-900">{analysis.vehicleStats.avgLength.toFixed(1)}m</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Max Width</label>
                      <p className="text-lg font-semibold text-gray-900">{analysis.vehicleStats.maxWidth?.toFixed(1) || 'N/A'}m</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Types */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Vehicle Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analysis.vehicleStats.types).map(([type, count]) => (
                      <div key={type} className="px-3 py-2 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-900 capitalize">{type}:</span>
                        <span className="ml-1 text-sm font-semibold text-blue-700">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lane Usage from Radar */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Radar Lane Usage</h4>
                  {analysis.vehicleStats.laneUsage ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analysis.vehicleStats.laneUsage).map(([lane, count]) => (
                        <div key={lane} className="px-3 py-2 bg-green-50 rounded-lg">
                          <span className="text-sm font-medium text-green-900">Lane {lane}:</span>
                          <span className="ml-1 text-sm font-semibold text-green-700">{count} vehicles</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No lane data available</p>
                  )}
                </div>

                {/* Radar Lane Analysis */}
                {analysis.vehicleStats.radarLanes && analysis.vehicleStats.radarLanes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Radar Lane Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {analysis.vehicleStats.radarLanes.map(lane => (
                        <div key={lane.laneNumber} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="font-medium text-gray-900 mb-1">Lane {lane.laneNumber}</div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Position: X={lane.avgX.toFixed(1)}m</div>
                            <div>Width: {lane.width.toFixed(1)}m</div>
                            <div>Vehicles: {lane.vehicleCount}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scenario Selector */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Lane Scenario Selection</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {analysis.scenarios.map((scenario) => (
                      <button
                        key={scenario.id}
                        onClick={() => setSelectedScenario(scenario.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedScenario === scenario.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {scenario.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Scenario Info */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-medium text-blue-900 text-base mb-1">{currentScenario.name}</div>
                  <div className="text-sm text-blue-700 mb-3">{currentScenario.description}</div>
                  <div className="text-sm text-blue-800 mb-2">
                    <strong>Lanes:</strong> {currentScenario.lanes.length} |
                    <strong> Width:</strong> {currentScenario.lanes[0]?.width?.toFixed(1)}m each
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {currentScenario.lanes.map(lane => (
                      <div key={lane.laneNumber} className="bg-white px-3 py-2 rounded text-center text-sm font-medium text-gray-900 border border-blue-100">
                        {lane.description}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}