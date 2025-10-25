// Radar Data Types based on ClairWav-T80 Protocol V2.1

export interface ObjectData {
  deviceId: string;
  frameType: '0x01';
  timestamp: string;
  numEntries: number;
  entries: VehicleEntry[];
  packetSize: number;
}

export interface VehicleEntry {
  targetId: string;
  laneNo: number;
  targetType: number;
  color: number;
  plateNumber: string;
  xCoordM: number;
  yCoordM: number;
  speedKmh: number;
  azimuthDeg: number;
  longitude: number;
  latitude: number;
  imageX: number;
  imageY: number;
  vehicleLength: number;
  vehicleWidth: number;
  vehicleHeight: number;
  parkingStatus: boolean;
  xSpeed: number;
  ySpeed: number;
  acceleration: number;
}

export interface LaneStatus {
  frameType: '0x04';
  frameTypeName: string;
  deviceId: string;
  timestamp: string;
  numEntries: number;
  entriesDecoded: number;
  entries: LaneEntry[];
  packetSize: number;
}

export interface LaneEntry {
  entryIndex: number;
  lane: {
    number: number;
    description: string;
  };
  queue: {
    length: number;
    head: number;
    tail: number;
    vehicleCount: number;
    exceedsLimit: boolean;
    overflow: boolean;
  };
  vehicleSpacing: number;
  vehiclesOnline: number;
  speeds: {
    average: number;
    percentile85: number;
    leadVehicle: number;
    trailingVehicle: number;
  };
  positions: {
    leadVehicle: number | null;
    trailingVehicle: number | null;
  };
  spaceOccupancyRate: number;
  reserved: number;
}

export interface PassData {
  frameType: '0x05';
  deviceId: string;
  timestamp: string;
  laneNumber: number;
  crossSectionPosition: number;
  crossSectionSpeed: number;
  headwayTime: number;
  passingTime: string;
  occupancyDuration: number;
  occupancyStatus: number;
  vehicleType: number;
}

export interface TrafficData {
  frameType: '0x03';
  deviceId: string;
  timestamp: string;
  statisticalPeriod: number;
  targetLane: number;
  monitoringLocation: number;
  vehicleFlows: {
    bicycle: number;
    motorcycle: number;
    tricycle: number;
    bus: number;
    van: number;
    car: number;
    suv: number;
    largeTruck: number;
    mediumTruck: number;
    lightTruck: number;
    dangerousGoods: number;
    engineeringVehicle: number;
    pedestrian: number;
  };
  totalFlow: number;
  averageSpeed: number;
  headwayTime: number;
  virtualLoopOccupancy: number;
  maxQueueLength: number;
  laneSpaceOccupancy: number;
  vehicleSpacing: number;
  trafficDensity: number;
}

export interface RegionData {
  frameType: '0x02';
  deviceId: string;
  timestamp: string;
  statisticalPeriod: number;
  direction: number;
  leftTurnPercent: number;
  straightPercent: number;
  rightTurnPercent: number;
}

// Vehicle Classification Types
export enum VehicleType {
  CAR = 1,
  VAN = 2,
  SUV = 3,
  TRUCK = 4,
  BICYCLE = 5,
  MOTORCYCLE = 6,
  BUS = 7,
  LARGE_TRUCK = 8,
  MEDIUM_TRUCK = 9,
  LIGHT_TRUCK = 10,
  DANGEROUS_GOODS = 11,
  ENGINEERING_VEHICLE = 12,
  PEDESTRIAN = 13
}

// Lane Configuration
export const LANE_CONFIG = {
  11: 'Upstream Lane 1 (Inner to Outer)',
  12: 'Upstream Lane 2 (Inner to Outer)', 
  13: 'Upstream Lane 3 (Inner to Outer)',
  485: 'Unknown Lane Configuration'
} as const;

export type LaneNumber = keyof typeof LANE_CONFIG;

// Processed Data Types
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
