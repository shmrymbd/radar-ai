/**
 * Device Sync Service
 * Handles synchronization between frontend, backend, and WebSocket when device selection changes
 */

export interface DeviceSyncResult {
  success: boolean;
  backend?: boolean;
  websocket?: boolean;
  error?: string;
  timestamp: string;
}

export interface DeviceSyncOptions {
  timeout?: number;
  retries?: number;
  validateBackend?: boolean;
  validateWebSocket?: boolean;
}

export class DeviceSyncService {
  private static instance: DeviceSyncService;
  private syncInProgress: Set<string> = new Set();

  public static getInstance(): DeviceSyncService {
    if (!DeviceSyncService.instance) {
      DeviceSyncService.instance = new DeviceSyncService();
    }
    return DeviceSyncService.instance;
  }

  /**
   * Sync device selection across all systems
   */
  public async syncDevice(
    deviceId: string, 
    options: DeviceSyncOptions = {}
  ): Promise<DeviceSyncResult> {
    const {
      timeout = 5000,
      retries = 3,
      validateBackend = true,
      validateWebSocket = true
    } = options;

    // Prevent concurrent syncs for the same device
    if (this.syncInProgress.has(deviceId)) {
      console.log(`🔄 Device sync already in progress for: ${deviceId}`);
      return {
        success: false,
        error: 'Sync already in progress',
        timestamp: new Date().toISOString()
      };
    }

    this.syncInProgress.add(deviceId);
    const startTime = Date.now();

    try {
      console.log(`🔄 Starting device sync for: ${deviceId}`);
      
      const results = await Promise.allSettled([
        validateBackend ? this.syncBackend(deviceId, timeout, retries) : Promise.resolve(true),
        validateWebSocket ? this.syncWebSocket(deviceId, timeout) : Promise.resolve(true)
      ]);

      const [backendResult, websocketResult] = results;
      const backendSuccess = backendResult.status === 'fulfilled' && backendResult.value;
      const websocketSuccess = websocketResult.status === 'fulfilled' && websocketResult.value;

      const success = backendSuccess && websocketSuccess;
      const duration = Date.now() - startTime;

      console.log(`✅ Device sync completed for ${deviceId} in ${duration}ms`, {
        backend: backendSuccess,
        websocket: websocketSuccess
      });

      return {
        success,
        backend: backendSuccess,
        websocket: websocketSuccess,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Device sync failed for ${deviceId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    } finally {
      this.syncInProgress.delete(deviceId);
    }
  }

  /**
   * Sync with backend API
   */
  private async syncBackend(
    deviceId: string, 
    timeout: number, 
    retries: number
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📡 Backend sync attempt ${attempt}/${retries} for device: ${deviceId}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`/api/dashboard?device=${deviceId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Backend sync failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Backend sync successful for device: ${deviceId}`, data);
        return true;

      } catch (error) {
        console.error(`❌ Backend sync attempt ${attempt} failed for device: ${deviceId}`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return false;
  }

  /**
   * Sync with WebSocket
   */
  private async syncWebSocket(deviceId: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log(`🔌 WebSocket sync for device: ${deviceId}`);
        
        // Dispatch device change event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('deviceChanged', {
            detail: { 
              deviceId, 
              timestamp: new Date().toISOString(),
              source: 'device-sync-service'
            }
          }));
        }

        // For now, assume WebSocket sync is successful if we can dispatch the event
        // The actual WebSocket connection will be handled by the DashboardOverview component
        console.log(`✅ WebSocket sync initiated for device: ${deviceId}`);
        resolve(true);

      } catch (error) {
        console.error(`❌ WebSocket sync failed for device: ${deviceId}`, error);
        resolve(false);
      }
    });
  }

  /**
   * Check if sync is in progress for a device
   */
  public isSyncInProgress(deviceId: string): boolean {
    return this.syncInProgress.has(deviceId);
  }

  /**
   * Get sync status for all devices
   */
  public getSyncStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.syncInProgress.forEach(deviceId => {
      status[deviceId] = true;
    });
    return status;
  }
}
