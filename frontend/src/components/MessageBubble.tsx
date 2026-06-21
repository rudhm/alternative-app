import React, { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  msg: any;
  userId: string | null;
  isNew: boolean;
  activeReactionId: string | null;
  onSetReplyingTo: (msg: any) => void;
  onSetActiveReactionId: (id: string | null) => void;
  onRetryMessage: (msg: any) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onVibrate: (pattern: number | number[]) => void;
}

export const MessageBubble = React.memo(({
  msg,
  userId,
  isNew,
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

  const handlePressStart = useCallback(() => {
    pressTimer.current = setTimeout(() => {
      onVibrate([20]);
      onSetActiveReactionId(msg.id);
    }, 400);
  }, [msg.id, onSetActiveReactionId, onVibrate]);

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

  return (
    <motion.div 
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.2, right: 0.2 }}
      onDragEnd={(e, info) => {
        if (Math.abs(info.offset.x) > 40) {
          onSetReplyingTo(msg);
          onVibrate(20);
        }
      }}
      initial={isNew ? { opacity: 0, scale: 0.5, y: 20 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{ originX: isMe ? 1 : 0, originY: 1 }}
      className={cn(
        "max-w-[82%] sm:max-w-[72%] leading-relaxed relative cursor-pointer",
        isOnlyEmoji ? "px-3 pb-1.5 pt-2 text-4xl" : "px-3.5 py-2.5 text-[15px]",
        msg.reactions && msg.reactions.length > 0 && "mb-5",
        isMe 
          ? "bg-[var(--color-accent)] text-white rounded-[20px] rounded-br-md shadow-[var(--shadow-md)]" 
          : "bg-[var(--color-surface)] text-[var(--color-text)] rounded-[20px] rounded-tl-md shadow-[var(--shadow-sm)] border border-[var(--color-border)]",
        msg.pending && "opacity-60",
        activeReactionId === msg.id && "ring-2 ring-[var(--color-accent)]/40"
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        onVibrate([20]);
        onSetActiveReactionId(msg.id);
      }}
      onClick={handleTap}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchMove={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
    >
      {msg.replyTo && (
        <div className={cn(
          "flex flex-col text-[13px] border-l-2 px-2.5 py-1.5 mb-2 rounded-r-md cursor-pointer overflow-hidden",
          isMe ? "bg-white/15 border-white/50 text-white/90" : "bg-[var(--color-accent-muted)] border-[var(--color-accent)] text-[var(--color-text-secondary)]"
        )}>
          <span className={cn("font-semibold text-[10px] uppercase mb-0.5", isMe ? "text-white/80" : "text-[var(--color-accent)]")}>
            {msg.replyTo.authorId}
          </span>
          <span className="truncate">{msg.replyTo.content || "Media"}</span>
        </div>
      )}
      {msg.media?.map((m: any, i: number) => (
        <div key={i} className="mb-2">
          {m.type === 'image' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={m.url} alt="media" className="rounded-lg max-w-full max-h-64 object-cover border border-white/10" />
          ) : (
            <a href={m.url} target="_blank" rel="noreferrer" className="block text-sm break-all underline decoration-current/30 underline-offset-4">{m.url}</a>
          )}
        </div>
      ))}
      <div className="flex flex-row items-end justify-between gap-3 mt-0.5 min-w-0">
        <p className="break-words whitespace-pre-wrap min-w-0">{msg.content}</p>
        <div className={cn("flex items-center text-[10px] space-x-1 font-medium flex-shrink-0 pt-1", isMe ? "text-white/70" : "text-[var(--color-text-muted)]")}>
          <span>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
            <span className="flex items-center ml-0.5 text-[11.5px]">
              {msg.failed ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onRetryMessage(msg); }}
                  aria-label="Retry sending message"
                  className="flex items-center space-x-0.5 text-red-300 hover:text-white transition-colors"
                >
                  <RotateCcw size={10} />
                  <span className="text-[9px]">Failed</span>
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
                "flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] shadow-sm border transition-transform active:scale-90",
                data.me 
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" 
                  : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
              )}
            >
              <span>{emoji}</span>
              <span className={cn("font-medium", data.me ? "text-white" : "text-[var(--color-text-muted)]")}>{data.count}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
});
