import { ObjectData, LaneStatus, PassData, TrafficData, RegionData, VehicleEntry, LaneEntry } from '@/types/radar';
import { ClassificationProcessor } from './classification-processor';
import { VEHICLE_TYPE_MAP } from '@/types/classification';

export class RadarDataProcessor {
  private static instance: RadarDataProcessor;
  private classificationProcessor: ClassificationProcessor;
  
  public static getInstance(): RadarDataProcessor {
    if (!RadarDataProcessor.instance) {
      RadarDataProcessor.instance = new RadarDataProcessor();
    }
    return RadarDataProcessor.instance;
  }

  private constructor() {
    this.classificationProcessor = ClassificationProcessor.getInstance();
  }

  /**
   * Process Object Data (0x01) - Individual vehicle tracking
   */
  public processObjectData(data: ObjectData): ProcessedObjectData {
    const processedEntries = data.entries.map(entry => this.processVehicleEntry(entry));
    
    return {
      deviceId: data.deviceId,
      timestamp: new Date(data.timestamp),
      numEntries: data.numEntries,
      entries: processedEntries,
      packetSize: data.packetSize,
      summary: this.calculateObjectDataSummary(processedEntries),
      frameType: '0x01'
    };
  }

  /**
   * Process Lane Status (0x04) - Lane performance metrics
   */
  public processLaneStatus(data: LaneStatus): ProcessedLaneStatus {
    const processedEntries = data.entries.map(entry => this.processLaneEntry(entry));
    
    return {
      deviceId: data.deviceId,
      timestamp: new Date(data.timestamp),
      numEntries: data.numEntries,
      entries: processedEntries,
      packetSize: data.packetSize,
      summary: this.calculateLaneStatusSummary(processedEntries)
    };
  }

  /**
   * Process Pass Data (0x05) - Vehicle crossing events
   */
  public processPassData(data: PassData): ProcessedPassData {
    const processedData = {
      deviceId: data.deviceId,
      timestamp: new Date(data.passingTime),
      laneNumber: data.laneNumber,
      crossSectionPosition: data.crossSectionPosition,
      crossSectionSpeed: data.crossSectionSpeed,
      headwayTime: data.headwayTime,
      occupancyDuration: data.occupancyDuration,
      occupancyStatus: data.occupancyStatus === 1 ? 'entering' : 'exiting',
      vehicleType: this.getVehicleTypeName(data.vehicleType)
    };

    // Process for classification analytics
    this.classificationProcessor.processPassDataForClassification(processedData);

    return processedData;
  }

  /**
   * Process Traffic Data (0x03) - Statistical analysis
   */
  public processTrafficData(data: TrafficData): ProcessedTrafficData {
    return {
      deviceId: data.deviceId,
      timestamp: new Date(data.timestamp),
      statisticalPeriod: data.statisticalPeriod,
      targetLane: data.targetLane,
      monitoringLocation: data.monitoringLocation,
      vehicleFlows: data.vehicleFlows,
      totalFlow: data.totalFlow,
      averageSpeed: data.averageSpeed,
      headwayTime: data.headwayTime,
      virtualLoopOccupancy: data.virtualLoopOccupancy,
      maxQueueLength: data.maxQueueLength,
      laneSpaceOccupancy: data.laneSpaceOccupancy,
      vehicleSpacing: data.vehicleSpacing,
      trafficDensity: data.trafficDensity,
      summary: this.calculateTrafficDataSummary(data)
    };
  }

  /**
   * Process Region Data (0x02) - Turn movement statistics
   */
  public processRegionData(data: RegionData): ProcessedRegionData {
    return {
      deviceId: data.deviceId,
      timestamp: new Date(data.timestamp),
      statisticalPeriod: data.statisticalPeriod,
      direction: data.direction,
      leftTurnPercent: data.leftTurnPercent,
      straightPercent: data.straightPercent,
      rightTurnPercent: data.rightTurnPercent,
      summary: this.calculateRegionDataSummary(data)
    };
  }

