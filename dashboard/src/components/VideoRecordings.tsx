'use client';

import { useState, useEffect } from 'react';
import { VideoRecording } from '@/types/camera';

interface VideoRecordingsProps {
  recordings: VideoRecording[];
  onRefresh: () => void;
}

export default function VideoRecordings({ recordings, onRefresh }: VideoRecordingsProps) {
  const [filteredRecordings, setFilteredRecordings] = useState<VideoRecording[]>(recordings);
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Get unique camera IDs for filter
  const cameraIds = Array.from(new Set(recordings.map(r => r.cameraId)));

  // Filter recordings based on selected camera
  useEffect(() => {
    if (selectedCamera === 'all') {
      setFilteredRecordings(recordings);
    } else {
      setFilteredRecordings(recordings.filter(r => r.cameraId === selectedCamera));
    }
  }, [recordings, selectedCamera]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const handleDownload = async (recording: VideoRecording) => {
    setIsDownloading(recording.id);
    
    try {
      const response = await fetch(`/api/video/recordings/download?filename=${recording.filename}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = recording.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download recording');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDelete = async (recording: VideoRecording) => {
    if (!confirm(`Are you sure you want to delete "${recording.filename}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/video/recordings?filename=${recording.filename}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        onRefresh();
      } else {
        alert(`Failed to delete recording: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete recording');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Video Recordings</h2>
          <p className="text-sm text-gray-600">
            Manage and download recorded video files
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Camera Filter */}
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            aria-label="Filter recordings by camera"
            className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="all">All Cameras</option>
            {cameraIds.map(cameraId => (
              <option key={cameraId} value={cameraId}>
                Camera: {cameraId}
              </option>
            ))}
          </select>
          
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Recordings List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredRecordings.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredRecordings.map((recording) => (
              <li key={recording.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {recording.filename}
                        </h3>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <span>Camera: {recording.cameraId}</span>
                          <span>Duration: {formatDuration(recording.duration)}</span>
                          <span>Size: {formatFileSize(recording.size)}</span>
                          <span>Recorded: {formatDate(recording.startTime)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownload(recording)}
                          disabled={isDownloading === recording.id}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {isDownloading === recording.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                          ) : (
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          Download
                        </button>
                        <button
                          onClick={() => handleDelete(recording)}
                          className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recordings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedCamera === 'all' 
                ? 'No video recordings have been created yet.'
                : `No recordings found for the selected camera.`
              }
            </p>
          </div>
        )}
      </div>

      {/* Storage Info */}
      {recordings.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Storage Information</h4>
              <p className="text-xs text-gray-500 mt-1">
                Total recordings: {recordings.length} • 
                Total size: {formatFileSize(recordings.reduce((sum, r) => sum + r.size, 0))}
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Videos are automatically cleaned up after 30 days
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
