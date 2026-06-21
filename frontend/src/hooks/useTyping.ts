import { useState, useEffect, useCallback, useRef } from "react";

export function useTyping(lastMessage: any, sendMessage: (msg: any) => void) {
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (lastMessage?.type === 'typing') {
       setTypingUser(lastMessage.userId);
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    }
  }, [lastMessage]);

  const handleTyping = useCallback(() => {
    sendMessage({ type: "typing", payload: {} });
  }, [sendMessage]);

  return { typingUser, handleTyping };
}
