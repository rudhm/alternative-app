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

  const defaultOtherName = userId === "Hasi" ? "Rudh" : "Hasi";
  const [customOtherName, setCustomOtherName] = useState(defaultOtherName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("chat_theme");
      if (storedTheme === "dark") {
        setIsDark(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && userId) {
      const storedName = localStorage.getItem(`nickname_${userId}`);
      if (storedName) {
        setCustomOtherName(storedName);
      } else {
        setCustomOtherName(userId === "Hasi" ? "Rudh" : "Hasi");
      }
    }
  }, [userId]);

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
    let lastDateKey = "";

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    messages.forEach((msg, i) => {
      const msgTime = new Date(msg.createdAt).getTime();
      const d = new Date(msgTime);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (dateKey !== lastDateKey) {
        let label = "";
        if (dateKey === todayKey) {
          label = "Today";
        } else if (dateKey === yesterdayKey) {
          label = "Yesterday";
        } else {
          label = d.toLocaleDateString();
        }

        newItems.push({ type: "date_separator", id: `date-${dateKey}`, label });
        lastDateKey = dateKey;
      }

      const prevMsg = i > 0 ? messages[i - 1] : null;
      const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

      let isGroupStart = true;
      if (prevMsg && prevMsg.authorId === msg.authorId) {
        const prevTime = new Date(prevMsg.createdAt).getTime();
        const prevD = new Date(prevTime);
        const prevDateKey = `${prevD.getFullYear()}-${prevD.getMonth()}-${prevD.getDate()}`;
        if (msgTime - prevTime <= 5 * 60 * 1000 && prevDateKey === dateKey) {
          isGroupStart = false;
        }
      }

      let isGroupEnd = true;
      if (nextMsg && nextMsg.authorId === msg.authorId) {
        const nextTime = new Date(nextMsg.createdAt).getTime();
        const nextD = new Date(nextTime);
        const nextDateKey = `${nextD.getFullYear()}-${nextD.getMonth()}-${nextD.getDate()}`;
        if (nextTime - msgTime <= 5 * 60 * 1000 && nextDateKey === dateKey) {
          isGroupEnd = false;
        }
      }

      newItems.push({ ...msg, isGroupStart, isGroupEnd });
    });

    return newItems;
  }, [messages]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = items[index];
      if (item.type === "date_separator") return 40;
      let size = 60; // base size
      if (item.media && item.media.length > 0) size += 200; // image estimate
      if (item.replyTo) size += 40; // reply box estimate
      if (item.content && item.content.length > 50) {
        size += Math.floor((item.content.length - 50) / 40) * 20; // text wrap estimate
      }
      return size;
    },
    overscan: 25,
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (activeReactionId) {
      setActiveReactionId(null);
    }
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
  }, [loadMore, activeReactionId, setActiveReactionId]);

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
      <div className="flex-none bg-[var(--color-surface-raised)] px-4 h-16 flex items-center justify-between z-[200000] border-b border-[var(--color-border)] transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center font-semibold text-sm text-white shadow-[var(--shadow-sm)]">
            {customOtherName ? customOtherName.charAt(0).toUpperCase() : (userId === "Hasi" ? "R" : "H")}
          </div>
          <div>
            {isEditingName ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const newName = editNameValue.trim() || defaultOtherName;
                  setCustomOtherName(newName);
                  localStorage.setItem(`nickname_${userId}`, newName);
                  setIsEditingName(false);
                }}
                className="flex items-center"
              >
                <input
                  type="text"
                  autoFocus
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onBlur={() => {
                    const newName = editNameValue.trim() || defaultOtherName;
                    setCustomOtherName(newName);
                    localStorage.setItem(`nickname_${userId}`, newName);
                    setIsEditingName(false);
                  }}
                  className="font-semibold text-[var(--color-text)] text-[15px] leading-tight bg-transparent border-b border-[var(--color-accent)] outline-none w-32"
                />
              </form>
            ) : (
              <h2 
                onClick={() => {
                  setEditNameValue(customOtherName);
                  setIsEditingName(true);
                }}
                className="font-semibold text-[var(--color-text)] text-[15px] leading-tight cursor-pointer hover:opacity-80 transition-opacity"
                title="Click to change nickname"
              >
                {customOtherName}
              </h2>
            )}
            <div className={cn(
              "text-xs font-medium leading-tight mt-0.5 flex items-center h-4",
              otherStatus === "online" ? "text-[var(--color-accent)] dark:text-[var(--color-accent-light)] capitalize" : "text-[var(--color-text-muted)] lowercase"
            )}>
              {typingUser && typingUser !== userId ? (
                <div className="flex space-x-[3px] items-center h-full mt-0.5">
                  <span className="text-[11px] leading-none opacity-80 mr-1 lowercase tracking-wide">typing</span>
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }} className="w-1 h-1 bg-current rounded-full" />
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15, ease: "easeInOut" }} className="w-1 h-1 bg-current rounded-full" />
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3, ease: "easeInOut" }} className="w-1 h-1 bg-current rounded-full" />
                </div>
              ) : (
                <span>{displayStatus}</span>
              )}
            </div>
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
        <>
          <div 
            className="fixed inset-0 z-[300000] bg-black/20 dark:bg-black/40"
            onClick={() => setActiveReactionId(null)}
          />
          <div className="fixed inset-0 z-[500000] pointer-events-none">
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
              className="bg-[var(--color-surface-overlay)] border border-[var(--color-border)] p-2.5 rounded-[20px] shadow-[var(--shadow-lg)] flex select-none [-webkit-touch-callout:none] pointer-events-auto"
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
        </>
      )}

      <NetworkBanner />

      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 pt-3 pb-2 select-none [-webkit-touch-callout:none]" style={{ overscrollBehavior: "contain" }}
        onScroll={handleScroll}
      >
        {isLoadingMore && (
          <div className="flex flex-col py-4 space-y-4 px-2 animate-pulse w-full pointer-events-none">
            <div className="self-start bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl rounded-tl-sm w-3/4 max-w-[260px] h-12 opacity-60 shadow-sm" />
            <div className="self-end bg-[var(--color-accent)] rounded-2xl rounded-tr-sm w-2/3 max-w-[220px] h-10 opacity-20 shadow-sm" />
            <div className="self-start bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl rounded-tl-sm w-1/2 max-w-[180px] h-16 opacity-60 shadow-sm" />
          </div>
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
                  <span className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs font-medium px-3 py-1 rounded-full shadow-sm">
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
                onClick={() => {
                  if (activeReactionId) setActiveReactionId(null);
                }}
                className={cn(
                  "absolute top-0 left-0 w-full flex py-0.5", // Reduced y-padding for grouping
                  item.isGroupStart && "pt-2",
                  item.isGroupEnd && "pb-2",
                  isMe ? "justify-end" : "justify-start"
                )}
                style={{
                  transform: `translateY(${vItem.start}px)`,
                  zIndex: activeReactionId === item.id ? 400000 : 100000 - vItem.index,
                  willChange: "transform",
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
            className="absolute bottom-24 right-4 z-[150000]"
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
