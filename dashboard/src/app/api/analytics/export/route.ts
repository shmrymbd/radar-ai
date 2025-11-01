import { NextRequest, NextResponse } from 'next/server';
import { ClassificationProcessor } from '@/lib/classification-processor';
import { AnalyticsProcessor } from '@/lib/analytics-processor';
import * as XLSX from 'xlsx';

/**
 * GET /api/analytics/export - Export analytics data in various formats
 * Query params:
 * - deviceId: string (default: 'P1-center')
 * - format: 'csv' | 'json' | 'excel' | 'pdf' (default: 'json')
 * - includeKPIs: boolean (default: false) - Include advanced KPIs
 * - includeAnomalies: boolean (default: false) - Include anomaly detection
 * - includePatterns: boolean (default: false) - Include traffic patterns
 *
 * Returns:
 * - CSV: text/csv
 * - JSON: application/json
 * - Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 * - PDF: application/pdf
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'P1-center';
    const format = searchParams.get('format') || 'json';
    const includeKPIs = searchParams.get('includeKPIs') === 'true';
    const includeAnomalies = searchParams.get('includeAnomalies') === 'true';
    const includePatterns = searchParams.get('includePatterns') === 'true';

    const classificationProcessor = ClassificationProcessor.getInstance();
    const analyticsProcessor = AnalyticsProcessor.getInstance();

    // Get base data
    const metrics = classificationProcessor.getClassificationMetrics(deviceId);
    const summary = classificationProcessor.getClassificationSummary(deviceId);

    const exportData: any = {
      deviceId,
      timestamp: new Date().toISOString(),
      summary,
      metrics
    };

    // Add advanced KPIs if requested
    if (includeKPIs) {
      const kpis = analyticsProcessor.calculateAdvancedKPIs(deviceId);
      exportData.advancedKPIs = {
        intersectionEfficiency: {
          overall: kpis.intersectionEfficiency.overall,
          byVehicleType: Object.fromEntries(kpis.intersectionEfficiency.byVehicleType),
          throughputRate: kpis.intersectionEfficiency.throughputRate,
          peakCapacityUtilization: kpis.intersectionEfficiency.peakCapacityUtilization
        },
        laneUtilization: {
          efficiency: Object.fromEntries(kpis.laneUtilization.efficiency),
          balanceScore: kpis.laneUtilization.balanceScore,
          underutilizedLanes: kpis.laneUtilization.underutilizedLanes,
          overutilizedLanes: kpis.laneUtilization.overutilizedLanes,
          recommendations: kpis.laneUtilization.recommendations
        },
        speedCompliance: {
          overallRate: kpis.speedCompliance.overallRate,
          byVehicleType: Object.fromEntries(kpis.speedCompliance.byVehicleType),
          violations: {
            count: kpis.speedCompliance.violations.count,
            percentage: kpis.speedCompliance.violations.percentage,
            severityDistribution: Object.fromEntries(kpis.speedCompliance.violations.severityDistribution)
          }
        }
      };
    }

    // Add anomaly detection if requested
    if (includeAnomalies) {
      const detection = analyticsProcessor.detectAnomalies(deviceId);
      exportData.anomalyDetection = {
        anomalies: detection.anomalies.map(a => ({
          ...a,
          timestamp: a.timestamp.toISOString()
        })),
        baseline: {
          volumeRange: detection.baseline.volumeRange,
          speedRange: detection.baseline.speedRange,
          vehicleTypeMix: Object.fromEntries(detection.baseline.vehicleTypeMix)
        }
      };
    }

    // Add traffic patterns if requested
    if (includePatterns) {
      const patterns = analyticsProcessor.recognizeTrafficPatterns(deviceId);
      const dayOfWeekPatternsObj: any = {};
      patterns.dayOfWeekPatterns.forEach((data, day) => {
        dayOfWeekPatternsObj[day] = {
          averageVolume: data.averageVolume,
          peakHour: data.peakHour,
          vehicleTypeMix: Object.fromEntries(data.vehicleTypeMix)
        };
      });
      exportData.trafficPatterns = {
        peakHours: patterns.peakHours,
        dayOfWeekPatterns: dayOfWeekPatternsObj,
        seasonalTrends: patterns.seasonalTrends
      };
    }

    // Format response based on requested format
    switch (format.toLowerCase()) {
      case 'csv':
        return generateCSVResponse(exportData);

      case 'excel':
        return generateExcelResponse(exportData);

      case 'pdf':
        // For now, return JSON with note that PDF generation requires additional dependencies
        return NextResponse.json({
          success: false,
          error: 'PDF export requires additional dependencies (jspdf, jspdf-autotable)',
          note: 'Please install PDF packages: npm install jspdf jspdf-autotable',
          data: exportData,
          timestamp: new Date().toISOString()
        }, { status: 501 });

      case 'json':
      default:
        return NextResponse.json({
          success: true,
          data: exportData,
          format: 'json',
          timestamp: new Date().toISOString()
        });
    }

  } catch (error: any) {
    console.error('Error exporting analytics data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export analytics data',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Generate CSV response from export data
 */
