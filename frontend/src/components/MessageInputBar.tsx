import React, { useCallback, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputBarProps {
  replyingTo: any | null;
  onCancelReply: () => void;
  onSend: (text: string) => void;
  onTyping: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉", "✨", "💯"];

export const MessageInputBar = React.memo(({
  replyingTo,
  onCancelReply,
  onSend,
  onTyping,
  onFileUpload,
  onFocus,
}: MessageInputBarProps) => {
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const myTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.focus();
    }
  }, [text, onSend]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    if (!myTypingTimeoutRef.current) {
      onTyping();
      myTypingTimeoutRef.current = setTimeout(() => {
        myTypingTimeoutRef.current = null;
      }, 1500);
    }
  }, [onTyping]);

  return (
    <div className="absolute bottom-0 left-0 w-full px-3 sm:px-4 pb-4 sm:pb-6 pt-2 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)] to-transparent z-40 pointer-events-none">
      <div className="max-w-3xl mx-auto relative flex flex-col justify-end pointer-events-auto">
        {replyingTo && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-2 mx-2 p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg flex items-center justify-between backdrop-blur-md relative z-0"
          >
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-1 h-8 bg-[var(--color-accent)] rounded-full flex-shrink-0" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[var(--color-accent)] dark:text-[var(--color-accent-light)] font-semibold text-xs uppercase mb-0.5">Reply to {replyingTo.authorId}</span>
                <span className="text-[var(--color-text-secondary)] truncate text-[13px]">{replyingTo.content || "Media"}</span>
              </div>
            </div>
            <button 
              aria-label="Cancel reply"
              className="w-8 h-8 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-accent-muted)] rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex-shrink-0"
              onClick={onCancelReply}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </motion.div>
        )}

        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-2 right-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-2 shadow-lg flex flex-wrap gap-2 max-w-[250px]"
            >
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    setText(prev => prev + emoji);
                    setShowEmojiPicker(false);
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                  className="text-2xl hover:bg-[var(--color-accent-muted)] p-1.5 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="flex items-end w-full min-h-[52px] px-2 py-1.5 rounded-[26px] border border-[var(--color-border)] shadow-[var(--shadow-md)] bg-[var(--color-surface-raised)] backdrop-blur-md relative z-10"
        >
          <button 
            aria-label="Attach file"
            className="w-10 h-10 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors active:scale-[0.94] flex-shrink-0 mb-0.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={onFileUpload} 
            accept="image/*,video/*,audio/*,application/pdf"
          />
          
          <textarea
            ref={textareaRef}
            name="chatMessage"
            id="chat-input"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            rows={1}
            className="flex-1 bg-transparent border-none outline-none focus:ring-0 focus-visible:outline-none px-2 text-[var(--color-text)] text-[15px] placeholder:text-[var(--color-text-muted)] py-2.5 min-w-0 resize-none max-h-[120px]"
            style={{ boxShadow: 'none' }}
            placeholder="Message..."
            value={text}
            onChange={handleInput}
            onFocus={onFocus}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <button 
            aria-label="Emoji picker"
            className={cn("w-10 h-10 flex items-center justify-center transition-colors active:scale-[0.94] flex-shrink-0 mb-0.5", showEmojiPicker ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]")}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={20} />
          </button>

          <button 
            onClick={handleSend}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Send message"
            className={cn(
              "w-9 h-9 ml-1 mb-1 rounded-full flex items-center justify-center transition-all active:scale-[0.94] flex-shrink-0",
              text.trim() ? "bg-[var(--color-accent)] text-white shadow-[var(--shadow-sm)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
            )}
          >
            <Send size={16} className={cn(text.trim() && "ml-0.5")} />
          </button>
        </div>
      </div>
    </div>
  );
});
