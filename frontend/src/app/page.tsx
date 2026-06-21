"use client";

import { useEffect, useState } from "react";
import { useWs } from "@/components/WsProvider";
import { ChatRoom } from "@/components/ChatRoom";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const { userId, connect } = useWs();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://rudhasi.mooo.com";
        const res = await fetch(`${apiUrl}/api/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.userId) {
            connect(data.userId, data.token || "");
            return;
          }
        }
      } catch {
        // ignore
      }
      setIsChecking(false);
    };
    checkAuth();
  }, [connect]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    
    const val = inputValue.toLowerCase().trim();
    let selectedUserId: "Hasi" | "Rudh" | null = null;
    
    if (val === "has" || val === "hasi") {
      selectedUserId = "Hasi";
    } else if (val === "rud" || val === "rudh") {
      selectedUserId = "Rudh";
    }

    if (!selectedUserId) {
      setError("I don't recognize that whisper...");
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://rudhasi.mooo.com";
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
        credentials: "include"
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Login failed");
      }
      
      const data = await res.json();
      connect(selectedUserId, data.token || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  if (userId) {
    return <ChatRoom />;
  }

  if (isChecking) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-screen bg-[#0f0c1b] relative overflow-hidden">
        <div className="w-10 h-10 border-4 border-rose-400/20 border-t-rose-400 rounded-full animate-spin z-10" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen relative overflow-hidden bg-[#0f0c1b]">
      {/* Animated Gradient Background */}
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, rgba(136, 56, 114, 0.4) 0%, rgba(15, 12, 27, 1) 50%)",
            "radial-gradient(circle at 80% 70%, rgba(205, 115, 128, 0.3) 0%, rgba(15, 12, 27, 1) 50%)",
            "radial-gradient(circle at 50% 10%, rgba(181, 91, 120, 0.35) 0%, rgba(15, 12, 27, 1) 50%)",
            "radial-gradient(circle at 20% 30%, rgba(136, 56, 114, 0.4) 0%, rgba(15, 12, 27, 1) 50%)",
          ],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 z-0"
      />

      {/* Floating Particles/Bokeh */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-rose-300/10 blur-[2px]"
            style={{
              width: Math.random() * 8 + 4 + "px",
              height: Math.random() * 8 + 4 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
            }}
            animate={{
              y: [0, Math.random() * -60 - 30],
              x: [0, Math.random() * 40 - 20],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="z-10 text-center mb-8 space-y-1"
      >
        <p className="text-rose-200/80 font-medium text-sm tracking-widest uppercase">
          Just the two of us
        </p>
        <p className="text-rose-300/50 font-medium text-xs tracking-wider">
          Always private
        </p>
      </motion.div>

      {/* Frosted Glass Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="z-10 w-full max-w-[20rem] p-8 mx-4 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col items-center relative overflow-hidden"
      >
        {/* Subtle Card Highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-300/30 to-transparent" />

        <h1 className="text-2xl font-serif text-rose-100/90 mb-8 tracking-wide text-center">
          Welcome back
        </h1>

        <form onSubmit={handleLogin} className="w-full space-y-5">
          <motion.div 
            animate={error ? { x: [-5, 5, -4, 4, -2, 2, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <input
              type="text"
              placeholder="Whisper it..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-3.5 text-center text-rose-100 placeholder:text-rose-300/30 transition-all focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400/30 focus:bg-white/5 font-medium shadow-inner"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </motion.div>
          
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-rose-400 text-xs font-medium text-center !mt-3"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-gradient-to-r from-rose-500/80 to-rose-400/80 hover:from-rose-400/90 hover:to-rose-300/90 transition-colors py-3.5 rounded-2xl text-sm font-medium text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] border border-rose-300/20"
            >
              Enter
            </motion.button>
          </div>
        </form>
      </motion.div>
    </main>
  );
}

