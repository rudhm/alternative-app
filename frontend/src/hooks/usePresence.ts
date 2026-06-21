import { useState, useEffect } from "react";

const formatLastSeen = (isoStr: string) => {
  const d = new Date(isoStr);
  const now = new Date();
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `today at ${time}`;
  return `${d.toLocaleDateString()} at ${time}`;
};

export function usePresence(lastMessage: any, userId: string | null, wsStatus: string) {
  const [otherStatus, setOtherStatus] = useState<"online" | "offline">("offline");
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (lastMessage?.type === 'presence') {
       if (lastMessage.userId !== userId) {
         setOtherStatus(lastMessage.status);
         if (lastMessage.lastSeen) setOtherLastSeen(lastMessage.lastSeen);
       }
    }
  }, [lastMessage, userId]);

  const displayStatus = wsStatus !== "connected" 
    ? wsStatus 
    : otherStatus === "online" 
      ? "online" 
      : otherLastSeen 
        ? `Was here at ${formatLastSeen(otherLastSeen)}`
        : "offline";

  return { otherStatus, displayStatus };
}
