"use client";

import { useWs } from "@/components/WsProvider";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Loader2 } from "lucide-react";

export function NetworkBanner() {
  const { status } = useWs();

  return (
    <AnimatePresence>
      {(status === "disconnected" || status === "connecting") && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`absolute top-16 left-0 w-full flex items-center justify-center space-x-2 py-1.5 px-4 text-xs font-semibold z-30 border-b border-black/5 dark:border-white/10 shadow-sm
            ${status === "disconnected" ? "bg-[var(--color-danger)] text-white" : "bg-[var(--color-warning)] text-[var(--color-text)]"}
          `}
        >
          {status === "disconnected" && <WifiOff size={14} />}
          {status === "connecting" && <Loader2 size={14} className="animate-spin" />}
          <span>
            {status === "disconnected" && "Waiting for network..."}
            {status === "connecting" && "Connecting..."}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
