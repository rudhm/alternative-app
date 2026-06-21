/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useWs } from "@/components/WsProvider";
import { NetworkBanner } from "@/components/NetworkBanner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Sun, Moon, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./MessageBubble";
import { MessageInputBar } from "./MessageInputBar";
import { vibrate } from "@/lib/vibrate";

import { useMessages } from "@/hooks/useMessages";
import { useTyping } from "@/hooks/useTyping";
import { usePresence } from "@/hooks/usePresence";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function ChatRoom() {
  const { userId, status, onMessage, sendMessage, token } = useWs();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("chat_theme");
      if (storedTheme === "dark") {
        setIsDark(true);
      }
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem("chat_theme", "dark");
    } else {
      root.classList.remove('dark');
      localStorage.setItem("chat_theme", "light");
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0a0a0c' : '#faf9f8');
  }, [isDark]);

  const parentRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const {
    messages,
    isLoadingMore,
    loadMore,
    replyingTo,
    setReplyingTo,
    activeReactionId,
    activeReactionPos,
    setActiveReactionId,
    toggleReaction,
    handleSend,
    retryMessage,
    handleFileUpload,
  } = useMessages({ token, userId, onMessage, sendMessage, parentRef, isAtBottom });

  const { typingUser, handleTyping } = useTyping(onMessage, sendMessage);
  const { otherStatus, displayStatus } = usePresence(onMessage, userId, status);

  const items = useMemo(() => {
    const newItems: any[] = [];
    let lastDateStr = "";

    messages.forEach((msg, i) => {
      const d = new Date(msg.createdAt);
      const dateStr = d.toLocaleDateString();

      if (dateStr !== lastDateStr) {
        const now = new Date();
        const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        let label = dateStr;
        if (isToday) {
          label = "Today";
        } else {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
            label = "Yesterday";
          }
        }

        newItems.push({ type: "date_separator", id: `date-${dateStr}`, label });
        lastDateStr = dateStr;
      }

      const prevMsg = i > 0 ? messages[i-1] : null;
      const nextMsg = i < messages.length - 1 ? messages[i+1] : null;

      const isGroupStart = !prevMsg || prevMsg.authorId !== msg.authorId || new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000 || new Date(prevMsg.createdAt).toLocaleDateString() !== dateStr;
      const isGroupEnd = !nextMsg || nextMsg.authorId !== msg.authorId || new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() > 5 * 60 * 1000 || new Date(nextMsg.createdAt).toLocaleDateString() !== dateStr;

      newItems.push({ ...msg, isGroupStart, isGroupEnd });
    });

    return newItems;
  }, [messages]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => items[index].type === "date_separator" ? 40 : 60,
    overscan: 10,
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop < 100) {
      loadMore();
    }
    const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    isAtBottom.current = atBottom;
    setShowScrollBottom((prev) => {
      const shouldShow = !atBottom;
      return prev !== shouldShow ? shouldShow : prev;
    });
  }, [loadMore]);

  const scrollToBottom = useCallback(() => {
    if (items.length > 0) {
      virtualizer.scrollToIndex(items.length - 1, { align: "end" });
      isAtBottom.current = true;
      setShowScrollBottom(false);
    }
  }, [items.length, virtualizer]);

  useEffect(() => {
    if (items.length > 0 && virtualizer.getTotalSize() > 0) {
      if (isAtBottom.current) {
        virtualizer.scrollToIndex(items.length - 1, { align: "end" });
      }
    }
  }, [items.length, virtualizer]);

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
              "text-xs font-medium leading-tight mt-0.5",
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
          className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40"
          onClick={() => setActiveReactionId(null)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: activeReactionPos ? Math.max(70, activeReactionPos.top - 60) : '50%',
              left: activeReactionPos ? (activeReactionPos.isMe ? 'auto' : '16px') : '50%',
              right: activeReactionPos ? (activeReactionPos.isMe ? '16px' : 'auto') : 'auto',
              transform: activeReactionPos ? 'none' : 'translate(-50%, -50%)'
            }}
            className="bg-[var(--color-surface-overlay)] backdrop-blur-md border border-[var(--color-border)] p-2.5 rounded-[20px] shadow-[var(--shadow-lg)] flex select-none [-webkit-touch-callout:none]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex space-x-1">
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
          <div className="text-center py-2 text-xs font-medium text-[var(--color-text-muted)] animate-pulse">Loading older messages...</div>
        )}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((vItem) => {
            const item = items[vItem.index];

            if (item.type === "date_separator") {
              return (
                <div
                  key={vItem.key}
                  data-index={vItem.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full flex justify-center py-2"
                  style={{ transform: `translateY(${vItem.start}px)` }}
                >
                  <span className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs font-medium px-3 py-1 rounded-full shadow-sm backdrop-blur-md">
                    {item.label}
                  </span>
                </div>
              );
            }

            const isMe = item.authorId === userId;
            const isNew = Date.now() - new Date(item.createdAt).getTime() < 5000;

            return (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                className={cn(
                  "absolute top-0 left-0 w-full flex py-0.5", // Reduced y-padding for grouping
                  item.isGroupStart && "pt-2",
                  item.isGroupEnd && "pb-2",
                  isMe ? "justify-end" : "justify-start"
                )}
                style={{
                  transform: `translateY(${vItem.start}px)`,
                  zIndex: items.length - vItem.index,
                }}
              >
                <MessageBubble 
                  msg={item}
                  userId={userId}
                  isNew={isNew}
                  isGroupStart={item.isGroupStart}
                  isGroupEnd={item.isGroupEnd}
                  activeReactionId={activeReactionId}
                  onSetReplyingTo={setReplyingTo}
                  onSetActiveReactionId={setActiveReactionId}
                  onRetryMessage={retryMessage}
                  onToggleReaction={toggleReaction}
                  onVibrate={vibrate}
                />
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showScrollBottom && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-24 right-4 z-30"
          >
            <button
              onClick={scrollToBottom}
              className="w-10 h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full flex items-center justify-center text-[var(--color-text)] shadow-[var(--shadow-md)] hover:text-[var(--color-accent)] transition-colors"
            >
              <ChevronDown size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <MessageInputBar
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSend={handleSend}
        onTyping={handleTyping}
        onFileUpload={handleFileUpload}
        onFocus={scrollToBottom}
      />
    </div>
  );
}
