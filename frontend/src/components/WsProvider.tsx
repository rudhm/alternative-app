/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

type ConnectionStatus = "connecting" | "connected" | "syncing" | "disconnected";

interface WsContextType {
  status: ConnectionStatus;
  userId: string | null;
  token: string | null;
  connect: (userId: string, token: string) => void;
  sendMessage: (payload: any) => void;
  lastMessage: any;
}

const WsContext = createContext<WsContextType | null>(null);

export function WsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [userId, setUserId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(function doConnect(uid: string, authToken?: string) {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setUserId(uid);
    setToken(authToken || null);
    setStatus("connecting");

    // Connect to WebSocket (using relative URL, assuming Nginx proxies /)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.host}/ws`;
    
    try {
      const urlObj = new URL(wsUrl);
      if (authToken) {
        urlObj.searchParams.set("token", authToken);
      }
      wsUrl = urlObj.toString();
    } catch (e) {
      if (authToken) {
        wsUrl += `?token=${authToken}`;
      }
    }
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (uid) doConnect(uid, authToken);
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return (
    <WsContext.Provider value={{ status, userId, token, connect, sendMessage, lastMessage }}>
      {children}
    </WsContext.Provider>
  );
}

export const useWs = () => {
  const context = useContext(WsContext);
  if (!context) throw new Error("useWs must be used within WsProvider");
  return context;
};
