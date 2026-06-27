import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useWebSocket - Hook for real-time WebSocket connection to the ERP backend
 * Provides automatic reconnection, heartbeat, and event subscription
 */
export function useWebSocket(options = {}) {
  const { onMessage, autoConnect = true } = options;
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const listeners = useRef(new Map());

  const getWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = 5000; // Backend port
    return `${protocol}//${host}:${port}/ws`;
  };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        setConnected(true);
        reconnectAttempts.current = 0;
        console.log('[WS] Connected to real-time updates');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          // Call global onMessage handler
          if (onMessage) onMessage(data);

          // Call type-specific listeners
          if (data.type && listeners.current.has(data.type)) {
            listeners.current.get(data.type).forEach(cb => cb(data));
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('[WS] Connection failed:', e);
    }
  }, [onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Subscribe to specific event types
  const subscribe = useCallback((eventType, callback) => {
    if (!listeners.current.has(eventType)) {
      listeners.current.set(eventType, new Set());
    }
    listeners.current.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      listeners.current.get(eventType)?.delete(callback);
    };
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    lastMessage,
    connect,
    disconnect,
    subscribe,
  };
}

export default useWebSocket;
