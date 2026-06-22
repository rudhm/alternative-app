/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface WsContextType {
  status: ConnectionStatus;
  userId: string | null;
  token: string | null;
  connect: (userId: string, token: string) => void;
  sendMessage: (payload: any) => void;
  onMessage: (handler: (msg: any) => void) => () => void;
}

const WsContext = createContext<WsContextType | null>(null);

export function WsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelay = useRef(1000);
  const queueRef = useRef<any[]>([]);
  const handlersRef = useRef<Set<(msg: any) => void>>(new Set());

  const onMessage = useCallback((handler: (msg: any) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const connect = useCallback(function doConnect(uid: string, authToken?: string) {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;
    setUserId(uid);
    setToken(authToken || null);
    setStatus("connecting");

    // Connect to WebSocket (using relative URL, assuming Nginx proxies /)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://rudhasi.mooo.com/ws";
    
    // For cross-origin WebSocket connections (e.g. from rudhasi.pages.dev to rudhasi.mooo.com), 
    // third-party cookies are often blocked. We must pass the token in the URL.
    const wsUrl = authToken ? `${baseWsUrl}?token=${authToken}` : baseWsUrl;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      reconnectDelay.current = 1000;
      setStatus("connected");
      queueRef.current.forEach(msg => ws.send(JSON.stringify(msg)));
      queueRef.current = [];
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handlersRef.current.forEach(h => h(data));
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (uid) doConnect(uid, authToken);
      }, reconnectDelay.current);
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else if (data.type === 'chat') {
      queueRef.current.push(data);
    }
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return (
    <WsContext.Provider value={{ status, userId, token, connect, sendMessage, onMessage }}>
      {children}
    </WsContext.Provider>
  );
}

export const useWs = () => {
  const context = useContext(WsContext);
  if (!context) throw new Error("useWs must be used within WsProvider");
  return context;
};
