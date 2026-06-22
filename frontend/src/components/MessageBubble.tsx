import React, { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  msg: any;
  userId: string | null;
  isNew: boolean;
  isGroupStart?: boolean;
  isGroupEnd?: boolean;
  activeReactionId: string | null;
  onSetReplyingTo: (msg: any) => void;
  onSetActiveReactionId: (id: string | null, pos?: { top: number, isMe: boolean }) => void;
  onRetryMessage: (msg: any) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onVibrate: (pattern: number | number[]) => void;
}

export const MessageBubble = React.memo(({
  msg,
  userId,
  isNew,
  isGroupStart,
  isGroupEnd,
  activeReactionId,
  onSetReplyingTo,
  onSetActiveReactionId,
  onRetryMessage,
  onToggleReaction,
  onVibrate,
}: MessageBubbleProps) => {
  const isMe = msg.authorId === userId;
  const isOnlyEmoji = msg.content && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(msg.content);

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handlePressStart = useCallback((e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    pressTimer.current = setTimeout(() => {
      onVibrate([20]);
      onSetActiveReactionId(msg.id, { top: clientY, isMe: msg.authorId === userId });
    }, 400);
  }, [msg.id, msg.authorId, userId, onSetActiveReactionId, onVibrate]);

  const handlePressEnd = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }, []);

  const lastTapRef = useRef<number>(0);
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      const hasHeart = msg.reactions?.some((r: any) => r.userId === userId && r.emoji === "❤️");
      if (!hasHeart) {
        onToggleReaction(msg.id, "❤️");
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [msg.id, msg.reactions, userId, onToggleReaction]);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isDraggingX = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    handlePressStart(e);
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isDraggingX.current = false;
    if (bubbleRef.current) {
      bubbleRef.current.style.transition = 'none';
    }
  }, [handlePressStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    handlePressEnd(); 
    if (startXRef.current === null || startYRef.current === null || !bubbleRef.current) return;
    const diffX = e.touches[0].clientX - startXRef.current;
    const diffY = e.touches[0].clientY - startYRef.current;
    
    if (!isDraggingX.current) {
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
        isDraggingX.current = true;
      } else if (Math.abs(diffY) > 5) {
        startXRef.current = null;
        return;
      }
    }

    if (isDraggingX.current) {
      const boundedDiff = Math.max(-60, Math.min(60, diffX));
      bubbleRef.current.style.transform = `translateX(${boundedDiff}px)`;
    }
  }, [handlePressEnd]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    handlePressEnd();
    if (startXRef.current === null || !bubbleRef.current) return;
    const diff = e.changedTouches[0].clientX - startXRef.current;
    if (isDraggingX.current && Math.abs(diff) > 40) {
      onSetReplyingTo(msg);
      onVibrate(20);
    }
    startXRef.current = null;
    isDraggingX.current = false;
    bubbleRef.current.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    bubbleRef.current.style.transform = 'translateX(0px)';
  }, [handlePressEnd, msg, onSetReplyingTo, onVibrate]);

  return (
    <div className={cn("relative flex group items-center w-full max-w-full", isMe ? "justify-end" : "justify-start")}>
    <div 
      ref={bubbleRef}
      className={cn(
        "max-w-[82%] sm:max-w-[72%] leading-relaxed relative cursor-pointer will-change-transform",
        isNew && "animate-enter",
        isOnlyEmoji ? "px-3 pb-1.5 pt-2 text-4xl" : "px-3.5 py-2.5 text-[15px]",
        msg.reactions && msg.reactions.length > 0 && "mb-5",
        isMe 
          ? cn("bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-accent)] text-white rounded-[22px] shadow-sm", isGroupEnd && "rounded-br-[4px]", isGroupStart && "rounded-tr-[12px]") 
          : cn("bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border-strong)] rounded-[22px] shadow-sm", isGroupEnd && "rounded-bl-[4px]", isGroupStart && "rounded-tl-[12px]"),
        msg.pending && "opacity-60",
        activeReactionId === msg.id && "ring-2 ring-[var(--color-accent)]/40"
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        onVibrate([20]);
        onSetActiveReactionId(msg.id, { top: e.clientY, isMe: msg.authorId === userId });
      }}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
    >
      {msg.replyTo && (
        <div className={cn(
          "flex flex-col text-[13px] border-l-2 px-2.5 py-1.5 mb-2 rounded-r-md cursor-pointer overflow-hidden",
          isMe ? "bg-white/15 border-white/50 text-white/90" : "bg-[var(--color-accent-muted)] border-[var(--color-accent)] text-[var(--color-text-secondary)]"
        )}>
          <span className={cn("font-semibold text-xs uppercase mb-0.5", isMe ? "text-white/80" : "text-[var(--color-accent)]")}>
            {msg.replyTo.authorId}
          </span>
          <span className="truncate">{msg.replyTo.content || "Media"}</span>
        </div>
      )}
      {msg.media?.map((m: any, i: number) => {
        const getMediaUrl = (url: string) => {
          if (url.startsWith('http') || url.startsWith('blob:')) return url;
          const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://rudhasi.mooo.com").replace(/\/$/, "");
          const cleanUrl = url.startsWith('/') ? url : `/${url}`;
          return `${apiUrl}${cleanUrl}`;
        };
        const mediaUrl = getMediaUrl(m.url);
        
        return (
          <div key={i} className="mb-2 relative">
            {m.type === 'image' ? (
              <img src={mediaUrl} alt="media" className="rounded-lg max-w-full min-h-[200px] max-h-64 object-cover border border-white/10" />
            ) : (
              <a href={mediaUrl} target="_blank" rel="noreferrer" className="block text-sm break-all underline decoration-current/30 underline-offset-4">{mediaUrl}</a>
            )}
          {msg.uploadProgress !== undefined && msg.pending && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="absolute inset-0 rounded-lg overflow-hidden bg-black/50 backdrop-blur-[2px] flex items-center justify-center border border-white/10 z-10"
            >
               <div className="w-[80%] max-w-[180px] flex flex-col items-center">
                 <div className="w-full flex justify-between items-end mb-2 px-1">
                   <span className="text-white/90 text-xs font-medium tracking-wide">
                     {msg.uploadProgress === 100 ? "Processing..." : "Uploading..."}
                   </span>
                   <span className="text-white font-bold text-xs tabular-nums">
                     {msg.uploadProgress}%
                   </span>
                 </div>
                 <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden relative shadow-inner shadow-black/50 border border-white/5">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${msg.uploadProgress}%` }}
                     transition={{ ease: "easeOut", duration: 0.2 }}
                     className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-light)] rounded-full shadow-[0_0_10px_var(--color-accent)]"
                   />
                 </div>
               </div>
            </motion.div>
          )}
        </div>
        );
      })}
      <div className="flex flex-row items-end justify-between gap-3 mt-0.5 min-w-0">
        <p className="break-words whitespace-pre-wrap min-w-0">{msg.content}</p>
        <div className={cn("flex items-center text-xs space-x-1 font-medium flex-shrink-0 pt-1", isMe ? "text-white/70" : "text-[var(--color-text-muted)]")}>
          <span>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
            <span className="flex items-center ml-0.5 text-xs">
              {msg.failed ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onRetryMessage(msg); }}
                  aria-label="Retry sending message"
                  className="flex items-center space-x-0.5 text-red-300 hover:text-white transition-colors"
                >
                  <RotateCcw size={10} />
                  <span className="text-xs">Failed</span>
                </button>
              ) : msg.pending ? (
                <span className="opacity-70">◷</span>
              ) : msg.readReceipt ? (
                <motion.span key="read" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="text-white font-bold leading-none">✓✓</motion.span>
              ) : (
                <motion.span key="sent" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="opacity-70 leading-none">✓</motion.span>
              )}
            </span>
          )}
        </div>
      </div>

      {msg.reactions && msg.reactions.length > 0 && (
        <div className="absolute -bottom-2.5 flex flex-wrap gap-1 z-30" style={{ [isMe ? 'right' : 'left']: '15px' }}>
          {Object.entries(
            msg.reactions.reduce((acc: any, r: any) => {
              if (!acc[r.emoji]) acc[r.emoji] = { count: 0, me: false };
              acc[r.emoji].count++;
              if (r.userId === userId) acc[r.emoji].me = true;
              return acc;
            }, {})
          ).map(([emoji, data]: [string, any]) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                onToggleReaction(msg.id, emoji);
              }}
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-[13px] shadow-sm border transition-transform active:scale-90",
                data.me 
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" 
                  : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
              )}
            >
              <span className="leading-none transform translate-y-[0.5px]">{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
    
    {/* Desktop Hover Reply Button */}
    <div className={cn(
      "hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity items-center px-1",
      isMe ? "order-first" : "order-last"
    )}>
      <button
        onClick={() => onSetReplyingTo(msg)}
        className="p-1.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-accent)] bg-[var(--color-surface-raised)]/50 hover:bg-[var(--color-surface-raised)] shadow-sm border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer"
        title="Reply"
      >
        <Reply size={15} />
      </button>
    </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.msg === next.msg &&
    prev.isGroupStart === next.isGroupStart &&
    prev.isGroupEnd === next.isGroupEnd &&
    prev.activeReactionId === next.activeReactionId &&
    prev.isNew === next.isNew
  );
});
