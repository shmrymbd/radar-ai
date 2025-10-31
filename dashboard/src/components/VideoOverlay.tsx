'use client';

import { useEffect, useRef } from 'react';
import { useControlCenter } from '@/contexts/ControlCenterContext';
import {
  radarToVideo,
  isWithinBounds,
  getVehicleTypeColor,
  isDataStale,
  TransformConfig
} from '@/lib/coordinate-transform';

interface VideoOverlayProps {
  videoWidth: number;
  videoHeight: number;
}

export default function VideoOverlay({ videoWidth, videoHeight }: VideoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);

  const {
    vehiclesRef,
    showVideoOverlay,
    selectedVehicleId
  } = useControlCenter();

  useEffect(() => {
    if (!showVideoOverlay || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Throttle rendering to 30fps
    const fps = 30;
    const frameInterval = 1000 / fps;

    const transformConfig: TransformConfig = {
      videoWidth,
      videoHeight,
      radarScale: 10, // Adjust based on radar coordinate system
      radarOriginX: 0,
      radarOriginY: 0
    };

    const render = (timestamp: number) => {
      // Throttle to 30fps
      if (timestamp - lastRenderTimeRef.current < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }
      lastRenderTimeRef.current = timestamp;

      // Clear canvas
      ctx.clearRect(0, 0, videoWidth, videoHeight);

      const vehicles = vehiclesRef.current;

      if (!vehicles || vehicles.length === 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Render each vehicle
      vehicles.forEach((vehicle) => {
        const videoCoord = radarToVideo(
          { x: vehicle.x, y: vehicle.y },
          transformConfig
        );

        // Skip if out of bounds
        if (!isWithinBounds(videoCoord, transformConfig)) {
          return;
        }

        const isStale = isDataStale(vehicle.timestamp);
        const isSelected = vehicle.targetId === selectedVehicleId;
        const color = getVehicleTypeColor(vehicle.vehicleType);

        // Adjust opacity for stale data
        const opacity = isStale ? 0.3 : 0.8;

        // Draw vehicle rectangle
        ctx.save();
        ctx.globalAlpha = opacity;

        // Highlight selected vehicle
        if (isSelected) {
          ctx.strokeStyle = '#FBBF24'; // Yellow
          ctx.lineWidth = 3;
          ctx.strokeRect(videoCoord.x - 17, videoCoord.y - 17, 34, 34);
        }

        // Draw vehicle box
        ctx.fillStyle = color;
        ctx.fillRect(videoCoord.x - 15, videoCoord.y - 15, 30, 30);

        // Draw vehicle border
        ctx.strokeStyle = isSelected ? '#FBBF24' : '#FFFFFF';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(videoCoord.x - 15, videoCoord.y - 15, 30, 30);

        ctx.restore();

        // Draw vehicle ID label
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.font = '11px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;

        const label = `V${vehicle.targetId}`;
        const textMetrics = ctx.measureText(label);
        const textX = videoCoord.x - textMetrics.width / 2;
        const textY = videoCoord.y - 20;

        // Text shadow for readability
        ctx.strokeText(label, textX, textY);
        ctx.fillText(label, textX, textY);

        ctx.restore();

        // Draw speed indicator if available
        if (vehicle.speed !== undefined && vehicle.speed > 0) {
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.font = '9px sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;

          const speedLabel = `${Math.round(vehicle.speed)} km/h`;
          const speedMetrics = ctx.measureText(speedLabel);
          const speedX = videoCoord.x - speedMetrics.width / 2;
          const speedY = videoCoord.y + 25;

          ctx.strokeText(speedLabel, speedX, speedY);
          ctx.fillText(speedLabel, speedX, speedY);

          ctx.restore();
        }
      });

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start rendering
    animationFrameRef.current = requestAnimationFrame(render);

    // Cleanup
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showVideoOverlay, videoWidth, videoHeight, vehiclesRef, selectedVehicleId]);

  if (!showVideoOverlay) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth}
      height={videoHeight}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%'
      }}
    />
  );
}
