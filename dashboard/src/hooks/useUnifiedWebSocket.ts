import { useEffect, useRef, useState, useCallback } from 'react';
import { useDevice } from '@/contexts/DeviceContext';

export interface WebSocketMessage {
  type: string;
  data?: any;
  deviceId?: string;
  channel?: string;
  message?: string;
  timestamp?: number;
}

export interface WebSocketConnection {
  ws: WebSocket | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribeToChannel: (channel: string) => void;
  unsubscribeFromChannel: (channel: string) => void;
  sendMessage: (message: any) => void;
}

export function useUnifiedWebSocket(): WebSocketConnection {
  const { selectedDevice } = useDevice();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedChannels = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8080`;
    
    try {
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log('🔌 Connected to Unified WebSocket');
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        
        // Resubscribe to all channels
        subscribedChannels.current.forEach(channel => {
          websocket.send(JSON.stringify({
            type: 'subscribe_channel',
            channel: channel
          }));
        });

        // Subscribe to the selected device
        websocket.send(JSON.stringify({
          type: 'subscribe_device',
          deviceId: selectedDevice.id
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 Received WebSocket message:', data.type);
          
          // Handle different message types
          switch (data.type) {
            case 'connection_established':
              console.log('✅ WebSocket connection established');
              break;
            case 'subscription_confirmed':
              console.log(`✅ Subscribed to ${data.channel} channel`);
              break;
            case 'unsubscription_confirmed':
              console.log(`✅ Unsubscribed from ${data.channel} channel`);
              break;
            case 'device_subscription_confirmed':
              console.log(`✅ Subscribed to device ${data.deviceId}`);
              break;
            case 'device_unsubscription_confirmed':
              console.log(`✅ Unsubscribed from device ${data.deviceId}`);
              break;
            case 'pong':
              console.log('🏓 Received pong');
              break;
            default:
              // Let components handle their specific message types
              break;
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [selectedDevice.id]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  const subscribeToChannel = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_channel',
        channel: channel
      }));
      subscribedChannels.current.add(channel);
    }
  }, []);

  const unsubscribeFromChannel = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe_channel',
        channel: channel
      }));
      subscribedChannels.current.delete(channel);
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message:', message);
    }
  }, []);

  // Connect on mount and when device changes
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle device changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Unsubscribe from old device
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe_device',
        deviceId: 'previous' // The server will handle this gracefully
      }));
      
      // Subscribe to new device
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_device',
        deviceId: selectedDevice.id
      }));
    }
  }, [selectedDevice.id]);

  return {
    ws: wsRef.current,
    connectionStatus,
    subscribeToChannel,
    unsubscribeFromChannel,
    sendMessage
  };
}
