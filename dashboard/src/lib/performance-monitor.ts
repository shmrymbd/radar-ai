/**
 * Performance monitoring for API endpoints
 */

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: number;
  statusCode: number;
  cached?: boolean;
  error?: boolean;
}

interface AggregatedMetrics {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  requestsPerMinute: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[];
  private maxMetrics: number;

  constructor(maxMetrics: number = 10000) {
    this.metrics = [];
    this.maxMetrics = maxMetrics;

    // Cleanup old metrics every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * Record a request metric
   */
  public recordRequest(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    options?: { cached?: boolean; error?: boolean }
  ): void {
    const metric: PerformanceMetric = {
      endpoint,
      method,
      duration,
      timestamp: Date.now(),
      statusCode,
      cached: options?.cached,
      error: options?.error
    };

    this.metrics.push(metric);

    // Trim if exceeded max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get aggregated metrics for an endpoint
   */
  public getEndpointMetrics(endpoint: string, timeWindowMs?: number): AggregatedMetrics | null {
    const now = Date.now();
    const cutoff = timeWindowMs ? now - timeWindowMs : 0;

    const endpointMetrics = this.metrics.filter(
      m => m.endpoint === endpoint && m.timestamp > cutoff
    );

    if (endpointMetrics.length === 0) {
      return null;
    }

    const durations = endpointMetrics.map(m => m.duration).sort((a, b) => a - b);
    const totalRequests = endpointMetrics.length;
    const successfulRequests = endpointMetrics.filter(m => !m.error && m.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const cachedRequests = endpointMetrics.filter(m => m.cached).length;

    const sum = durations.reduce((a, b) => a + b, 0);
    const averageDuration = sum / totalRequests;

    const p50Index = Math.floor(totalRequests * 0.5);
    const p95Index = Math.floor(totalRequests * 0.95);
    const p99Index = Math.floor(totalRequests * 0.99);

    const timeRangeMinutes = timeWindowMs ? timeWindowMs / (60 * 1000) :
      (now - endpointMetrics[0].timestamp) / (60 * 1000);

    return {
      endpoint,
      totalRequests,
      successfulRequests,
      failedRequests,
      cachedRequests,
      averageDuration,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: durations[p50Index],
      p95Duration: durations[p95Index],
      p99Duration: durations[p99Index],
      requestsPerMinute: totalRequests / Math.max(timeRangeMinutes, 1)
    };
  }

  /**
   * Get all endpoints metrics
   */
  public getAllMetrics(timeWindowMs?: number): AggregatedMetrics[] {
    const endpoints = new Set(this.metrics.map(m => m.endpoint));
    const results: AggregatedMetrics[] = [];

    for (const endpoint of endpoints) {
      const metrics = this.getEndpointMetrics(endpoint, timeWindowMs);
      if (metrics) {
        results.push(metrics);
      }
    }

    return results.sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * Get slow requests (above threshold)
   */
  public getSlowRequests(thresholdMs: number = 1000, limit: number = 50): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration > thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get error requests
   */
  public getErrors(limit: number = 50): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.error || m.statusCode >= 400)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clean up old metrics (older than 1 hour)
   */
  private cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const beforeCount = this.metrics.length;

    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);

    const removed = beforeCount - this.metrics.length;
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old performance metrics`);
    }
  }

  /**
   * Get overall statistics
   */
  public getOverallStats(): {
    totalMetrics: number;
    uniqueEndpoints: number;
    averageResponseTime: number;
    successRate: number;
    cacheHitRate: number;
    errorRate: number;
  } {
    const total = this.metrics.length;

    if (total === 0) {
      return {
        totalMetrics: 0,
        uniqueEndpoints: 0,
        averageResponseTime: 0,
        successRate: 0,
        cacheHitRate: 0,
        errorRate: 0
      };
    }

    const uniqueEndpoints = new Set(this.metrics.map(m => m.endpoint)).size;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const successful = this.metrics.filter(m => !m.error && m.statusCode < 400).length;
    const cached = this.metrics.filter(m => m.cached).length;
    const errors = this.metrics.filter(m => m.error || m.statusCode >= 400).length;

    return {
      totalMetrics: total,
      uniqueEndpoints,
      averageResponseTime: totalDuration / total,
      successRate: (successful / total) * 100,
      cacheHitRate: (cached / total) * 100,
      errorRate: (errors / total) * 100
    };
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

/**
 * Middleware helper to measure API performance
 */
export function measurePerformance<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>,
  options?: { cached?: boolean }
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const startTime = Date.now();

  return fn()
    .then(result => {
      const duration = Date.now() - startTime;
      monitor.recordRequest(endpoint, method, duration, 200, { cached: options?.cached });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      monitor.recordRequest(endpoint, method, duration, 500, { error: true });
      throw error;
    });
}
