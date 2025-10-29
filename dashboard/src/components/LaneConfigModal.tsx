'use client';

import { useState, useEffect } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import {
  LaneConfig,
  LaneDirection,
  DEFAULT_LANE_THRESHOLDS,
  DEFAULT_LANE_ALERTS,
  DEFAULT_DISPLAY_OPTIONS,
  DEFAULT_LANE_DIRECTION
} from '@/types/lane-config';

interface LaneConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  lanes: number[];  // Array of lane numbers detected from data
}

export default function LaneConfigModal({ isOpen, onClose, lanes }: LaneConfigModalProps) {
  const { selectedDevice } = useDevice();
  const [laneConfigs, setLaneConfigs] = useState<LaneConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedLaneIndex, setSelectedLaneIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'basic' | 'thresholds' | 'alerts' | 'display'>('basic');

  // Fetch existing lane configuration when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLaneConfig();
    }
  }, [isOpen, selectedDevice.id]);

  const fetchLaneConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/lane-config?device=${selectedDevice.id}`);
      const result = await response.json();

      if (result.success && result.data) {
        // Use existing configuration and ensure all lanes have required fields
        const enrichedLanes = result.data.lanes.map((lane: any) => ({
          laneNumber: lane.laneNumber,
          customName: lane.customName || `Lane ${lane.laneNumber}`,
          enabled: lane.enabled !== undefined ? lane.enabled : true,
          direction: lane.direction || DEFAULT_LANE_DIRECTION,
          thresholds: lane.thresholds || { ...DEFAULT_LANE_THRESHOLDS },
          alerts: lane.alerts || { ...DEFAULT_LANE_ALERTS },
          displayOptions: lane.displayOptions || { ...DEFAULT_DISPLAY_OPTIONS }
        }));
        setLaneConfigs(enrichedLanes);
      } else {
        // Create default configuration from detected lanes
        const defaultConfigs: LaneConfig[] = lanes.map(num => ({
          laneNumber: num,
          customName: `Lane ${num}`,
          enabled: true,
          direction: DEFAULT_LANE_DIRECTION,
          thresholds: { ...DEFAULT_LANE_THRESHOLDS },
          alerts: { ...DEFAULT_LANE_ALERTS },
          displayOptions: { ...DEFAULT_DISPLAY_OPTIONS }
        }));
        setLaneConfigs(defaultConfigs);
      }
    } catch (err) {
      console.error('Error fetching lane config:', err);
      // Fallback to default configs
      const defaultConfigs: LaneConfig[] = lanes.map(num => ({
        laneNumber: num,
        customName: `Lane ${num}`,
        enabled: true,
        direction: DEFAULT_LANE_DIRECTION,
        thresholds: { ...DEFAULT_LANE_THRESHOLDS },
        alerts: { ...DEFAULT_LANE_ALERTS },
        displayOptions: { ...DEFAULT_DISPLAY_OPTIONS }
      }));
      setLaneConfigs(defaultConfigs);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate all lanes have required fields before sending
      const validatedLanes = laneConfigs.map(lane => ({
        laneNumber: lane.laneNumber,
        customName: lane.customName || `Lane ${lane.laneNumber}`,
        enabled: lane.enabled !== undefined ? lane.enabled : true,
        direction: lane.direction || DEFAULT_LANE_DIRECTION,
        thresholds: lane.thresholds || { ...DEFAULT_LANE_THRESHOLDS },
        alerts: lane.alerts || { ...DEFAULT_LANE_ALERTS },
        displayOptions: lane.displayOptions || { ...DEFAULT_DISPLAY_OPTIONS }
      }));

      console.log('Saving lane configuration:', {
        deviceId: selectedDevice.id,
        laneCount: validatedLanes.length,
        lanes: validatedLanes
      });

      const response = await fetch('/api/lane-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: selectedDevice.id,
          lanes: validatedLanes
        })
      });

      const result = await response.json();
      console.log('Save response:', result);

      if (result.success) {
        setSuccessMessage('Lane configuration saved successfully!');
        setTimeout(() => {
          onClose();
          // Refresh the page to show updated settings
          window.location.reload();
        }, 1500);
      } else {
        const errorMsg = result.error || 'Failed to save configuration';
        console.error('Save failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Error saving lane config:', err);
      setError(`Failed to save configuration. Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const updateLaneConfig = (index: number, updates: Partial<LaneConfig>) => {
    setLaneConfigs(prev =>
      prev.map((config, i) =>
        i === index ? { ...config, ...updates } : config
      )
    );
  };

  if (!isOpen) return null;

  const selectedLane = laneConfigs[selectedLaneIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Configure Lanes</h2>
              <p className="text-sm text-blue-100 mt-1">
                Device: {selectedDevice.name} ({selectedDevice.id})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {loading ? (
            <div className="flex items-center justify-center py-12 w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Lane List Sidebar */}
              <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Lanes</h3>
                  <div className="space-y-2">
                    {laneConfigs
                      .sort((a, b) => a.laneNumber - b.laneNumber)
                      .map((config) => {
                        // Find the real index in the unsorted array
                        const realIndex = laneConfigs.findIndex(c => c.laneNumber === config.laneNumber);
                        return (
                        <button
                          key={config.laneNumber}
                          onClick={() => setSelectedLaneIndex(realIndex)}
                          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                            selectedLaneIndex === realIndex
                              ? 'bg-blue-600 text-white'
                              : 'bg-white hover:bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-sm">
                                {config.direction === 'incoming' ? '⬇️' : '⬆️'}
                              </span>
                              <div>
                                <div className="font-medium text-sm">
                                  {config.customName || `Lane ${config.laneNumber}`}
                                </div>
                                <div className={`text-xs ${selectedLaneIndex === realIndex ? 'text-blue-100' : 'text-gray-500'}`}>
                                  #{config.laneNumber} • {config.direction}
                                </div>
                              </div>
                            </div>
                            {config.enabled ? (
                              <span className="text-xs text-green-600">✓</span>
                            ) : (
                              <span className="text-xs text-gray-400">○</span>
                            )}
                          </div>
                        </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Settings Panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="border-b border-gray-200 bg-white">
                  <div className="flex px-6">
                    <button
                      onClick={() => setActiveTab('basic')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'basic'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Basic
                    </button>
                    <button
                      onClick={() => setActiveTab('thresholds')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'thresholds'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Thresholds
                    </button>
                    <button
                      onClick={() => setActiveTab('alerts')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'alerts'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Alerts
                    </button>
                    <button
                      onClick={() => setActiveTab('display')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'display'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Display
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedLane && (
                    <>
                      {/* Basic Tab */}
                      {activeTab === 'basic' && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Basic Settings - Lane {selectedLane.laneNumber}
                            </h3>

                            {/* Custom Name */}
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Custom Name
                              </label>
                              <input
                                type="text"
                                value={selectedLane.customName}
                                onChange={(e) => updateLaneConfig(selectedLaneIndex, { customName: e.target.value })}
                                placeholder={`Lane ${selectedLane.laneNumber}`}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                maxLength={50}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Give this lane a meaningful name (e.g., "North Entrance", "Exit Ramp A")
                              </p>
                            </div>

                            {/* Lane Direction */}
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Traffic Direction
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => updateLaneConfig(selectedLaneIndex, { direction: 'incoming' })}
                                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                                    selectedLane.direction === 'incoming'
                                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="flex flex-col items-center">
                                    <span className="text-2xl mb-1">⬇️</span>
                                    <span className="text-sm">Incoming</span>
                                  </div>
                                </button>
                                <button
                                  onClick={() => updateLaneConfig(selectedLaneIndex, { direction: 'outgoing' })}
                                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                                    selectedLane.direction === 'outgoing'
                                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="flex flex-col items-center">
                                    <span className="text-2xl mb-1">⬆️</span>
                                    <span className="text-sm">Outgoing</span>
                                  </div>
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                Incoming: Traffic entering the intersection | Outgoing: Traffic leaving the intersection
                              </p>
                            </div>

                            {/* Enabled Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium text-gray-900">Enable Lane</div>
                                <p className="text-sm text-gray-500">Show this lane in the dashboard</p>
                              </div>
                              <button
                                onClick={() => updateLaneConfig(selectedLaneIndex, { enabled: !selectedLane.enabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedLane.enabled ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedLane.enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Thresholds Tab */}
                      {activeTab === 'thresholds' && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Thresholds - {selectedLane.customName}
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                              Configure when this lane triggers alerts and status changes
                            </p>

                            {/* Queue Length Threshold */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Queue Length Threshold (meters)
                              </label>
                              <input
                                type="number"
                                value={selectedLane.thresholds.queueLength}
                                onChange={(e) => updateLaneConfig(selectedLaneIndex, {
                                  thresholds: { ...selectedLane.thresholds, queueLength: parseFloat(e.target.value) }
                                })}
                                min="0"
                                step="0.5"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Above this value, lane shows as "Queued" (red badge)
                              </p>
                            </div>

                            {/* Speed Thresholds */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Speed Thresholds (km/h)
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Low Speed Alert</label>
                                  <input
                                    type="number"
                                    value={selectedLane.thresholds.speedLow}
                                    onChange={(e) => updateLaneConfig(selectedLaneIndex, {
                                      thresholds: { ...selectedLane.thresholds, speedLow: parseFloat(e.target.value) }
                                    })}
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">High Speed Alert</label>
                                  <input
                                    type="number"
                                    value={selectedLane.thresholds.speedHigh}
                                    onChange={(e) => updateLaneConfig(selectedLaneIndex, {
                                      thresholds: { ...selectedLane.thresholds, speedHigh: parseFloat(e.target.value) }
                                    })}
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                Alerts trigger when speed is below low or above high threshold
                              </p>
                            </div>

                            {/* Occupancy Threshold */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Occupancy High Threshold (%)
                              </label>
                              <input
                                type="number"
                                value={selectedLane.thresholds.occupancyHigh}
                                onChange={(e) => updateLaneConfig(selectedLaneIndex, {
                                  thresholds: { ...selectedLane.thresholds, occupancyHigh: parseFloat(e.target.value) }
                                })}
                                min="0"
                                max="100"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Alert when occupancy exceeds this percentage
                              </p>
                            </div>

                            {/* Vehicle Count Threshold */}
                            <div className="bg-gray-50 rounded-lg p-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vehicle Count High Threshold
                              </label>
                              <input
                                type="number"
                                value={selectedLane.thresholds.vehicleCountHigh}
                                onChange={(e) => updateLaneConfig(selectedLaneIndex, {
                                  thresholds: { ...selectedLane.thresholds, vehicleCountHigh: parseInt(e.target.value) }
                                })}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Alert when vehicle count exceeds this number
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Alerts Tab */}
                      {activeTab === 'alerts' && (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Alert Settings - {selectedLane.customName}
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                              Enable or disable specific alerts for this lane
                            </p>

                            {/* Queue Alert */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
                              <div>
                                <div className="font-medium text-gray-900">Queue Alert</div>
                                <p className="text-sm text-gray-500">Alert when queue exceeds threshold</p>
                              </div>
                              <button
                                onClick={() => updateLaneConfig(selectedLaneIndex, {
                                  alerts: { ...selectedLane.alerts, enableQueueAlert: !selectedLane.alerts.enableQueueAlert }
                                })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedLane.alerts.enableQueueAlert ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedLane.alerts.enableQueueAlert ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Speed Alert */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
                              <div>
                                <div className="font-medium text-gray-900">Speed Alert</div>
                                <p className="text-sm text-gray-500">Alert on abnormal speeds</p>
                              </div>
                              <button
                                onClick={() => updateLaneConfig(selectedLaneIndex, {
                                  alerts: { ...selectedLane.alerts, enableSpeedAlert: !selectedLane.alerts.enableSpeedAlert }
                                })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedLane.alerts.enableSpeedAlert ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedLane.alerts.enableSpeedAlert ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Occupancy Alert */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
                              <div>
                                <div className="font-medium text-gray-900">Occupancy Alert</div>
                                <p className="text-sm text-gray-500">Alert on high occupancy</p>
                              </div>
                              <button
                                onClick={() => updateLaneConfig(selectedLaneIndex, {
                                  alerts: { ...selectedLane.alerts, enableOccupancyAlert: !selectedLane.alerts.enableOccupancyAlert }
                                })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedLane.alerts.enableOccupancyAlert ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedLane.alerts.enableOccupancyAlert ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Vehicle Count Alert */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium text-gray-900">Vehicle Count Alert</div>
                                <p className="text-sm text-gray-500">Alert on high vehicle count</p>
                              </div>
                              <button
                                onClick={() => updateLaneConfig(selectedLaneIndex, {
                                  alerts: { ...selectedLane.alerts, enableVehicleCountAlert: !selectedLane.alerts.enableVehicleCountAlert }
                                })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedLane.alerts.enableVehicleCountAlert ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedLane.alerts.enableVehicleCountAlert ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display Tab */}
                      {activeTab === 'display' && (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Display Options - {selectedLane.customName}
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                              Choose which metrics to show on the lane card
                            </p>

                            {/* Show Queue */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
                              <div>
                                <div className="font-medium text-gray-900">Show Queue</div>
                                <p className="text-sm text-gray-500">Display queue length metric</p>
                              </div>
                              <button
                                onClick={() => updateLaneConfig(selectedLaneIndex, {
                                  displayOptions: { ...selectedLane.displayOptions, showQueue: !selectedLane.displayOptions.showQueue }
                                })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedLane.displayOptions.showQueue ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedLane.displayOptions.showQueue ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Show Vehicles */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
                              <div>
                                <div className="font-medium text-gray-900">Show Vehicles</div>
                                <p className="text-sm text-gray-500">Display vehicle count</p>
                              </div>
                              <button
                                onClick={() => updateLaneConfig(selectedLaneIndex, {
                                  displayOptions: { ...selectedLane.displayOptions, showVehicles: !selectedLane.displayOptions.showVehicles }
                                })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedLane.displayOptions.showVehicles ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedLane.displayOptions.showVehicles ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Show Speed */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
                              <div>
                                <div className="font-medium text-gray-900">Show Speed</div>
                                <p className="text-sm text-gray-500">Display average speed</p>
                              </div>
                              <button
                                onClick={() => updateLaneConfig(selectedLaneIndex, {
                                  displayOptions: { ...selectedLane.displayOptions, showSpeed: !selectedLane.displayOptions.showSpeed }
                                })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedLane.displayOptions.showSpeed ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedLane.displayOptions.showSpeed ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Show Occupancy */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium text-gray-900">Show Occupancy</div>
                                <p className="text-sm text-gray-500">Display occupancy percentage</p>
                              </div>
                              <button
                                onClick={() => updateLaneConfig(selectedLaneIndex, {
                                  displayOptions: { ...selectedLane.displayOptions, showOccupancy: !selectedLane.displayOptions.showOccupancy }
                                })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  selectedLane.displayOptions.showOccupancy ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedLane.displayOptions.showOccupancy ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex">
                        <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  )}

                  {successMessage && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex">
                        <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-green-800">{successMessage}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {laneConfigs.length} lane{laneConfigs.length !== 1 ? 's' : ''} configured
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save All Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
