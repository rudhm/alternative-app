import { useState, useEffect, useCallback, useRef } from "react";
import { vibrate } from "@/lib/vibrate";

export function useMessages({ 
  token, 
  userId, 
  onMessage, 
  sendMessage, 
  parentRef,
  isAtBottom
}: { 
  token: string | null;
  userId: string | null;
  onMessage: (handler: (msg: any) => void) => () => void;
  sendMessage: (msg: any) => void;
  parentRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: React.MutableRefObject<boolean>;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [activeReactionPos, setActiveReactionPos] = useState<{ top: number, isMe: boolean } | null>(null);

  const handleSetActiveReaction = useCallback((id: string | null, pos?: { top: number, isMe: boolean }) => {
    setActiveReactionId(id);
    setActiveReactionPos(pos || null);
  }, []);

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

  useEffect(() => {
    if (!token) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://rudhasi.mooo.com";
        setMessages(prev => {
          const latestMsg = prev.length > 0 ? prev[prev.length - 1] : null;
          const afterParam = latestMsg ? `?after=${latestMsg.id}` : '';
          
          fetch(`${apiUrl}/api/messages${afterParam}`, { 
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include" 
          })
            .then(r => r.json())
            .then(d => {
              if (d.messages) {
                setMessages(currentMsgs => {
                  const existingIds = new Set(currentMsgs.map((m: any) => m.id));
                  const newMsgs = d.messages.filter((m: any) => !existingIds.has(m.id));
                  if (newMsgs.length === 0) return currentMsgs;
                  return [...currentMsgs, ...newMsgs];
                });
              }
            })
            .catch(() => {});
            
          return prev;
        });
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
  }, [nextCursor, isLoadingMore, token, parentRef]);

  useEffect(() => {
    return onMessage((lastMessage: any) => {
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
      } else if (lastMessage?.type === 'read_receipt') {
         const rr = lastMessage.payload;
         setMessages(prev => {
           const idx = prev.findIndex(m => m.id === rr.messageId);
           if (idx === -1) return prev;
           const next = [...prev];
           next[idx] = { ...next[idx], readReceipt: rr };
           return next;
         });
      } else if (lastMessage?.type === 'error') {
         const errPayload = lastMessage.payload;
         if (errPayload?.id) {
           setMessages(prev => {
             const idx = prev.findIndex(m => m.id === errPayload.id);
             if (idx === -1) return prev;
             const next = [...prev];
             next[idx] = { ...next[idx], pending: false, failed: true };
             return next;
           });
         }
      }
    });
  }, [onMessage, userId]);

  const receiptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    messages
      .filter(m => m.authorId !== userId && !m.readReceipt && !m.pending && !receiptedRef.current.has(m.id))
      .forEach(m => {
        receiptedRef.current.add(m.id);
        sendMessage({ type: 'read', payload: { messageId: m.id } });
        setMessages(prev => {
           const idx = prev.findIndex(msg => msg.id === m.id);
           if (idx === -1) return prev;
           const next = [...prev];
           next[idx] = { ...next[idx], readReceipt: { messageId: m.id, userId } };
           return next;
        });
      });
  }, [messages, userId, sendMessage]);

  const toggleReaction = useCallback((msgId: string, emoji: string) => {
    sendMessage({ type: "reaction", payload: { messageId: msgId, emoji } });
    setActiveReactionId(null);
    vibrate(10);
  }, [sendMessage]);

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return;
    
    const msgId = crypto.randomUUID();
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
  }, [replyingTo, sendMessage, userId, isAtBottom]);

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

    const msgId = crypto.randomUUID();
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
        URL.revokeObjectURL(placeholderUrl);
        return;
      }
      const data = await res.json();
      
      sendMessage({
        type: "chat",
        payload: {
          id: msgId,
          content: "",
          media: [data]
        }
      });
      vibrate(10);
      URL.revokeObjectURL(placeholderUrl);
    } catch (err) {
      console.error("Upload failed", err);
      URL.revokeObjectURL(placeholderUrl);
    }
  }, [sendMessage, userId, token]);

  return {
    messages,
    isLoadingMore,
    loadMore,
    replyingTo,
    setReplyingTo,
    activeReactionId,
    activeReactionPos,
    setActiveReactionId: handleSetActiveReaction,
    toggleReaction,
    handleSend,
    retryMessage,
    handleFileUpload,
  };
}
