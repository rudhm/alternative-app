/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWs } from "@/components/WsProvider";
import { NetworkBanner } from "@/components/NetworkBanner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Send, Paperclip, Smile, X, Sun, Moon, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./MessageBubble";
import { MessageInputBar } from "./MessageInputBar";

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export function ChatRoom() {
  const { userId, status, lastMessage, sendMessage, token } = useWs();
  const [messages, setMessages] = useState<any[]>([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    // Dynamic theme-color for Android status bar
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0a0a0c' : '#faf9f8');
  }, [isDark]);
  const parentRef = useRef<HTMLDivElement>(null);
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [otherStatus, setOtherStatus] = useState<"online" | "offline">("offline");
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);

  const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://rudhasi.mooo.com";
    fetch(`${apiUrl}/api/messages`, { 
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include" 
    })
      .then(r => r.json())
      .then(d => {
        if (d.messages) {
          setMessages(d.messages);
          setNextCursor(d.nextCursor || null);
        }
      })
      .catch(err => console.error("Failed to fetch messages", err));
  }, [token]);

  // Visibility Background Sync: re-fetch latest messages when app returns from background
  useEffect(() => {
    if (!token) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://rudhasi.mooo.com";
        fetch(`${apiUrl}/api/messages`, { 
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include" 
        })
          .then(r => r.json())
          .then(d => {
            if (d.messages) {
              setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newMsgs = d.messages.filter((m: any) => !existingIds.has(m.id));
                if (newMsgs.length === 0) return prev;
                return [...prev, ...newMsgs];
              });
            }
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [token]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://rudhasi.mooo.com";
    
    const prevScrollHeight = parentRef.current?.scrollHeight || 0;
    const prevScrollTop = parentRef.current?.scrollTop || 0;
    
    try {
      const r = await fetch(`${apiUrl}/api/messages?cursor=${nextCursor}`, { 
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include" 
      });
      const d = await r.json();
      if (d.messages && d.messages.length > 0) {
        setMessages(prev => [...d.messages, ...prev]);
        setNextCursor(d.nextCursor || null);
        
        requestAnimationFrame(() => {
          if (parentRef.current) {
            const newScrollHeight = parentRef.current.scrollHeight;
            parentRef.current.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          }
        });
      }
    } catch (e) {
      console.error("Failed to load more", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, token]);

  useEffect(() => {
    if (lastMessage?.type === 'chat') {
      const msg = lastMessage.payload;
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === msg.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = msg;
          return next;
        }
        return [...prev, msg];
      });
      if (msg.authorId !== userId) {
        vibrate([10, 30, 10]);
      }
    } else if (lastMessage?.type === 'reaction_added') {
       const r = lastMessage.payload;
       setMessages(prev => {
         const idx = prev.findIndex(m => m.id === r.messageId);
         if (idx === -1) return prev;
         const next = [...prev];
         const msg = { ...next[idx] };
         msg.reactions = [...(msg.reactions || []), r];
         next[idx] = msg;
         return next;
       });
    } else if (lastMessage?.type === 'reaction_removed') {
       const { messageId, userId: rUid, emoji } = lastMessage.payload;
       setMessages(prev => {
         const idx = prev.findIndex(m => m.id === messageId);
         if (idx === -1) return prev;
         const next = [...prev];
         const msg = { ...next[idx] };
         msg.reactions = (msg.reactions || []).filter((r: any) => !(r.userId === rUid && r.emoji === emoji));
         next[idx] = msg;
         return next;
       });
    } else if (lastMessage?.type === 'typing') {
       setTypingUser(lastMessage.userId);
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    } else if (lastMessage?.type === 'read_receipt') {
       const rr = lastMessage.payload;
       setMessages(prev => {
         const idx = prev.findIndex(m => m.id === rr.messageId);
         if (idx === -1) return prev;
         const next = [...prev];
         next[idx] = { ...next[idx], readReceipt: rr };
         return next;
       });
    } else if (lastMessage?.type === 'presence') {
       if (lastMessage.userId !== userId) {
         setOtherStatus(lastMessage.status);
         if (lastMessage.lastSeen) setOtherLastSeen(lastMessage.lastSeen);
       }
    }
  }, [lastMessage, userId]);

  useEffect(() => {
    const unreadIds = messages
      .filter(m => m.authorId !== userId && !m.readReceipt && !m.pending)
      .map(m => m.id);
      
    unreadIds.forEach(id => {
      sendMessage({ type: "read", payload: { messageId: id } });
      setMessages(prev => {
         const idx = prev.findIndex(m => m.id === id);
         if (idx === -1) return prev;
         const next = [...prev];
         next[idx] = { ...next[idx], readReceipt: { messageId: id, userId } };
         return next;
      });
    });
  }, [messages, userId, sendMessage]);

  const handlePressStart = (msgId: string) => {
    pressTimer.current = setTimeout(() => {
      vibrate([20]);
      setActiveReactionId(msgId);
    }, 400); // 400ms long press
  };

  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const toggleReaction = useCallback((msgId: string, emoji: string) => {
    sendMessage({ type: "reaction", payload: { messageId: msgId, emoji } });
    setActiveReactionId(null);
    vibrate(10);
  }, [sendMessage]);

  const lastTapRef = useRef<{ time: number, msgId: string } | null>(null);

  const handleTap = useCallback((msgId: string) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;
    if (lastTap && lastTap.msgId === msgId && now - lastTap.time < 350) {
      // Double tap detected
      const msg = messages.find(m => m.id === msgId);
      const hasHeart = msg?.reactions?.some((r: any) => r.userId === userId && r.emoji === "❤️");
      if (!hasHeart) {
        toggleReaction(msgId, "❤️");
      }
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, msgId };
    }
  }, [messages, userId, toggleReaction]);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  const isAtBottom = useRef(true);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop < 100) {
      loadMore();
    }
    isAtBottom.current = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
  };

  useEffect(() => {
    if (messages.length > 0 && virtualizer.getTotalSize() > 0) {
      if (isAtBottom.current) {
        virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
      }
    }
  }, [messages.length, virtualizer]);

    const handleTyping = useCallback(() => {
    sendMessage({ type: "typing", payload: {} });
  }, [sendMessage]);

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return;
    
    const msgId = `loc-${Date.now()}`;
    const payload = {
      id: msgId,
      content: text,
      media: [],
      replyToId: replyingTo?.id
    };
    
    setMessages(prev => [...prev, {
      ...payload,
      authorId: userId,
      createdAt: new Date().toISOString(),
      pending: true,
      replyTo: replyingTo
    }]);

    isAtBottom.current = true;
    sendMessage({ type: "chat", payload });
    setReplyingTo(null);
    vibrate(10);

    // Optimistic rollback: if server doesn't ACK within 5s, mark as failed
    setTimeout(() => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === msgId);
        if (idx === -1) return prev;
        if (prev[idx].pending) {
          const next = [...prev];
          next[idx] = { ...next[idx], pending: false, failed: true };
          return next;
        }
        return prev;
      });
    }, 5000);
  }, [replyingTo, sendMessage, userId]);

  const retryMessage = useCallback((msg: any) => {
    setMessages(prev =>
      prev.map(m => m.id === msg.id ? { ...m, failed: false, pending: true } : m)
    );
    sendMessage({ type: "chat", payload: { id: msg.id, content: msg.content, media: msg.media || [], replyToId: msg.replyToId } });
    setTimeout(() => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === msg.id);
        if (idx === -1) return prev;
        if (prev[idx].pending) {
          const next = [...prev];
          next[idx] = { ...next[idx], pending: false, failed: true };
          return next;
        }
        return prev;
      });
    }, 5000);
  }, [sendMessage]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic pending media (placeholder)
    const msgId = `loc-${Date.now()}`;
    const placeholderUrl = URL.createObjectURL(file);
    
    const payload = {
      id: msgId,
      content: "",
      media: [{ url: placeholderUrl, type: 'image' }]
    };

    setMessages(prev => [...prev, {
      ...payload,
      authorId: userId,
      createdAt: new Date().toISOString(),
      pending: true,
    }]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://rudhasi.mooo.com";
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (!res.ok) {
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === msgId);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], pending: false, failed: true };
          return next;
        });
        return;
      }
      const data = await res.json();
      
      // Send actual ws message with real URL
      sendMessage({
        type: "chat",
        payload: {
          id: msgId,
          content: "",
          media: [data]
        }
      });
      vibrate(10);
    } catch (err) {
      console.error("Upload failed", err);
    }
  }, [replyingTo, sendMessage, userId]);

  const formatLastSeen = (isoStr: string) => {
    const d = new Date(isoStr);
    const now = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `today at ${time}`;
    return `${d.toLocaleDateString()} at ${time}`;
  };

  const displayStatus = status !== "connected" 
    ? status 
    : otherStatus === "online" 
      ? "online" 
      : otherLastSeen 
        ? `Was here at ${formatLastSeen(otherLastSeen)}`
        : "offline";

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[var(--color-bg)] overflow-hidden relative text-[var(--color-text)] transition-colors duration-300">
      <div className="flex-none bg-[var(--color-surface-raised)] backdrop-blur-md px-4 h-16 flex items-center justify-between z-20 border-b border-[var(--color-border)] transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center font-semibold text-sm text-white shadow-[var(--shadow-sm)]">
            {userId === "Hasi" ? "R" : "H"}
          </div>
          <div>
            <h2 className="font-semibold text-[var(--color-text)] text-[15px] leading-tight">
              {userId === "Hasi" ? "Rudh" : "Hasi"}
            </h2>
            <p className={cn(
              "text-[11px] font-medium leading-tight mt-0.5",
              otherStatus === "online" ? "text-[var(--color-accent)] dark:text-[var(--color-accent-light)] capitalize" : "text-[var(--color-text-muted)] lowercase"
            )}>
              {typingUser && typingUser !== userId ? 'typing...' : displayStatus}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDark(!isDark)}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors shadow-[var(--shadow-sm)]"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
      
      {activeReactionId && (
        <div 
          className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40 flex items-center justify-center p-4"
          onClick={() => setActiveReactionId(null)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-[var(--color-surface-overlay)] backdrop-blur-md border border-[var(--color-border)] p-2.5 rounded-lg shadow-[var(--shadow-lg)] flex flex-col space-y-2 select-none [-webkit-touch-callout:none]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex space-x-1 border-b border-[var(--color-border)] pb-2">
              {EMOJIS.map(e => (
                <button 
                  key={e}
                  aria-label={`React with ${e}`}
                  className="text-[26px] hover:scale-110 transition-transform active:scale-95 w-10 h-10 flex items-center justify-center"
                  onClick={() => toggleReaction(activeReactionId, e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <button
              className="text-[var(--color-text-secondary)] text-sm font-medium py-1.5 hover:bg-[var(--color-accent-muted)] rounded-md transition-colors flex items-center justify-center"
              onClick={() => {
                const msg = messages.find(m => m.id === activeReactionId);
                if (msg) setReplyingTo(msg);
                setActiveReactionId(null);
              }}
            >
              ↩ Reply
            </button>
          </motion.div>
        </div>
      )}

      <NetworkBanner />

      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 pt-3 pb-28 select-none [-webkit-touch-callout:none]" style={{ overscrollBehavior: "contain" }}
        onScroll={handleScroll}
      >
        {isLoadingMore && (
          <div className="text-center py-2 text-[11px] font-medium text-[var(--color-text-muted)] animate-pulse">Loading older messages...</div>
        )}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((vItem) => {
            const msg = messages[vItem.index];
            const isMe = msg.authorId === userId;
            const isOnlyEmoji = msg.content && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(msg.content);
            const isNew = Date.now() - new Date(msg.createdAt).getTime() < 5000;

            return (
              <motion.div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                className={cn(
                  "absolute top-0 left-0 w-full flex py-1",
                  isMe ? "justify-end" : "justify-start"
                )}
                initial={false}
                animate={{ y: vItem.start }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                style={{
                  zIndex: messages.length - vItem.index,
                }}
              >
                <MessageBubble 
                  msg={msg}
                  userId={userId}
                  isNew={isNew}
                  activeReactionId={activeReactionId}
                  onSetReplyingTo={setReplyingTo}
                  onSetActiveReactionId={setActiveReactionId}
                  onRetryMessage={retryMessage}
                  onToggleReaction={toggleReaction}
                  onVibrate={vibrate}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      <MessageInputBar
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSend={handleSend}
        onTyping={handleTyping}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
}