  private processVehicleEntry(entry: VehicleEntry): ProcessedVehicleEntry {
    return {
      ...entry,
      vehicleTypeName: this.getVehicleTypeName(entry.targetType),
      speedKmh: this.validateSpeed(entry.speedKmh),
      position: {
        x: entry.xCoordM,
        y: entry.yCoordM
      },
      movement: {
        xSpeed: entry.xSpeed,
        ySpeed: entry.ySpeed,
        acceleration: entry.acceleration
      },
      dimensions: {
        length: entry.vehicleLength,
        width: entry.vehicleWidth,
        height: entry.vehicleHeight
      }
    };
  }

  private processLaneEntry(entry: LaneEntry): ProcessedLaneEntry {
    return {
      ...entry,
      laneName: this.getLaneName(entry.lane.number),
      queueStatus: this.getQueueStatus(entry.queue),
      trafficFlow: this.getTrafficFlowStatus(entry.speeds.average, entry.spaceOccupancyRate),
      alerts: this.generateLaneAlerts(entry)
    };
  }

  private getVehicleTypeName(type: number): string {
    // Use the official VEHICLE_TYPE_MAP from ClairWav Communication Protocol V2.1
    return VEHICLE_TYPE_MAP[type as keyof typeof VEHICLE_TYPE_MAP] || 'other';
  }

  private getLaneName(laneNumber: number): string {
    const laneMap: { [key: number]: string } = {
      11: 'Upstream Lane 1',
      12: 'Upstream Lane 2',
      13: 'Upstream Lane 3',
      485: 'Unknown Lane'
    };
    return laneMap[laneNumber] || `Lane ${laneNumber}`;
  }

  private validateSpeed(speed: number): number {
    // Filter unreasonable speeds (0-200 km/h)
    if (speed < 0 || speed > 200) {
      return 0;
    }
    return speed;
  }

  private getQueueStatus(queue: any): string {
    if (queue.overflow) return 'overflow';
    if (queue.exceedsLimit) return 'exceeds_limit';
    if (queue.length > 0) return 'queued';
    return 'free_flow';
  }

  private getTrafficFlowStatus(averageSpeed: number, occupancyRate: number): string {
    if (occupancyRate > 80) return 'congested';
    if (averageSpeed < 10) return 'slow';
    if (averageSpeed < 30) return 'moderate';
    return 'free_flow';
  }

  private generateLaneAlerts(entry: LaneEntry): string[] {
    const alerts: string[] = [];
    
    if (entry.queue.overflow) {
      alerts.push('Queue overflow detected');
    }
    if (entry.queue.exceedsLimit) {
      alerts.push('Queue exceeds limit');
    }
    if (entry.spaceOccupancyRate > 90) {
      alerts.push('High occupancy rate');
    }
    if (entry.speeds.average < 5) {
      alerts.push('Very slow traffic');
    }
    
    return alerts;
  }

  private calculateObjectDataSummary(entries: ProcessedVehicleEntry[]): ObjectDataSummary {
    const speeds = entries.map(e => e.speedKmh).filter(s => s > 0);
    const vehicleTypes = entries.map(e => e.vehicleTypeName);
    
    return {
      totalVehicles: entries.length,
      averageSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
      vehicleTypeCounts: this.countVehicleTypes(vehicleTypes),
      lanes: [...new Set(entries.map(e => e.laneNo))],
      stationaryVehicles: entries.filter(e => e.speedKmh === 0).length
    };
  }

  private calculateLaneStatusSummary(entries: ProcessedLaneEntry[]): LaneStatusSummary {
    return {
      totalLanes: entries.length,
      lanesWithQueues: entries.filter(e => e.queue.length > 0).length,
      averageQueueLength: entries.reduce((sum, e) => sum + e.queue.length, 0) / entries.length,
      totalVehiclesOnline: entries.reduce((sum, e) => sum + e.vehiclesOnline, 0),
      averageOccupancyRate: entries.reduce((sum, e) => sum + e.spaceOccupancyRate, 0) / entries.length,
      alerts: entries.flatMap(e => e.alerts)
    };
  }