function generateCSVResponse(exportData: any): NextResponse {
  const summary = exportData.summary;
  const metrics = exportData.metrics;

  // Build CSV content
  let csv = 'Traffic Analytics Export\n\n';
  csv += `Device ID:,${exportData.deviceId}\n`;
  csv += `Export Time:,${exportData.timestamp}\n\n`;

  // Summary section
  csv += 'SUMMARY STATISTICS\n';
  csv += `Total Vehicles:,${summary.totalVehicles || 0}\n`;
  csv += `Average Speed:,${summary.averageSpeed || 0} km/h\n`;
  csv += `Most Common Vehicle Type:,${summary.mostCommonVehicleType || 'N/A'}\n\n`;

  // Vehicle type counts
  csv += 'VEHICLE TYPE DISTRIBUTION\n';
  csv += 'Type,Count,Percentage\n';
  Object.entries(summary.vehicleTypeCounts || {}).forEach(([type, count]) => {
    const percentage = summary.totalVehicles > 0 ? ((count as number) / summary.totalVehicles) * 100 : 0;
    csv += `${type},${count},${percentage.toFixed(2)}%\n`;
  });
  csv += '\n';

  // Speed analysis
  csv += 'SPEED ANALYSIS BY VEHICLE TYPE\n';
  csv += 'Type,Count,Average Speed,Min Speed,Max Speed\n';
  Object.entries(metrics.speedByType || {}).forEach(([type, data]: [string, any]) => {
    csv += `${type},${data.count},${data.average.toFixed(2)},${data.min.toFixed(2)},${data.max.toFixed(2)}\n`;
  });
  csv += '\n';

  // Lane utilization
  csv += 'LANE UTILIZATION\n';
  csv += 'Lane,Count,Percentage\n';
  Object.entries(metrics.laneUtilization || {}).forEach(([lane, data]: [string, any]) => {
    csv += `${lane},${data.count},${data.percentage.toFixed(2)}%\n`;
  });
  csv += '\n';

  // Advanced KPIs if included
  if (exportData.advancedKPIs) {
    const kpis = exportData.advancedKPIs;

    csv += 'ADVANCED KPIs\n';
    csv += `Intersection Efficiency Score:,${kpis.intersectionEfficiency.overall}/100\n`;
    csv += `Throughput Rate:,${kpis.intersectionEfficiency.throughputRate} vehicles/hour\n`;
    csv += `Lane Balance Score:,${kpis.laneUtilization.balanceScore}/100\n`;
    csv += `Speed Compliance Rate:,${kpis.speedCompliance.overallRate}%\n\n`;

    if (kpis.laneUtilization.recommendations.length > 0) {
      csv += 'RECOMMENDATIONS\n';
      kpis.laneUtilization.recommendations.forEach((rec: string) => {
        csv += `- ${rec}\n`;
      });
      csv += '\n';
    }
  }

  // Anomalies if included
  if (exportData.anomalyDetection && exportData.anomalyDetection.anomalies.length > 0) {
    csv += 'DETECTED ANOMALIES\n';
    csv += 'Type,Severity,Description,Expected,Actual,Deviation\n';
    exportData.anomalyDetection.anomalies.forEach((anomaly: any) => {
      csv += `${anomaly.type},${anomaly.severity},"${anomaly.description}",${anomaly.metrics.expected},${anomaly.metrics.actual},${anomaly.metrics.deviation.toFixed(2)}%\n`;
    });
    csv += '\n';
  }

  // Return CSV response
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="traffic-analytics-${exportData.deviceId}-${Date.now()}.csv"`
    }
  });
}

/**
 * Generate Excel response from export data
 */
function generateExcelResponse(exportData: any): NextResponse {
  const summary = exportData.summary;
  const metrics = exportData.metrics;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ['Traffic Analytics Export'],
    [],
    ['Device ID', exportData.deviceId],
    ['Export Time', exportData.timestamp],
    [],
    ['SUMMARY STATISTICS'],
    ['Total Vehicles', summary.totalVehicles || 0],
    ['Average Speed', `${summary.averageSpeed || 0} km/h`],
    ['Most Common Vehicle Type', summary.mostCommonVehicleType || 'N/A'],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Sheet 2: Vehicle Type Distribution
  const vehicleTypeData: (string | number)[][] = [['Vehicle Type', 'Count', 'Percentage']];
  (summary.trafficComposition || []).forEach((item: any) => {
    const vehicleType = item.vehicleType || item.type || 'unknown';
    const count = item.count || 0;
    const percentage = item.percentage || (summary.totalVehicles > 0 ? (count / summary.totalVehicles) * 100 : 0);
    vehicleTypeData.push([vehicleType, count, `${percentage.toFixed(2)}%`]);
  });
  const vehicleTypeSheet = XLSX.utils.aoa_to_sheet(vehicleTypeData);
  XLSX.utils.book_append_sheet(workbook, vehicleTypeSheet, 'Vehicle Types');

  // Sheet 3: Speed Analysis
  const speedData = [
    ['Speed Analysis'],
    [],
    ['Category', 'Count', 'Percentage'],
    ['Overspeeding', metrics.overspeedingCount || 0, `${metrics.overspeedingPercentage || 0}%`],
    ['Within Limit', metrics.normalSpeedCount || 0, `${metrics.normalSpeedPercentage || 0}%`],
    ['Under Speed Limit', metrics.underSpeedCount || 0, `${metrics.underSpeedPercentage || 0}%`],
  ];
  const speedSheet = XLSX.utils.aoa_to_sheet(speedData);
  XLSX.utils.book_append_sheet(workbook, speedSheet, 'Speed Analysis');

  // Sheet 4: Advanced KPIs (if included)
  if (exportData.advancedKPIs) {
    const kpis = exportData.advancedKPIs;
    const kpiData = [
      ['Advanced Performance Indicators'],
      [],
      ['Metric', 'Value'],
      ['Intersection Efficiency', `${kpis.intersectionEfficiency.overall}/100`],
      ['Throughput Rate', `${kpis.intersectionEfficiency.throughputRate} vehicles/hour`],
      ['Peak Capacity Utilization', `${kpis.intersectionEfficiency.peakCapacityUtilization}%`],
      ['Lane Balance Score', `${kpis.laneUtilization.balanceScore}/100`],
      ['Speed Compliance Rate', `${kpis.speedCompliance.overallRate}%`],
      [],
      ['Recommendations'],
    ];
    kpis.laneUtilization.recommendations.forEach((rec: string) => {
      kpiData.push([rec]);
    });
    const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(workbook, kpiSheet, 'Advanced KPIs');
  }

  // Sheet 5: Anomalies (if included)
  if (exportData.anomalyDetection && exportData.anomalyDetection.anomalies.length > 0) {
    const anomalyData = [['Type', 'Severity', 'Description', 'Expected', 'Actual', 'Deviation']];
    exportData.anomalyDetection.anomalies.forEach((anomaly: any) => {
      anomalyData.push([
        anomaly.type,
        anomaly.severity,
        anomaly.description,
        anomaly.metrics.expected,
        anomaly.metrics.actual,
        `${anomaly.metrics.deviation.toFixed(2)}%`
      ]);
    });
    const anomalySheet = XLSX.utils.aoa_to_sheet(anomalyData);
    XLSX.utils.book_append_sheet(workbook, anomalySheet, 'Anomalies');
  }

  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // Return Excel response
  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="traffic-analytics-${exportData.deviceId}-${Date.now()}.xlsx"`
    }
  });
}
