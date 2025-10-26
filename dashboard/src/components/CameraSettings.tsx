'use client';

import { useState } from 'react';
import { CameraConfig, CameraTestResult } from '@/types/camera';

interface CameraSettingsProps {
  cameras: CameraConfig[];
  onCameraAdded: (camera: CameraConfig) => void;
  onCameraUpdated: (camera: CameraConfig) => void;
  onCameraDeleted: (cameraId: string) => void;
  onRefresh: () => void;
}

export default function CameraSettings({
  cameras,
  onCameraAdded,
  onCameraUpdated,
  onCameraDeleted,
  onRefresh
}: CameraSettingsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraConfig | null>(null);
  const [testingCamera, setTestingCamera] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<CameraTestResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    rtspUrl: '',
    username: '',
    password: '',
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    bitrate: 2000000
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'width' || name === 'height') {
      setFormData(prev => ({
        ...prev,
        resolution: {
          ...prev.resolution,
          [name]: parseInt(value) || 0
        }
      }));
    } else if (name === 'frameRate' || name === 'bitrate') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/video/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        onCameraAdded(data.camera);
        setShowAddForm(false);
        setFormData({
          name: '',
          rtspUrl: '',
          username: '',
          password: '',
          resolution: { width: 1920, height: 1080 },
          frameRate: 30,
          bitrate: 2000000
        });
        // Show success message
        alert('Camera added successfully!');
      } else {
        alert(`Failed to add camera: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding camera:', error);
      alert(`Failed to add camera: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (camera: CameraConfig) => {
    try {
      const response = await fetch('/api/video/cameras', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(camera)
      });

      const data = await response.json();
      
      if (data.success) {
        onCameraUpdated(data.camera);
        setEditingCamera(null);
      } else {
        alert(`Failed to update camera: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating camera:', error);
      alert('Failed to update camera');
    }
  };

  const handleDelete = async (cameraId: string) => {
    if (!confirm('Are you sure you want to delete this camera?')) {
      return;
    }

    try {
      const response = await fetch(`/api/video/cameras?id=${cameraId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        onCameraDeleted(cameraId);
      } else {
        alert(`Failed to delete camera: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting camera:', error);
      alert('Failed to delete camera');
    }
  };

  const testCamera = async (camera: CameraConfig) => {
    setTestingCamera(camera.id);
    setTestResult(null);

    try {
      const response = await fetch('/api/video/cameras/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rtspUrl: camera.rtspUrl,
          username: camera.username,
          password: camera.password
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTestResult(data.result);
      } else {
        setTestResult({
          success: false,
          error: data.error || 'Test failed'
        });
      }
    } catch (error) {
      console.error('Error testing camera:', error);
      setTestResult({
        success: false,
        error: 'Failed to test camera connection'
      });
    } finally {
      setTestingCamera(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Camera Configuration</h2>
          <p className="text-sm text-gray-600">
            Manage RTSP camera connections and settings
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Camera
        </button>
      </div>

      {/* Add Camera Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Camera</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Camera Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Intersection Camera 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">RTSP URL</label>
                <input
                  type="url"
                  name="rtspUrl"
                  value={formData.rtspUrl}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="rtsp://192.168.1.100:554/stream"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="password"
                />
              </div>
              <div>
                <label htmlFor="width" className="block text-sm font-medium text-gray-700">Resolution Width</label>
                <input
                  id="width"
                  type="number"
                  name="width"
                  value={formData.resolution.width}
                  onChange={handleInputChange}
                  placeholder="1920"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700">Resolution Height</label>
                <input
                  id="height"
                  type="number"
                  name="height"
                  value={formData.resolution.height}
                  onChange={handleInputChange}
                  placeholder="1080"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="frameRate" className="block text-sm font-medium text-gray-700">Frame Rate (fps)</label>
                <input
                  id="frameRate"
                  type="number"
                  name="frameRate"
                  value={formData.frameRate}
                  onChange={handleInputChange}
                  placeholder="30"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="bitrate" className="block text-sm font-medium text-gray-700">Bitrate (bps)</label>
                <input
                  id="bitrate"
                  type="number"
                  name="bitrate"
                  value={formData.bitrate}
                  onChange={handleInputChange}
                  placeholder="2000000"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isSubmitting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Adding...
                  </>
                ) : (
                  'Add Camera'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Camera Form */}
      {editingCamera && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Camera</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpdate(editingCamera);
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Camera Name</label>
                <input
                  type="text"
                  value={editingCamera.name}
                  onChange={(e) => setEditingCamera({...editingCamera, name: e.target.value})}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Intersection Camera 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">RTSP URL</label>
                <input
                  type="url"
                  value={editingCamera.rtspUrl}
                  onChange={(e) => setEditingCamera({...editingCamera, rtspUrl: e.target.value})}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="rtsp://192.168.1.100:554/stream"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={editingCamera.username || ''}
                  onChange={(e) => setEditingCamera({...editingCamera, username: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={editingCamera.password || ''}
                  onChange={(e) => setEditingCamera({...editingCamera, password: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="password"
                />
              </div>
              <div>
                <label htmlFor="edit-width" className="block text-sm font-medium text-gray-700">Resolution Width</label>
                <input
                  id="edit-width"
                  type="number"
                  value={editingCamera.resolution.width}
                  onChange={(e) => setEditingCamera({
                    ...editingCamera, 
                    resolution: {...editingCamera.resolution, width: parseInt(e.target.value) || 0}
                  })}
                  placeholder="1920"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="edit-height" className="block text-sm font-medium text-gray-700">Resolution Height</label>
                <input
                  id="edit-height"
                  type="number"
                  value={editingCamera.resolution.height}
                  onChange={(e) => setEditingCamera({
                    ...editingCamera, 
                    resolution: {...editingCamera.resolution, height: parseInt(e.target.value) || 0}
                  })}
                  placeholder="1080"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="edit-frameRate" className="block text-sm font-medium text-gray-700">Frame Rate (fps)</label>
                <input
                  id="edit-frameRate"
                  type="number"
                  value={editingCamera.frameRate}
                  onChange={(e) => setEditingCamera({...editingCamera, frameRate: parseInt(e.target.value) || 0})}
                  placeholder="30"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="edit-bitrate" className="block text-sm font-medium text-gray-700">Bitrate (bps)</label>
                <input
                  id="edit-bitrate"
                  type="number"
                  value={editingCamera.bitrate}
                  onChange={(e) => setEditingCamera({...editingCamera, bitrate: parseInt(e.target.value) || 0})}
                  placeholder="2000000"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingCamera(null)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Camera List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {cameras.map((camera) => (
            <li key={camera.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{camera.name}</h3>
                      <p className="text-sm text-gray-500">{camera.rtspUrl}</p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>{camera.resolution.width}x{camera.resolution.height}</span>
                        <span>{camera.frameRate} fps</span>
                        <span>{Math.round(camera.bitrate / 1000)} kbps</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          camera.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {camera.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => testCamera(camera)}
                        disabled={testingCamera === camera.id}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {testingCamera === camera.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                        ) : (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        Test
                      </button>
                      <button
                        onClick={() => setEditingCamera(camera)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(camera.id)}
                        className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Test Result */}
                  {testResult && testingCamera === camera.id && (
                    <div className={`mt-2 p-2 rounded text-xs ${
                      testResult.success 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {testResult.success ? (
                        <div>
                          ✅ Connection successful
                          {testResult.latency && <span> • Latency: {testResult.latency}ms</span>}
                          {testResult.resolution && (
                            <span> • Resolution: {testResult.resolution.width}x{testResult.resolution.height}</span>
                          )}
                          {testResult.frameRate && <span> • Frame Rate: {testResult.frameRate} fps</span>}
                        </div>
                      ) : (
                        <div>❌ {testResult.error}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {cameras.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No cameras configured</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new camera.</p>
          </div>
        )}
      </div>
    </div>
  );
}