  private calculateTrafficDataSummary(data: TrafficData): TrafficDataSummary {
    return {
      totalFlowRate: data.totalFlow,
      averageSpeed: data.averageSpeed,
      trafficDensity: data.trafficDensity,
      occupancyRate: data.laneSpaceOccupancy,
      maxQueueLength: data.maxQueueLength,
      flowRatePerHour: (data.totalFlow / data.statisticalPeriod) * 3600
    };
  }

  private calculateRegionDataSummary(data: RegionData): RegionDataSummary {
    return {
      dominantMovement: this.getDominantMovement(data),
      turnDistribution: {
        left: data.leftTurnPercent,
        straight: data.straightPercent,
        right: data.rightTurnPercent
      },
      totalPercentage: data.leftTurnPercent + data.straightPercent + data.rightTurnPercent
    };
  }

  private getDominantMovement(data: RegionData): string {
    const max = Math.max(data.leftTurnPercent, data.straightPercent, data.rightTurnPercent);
    if (max === data.leftTurnPercent) return 'left';
    if (max === data.straightPercent) return 'straight';
    return 'right';
  }

  private countVehicleTypes(types: string[]): { [key: string]: number } {
    return types.reduce((count, type) => {
      count[type] = (count[type] || 0) + 1;
      return count;
    }, {} as { [key: string]: number });
  }
}

// Processed data types
export interface ProcessedObjectData {
  deviceId: string;
  timestamp: Date;
  numEntries: number;
  entries: ProcessedVehicleEntry[];
  packetSize: number;
  summary: ObjectDataSummary;
  frameType: '0x01';
}

export interface ProcessedVehicleEntry extends VehicleEntry {
  vehicleTypeName: string;
  speedKmh: number;
  position: { x: number; y: number };
  movement: { xSpeed: number; ySpeed: number; acceleration: number };
  dimensions: { length: number; width: number; height: number };
}

export interface ProcessedLaneStatus {
  deviceId: string;
  timestamp: Date;
  numEntries: number;
  entries: ProcessedLaneEntry[];
  packetSize: number;
  summary: LaneStatusSummary;
}

export interface ProcessedLaneEntry extends LaneEntry {
  laneName: string;
  queueStatus: string;
  trafficFlow: string;
  alerts: string[];
}

export interface ProcessedPassData {
  deviceId: string;
  timestamp: Date;
  laneNumber: number;
  crossSectionPosition: number;
  crossSectionSpeed: number;
  headwayTime: number;
  occupancyDuration: number;
  occupancyStatus: string;
  vehicleType: string;
}

export interface ProcessedTrafficData {
  deviceId: string;
  timestamp: Date;
  statisticalPeriod: number;
  targetLane: number;
  monitoringLocation: number;
  vehicleFlows: any;
  totalFlow: number;
  averageSpeed: number;
  headwayTime: number;
  virtualLoopOccupancy: number;
  maxQueueLength: number;
  laneSpaceOccupancy: number;
  vehicleSpacing: number;
  trafficDensity: number;
  summary: TrafficDataSummary;
}

export interface ProcessedRegionData {
  deviceId: string;
  timestamp: Date;
  statisticalPeriod: number;
  direction: number;
  leftTurnPercent: number;
  straightPercent: number;
  rightTurnPercent: number;
  summary: RegionDataSummary;
}

// Summary types
export interface ObjectDataSummary {
  totalVehicles: number;
  averageSpeed: number;
  maxSpeed: number;
  vehicleTypeCounts: { [key: string]: number };
  lanes: number[];
  stationaryVehicles: number;
}

export interface LaneStatusSummary {
  totalLanes: number;
  lanesWithQueues: number;
  averageQueueLength: number;
  totalVehiclesOnline: number;
  averageOccupancyRate: number;
  alerts: string[];
}

export interface TrafficDataSummary {
  totalFlowRate: number;
  averageSpeed: number;
  trafficDensity: number;
  occupancyRate: number;
  maxQueueLength: number;
  flowRatePerHour: number;
}

export interface RegionDataSummary {
  dominantMovement: string;
  turnDistribution: { left: number; straight: number; right: number };
  totalPercentage: number;
}
