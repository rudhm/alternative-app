"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useWs } from "@/components/WsProvider";
import { ChatRoom } from "@/components/ChatRoom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Star, Sparkles } from "lucide-react";
import { Playfair_Display, Inter } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"] });

// Canvas Starfield Component
const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { x: number; y: number; r: number; opacity: number; speed: number; pulse: number }[] = [];
    let shootingStars: { x: number; y: number; len: number; speed: number; opacity: number }[] = [];

    const resize = () => {
      // Use visual viewport, but cap resolution for mobile performance
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // Cap DPR at 1.5
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
      initStars();
    };

    const initStars = () => {
      stars = [];
      // Cap max stars to 150 for massive performance boost on mobile
      const numStars = Math.min(150, Math.floor((window.innerWidth * window.innerHeight) / 6000));
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 1.2 + 0.3, // Smaller radius
          opacity: Math.random(),
          speed: Math.random() * 0.03 + 0.01,
          pulse: Math.random() * 0.03 + 0.01,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Twinkling background stars
      ctx.fillStyle = "rgba(255, 220, 240, 0.8)";
      stars.forEach((s) => {
        s.opacity += s.pulse;
        if (s.opacity > 1 || s.opacity < 0.2) s.pulse = -s.pulse;
        s.y -= s.speed;
        if (s.y < 0) {
          s.y = window.innerHeight;
          s.x = Math.random() * window.innerWidth;
        }

        ctx.globalAlpha = s.opacity;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Occasional shooting stars
      if (Math.random() < 0.005) {
        shootingStars.push({
          x: Math.random() * window.innerWidth,
          y: 0,
          len: Math.random() * 50 + 20,
          speed: Math.random() * 8 + 8,
          opacity: 1,
        });
      }

      ctx.lineWidth = 1;
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x -= ss.speed;
        ss.y += ss.speed;
        ss.opacity -= 0.03;

        if (ss.opacity <= 0) {
          shootingStars.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = ss.opacity;
        ctx.strokeStyle = "#ffe6fa";
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x + ss.len, ss.y - ss.len);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-50" />;
};

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
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

  const handleLogin = async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");

    const val = inputValue.toLowerCase().trim();
    if (!val) {
      setError("Please enter your name.");
      setShakeKey((k) => k + 1);
      return;
    }

    let selectedUserId: "Hasi" | "Rudh" | null = null;
    
    if (val === "has" || val === "hasi") {
      selectedUserId = "Hasi";
    } else if (val === "rud" || val === "rudh") {
      selectedUserId = "Rudh";
    }

    if (!selectedUserId) {
      setError("I don't recognize that whisper...");
      setShakeKey((k) => k + 1);
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
        throw new Error("Authentication failed");
      }
      
      const data = await res.json();
      connect(selectedUserId, data.token || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setShakeKey((k) => k + 1);
    }
  };

  if (userId) {
    return <ChatRoom />;
  }

  if (isChecking) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-screen bg-[#07050e] relative overflow-hidden">
        <div className="w-10 h-10 border-[3px] border-rose-500/20 border-t-rose-400 rounded-full animate-spin z-10" />
      </main>
    );
  }

  const titleChars = Array.from("Classified");

  return (
    <main className={`flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-[#07050e] text-slate-100 ${inter.className}`}>
      
      {/* Texture Grain - Using CSS gradient for extreme mobile performance instead of SVG mix-blend-overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_100%)]"></div>

      {/* Nebula Orbs - Replaced filter:blur with radial gradients for 10x better GPU performance */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        {/* Deep Plum */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6], x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[90vw] h-[90vw] max-w-[800px] max-h-[800px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(88,28,135,0.3) 0%, rgba(88,28,135,0) 70%)' }}
        />
        {/* Violet */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5], x: [0, 30, 0], y: [0, -15, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/4 right-1/4 w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.25) 0%, rgba(109,40,217,0) 70%)' }}
        />
        {/* Amber/Rose */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4], x: [0, -30, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-1/4 left-1/4 w-[80vw] h-[80vw] max-w-[700px] max-h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(225,29,72,0.15) 0%, rgba(217,119,6,0.1) 40%, transparent 70%)' }}
        />
      </div>

      <Starfield />

      {/* Inner Glow Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 w-[92%] max-w-[24rem] p-8 md:p-10 mx-auto rounded-3xl bg-[#ffffff05] backdrop-blur-xl border border-[#ffffff15] shadow-2xl flex flex-col relative"
      >
        {/* Decorative Monogram */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#120e1c] border border-rose-400/20 rounded-full flex items-center justify-center shadow-lg z-20">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Lock size={16} className="text-rose-300/80" />
          </motion.div>
        </div>

        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-400/30 to-transparent" />
        
        <div className="text-center mt-3 mb-7">
          <div className="overflow-hidden flex justify-center mb-1">
            <h1 className={`text-[28px] md:text-3xl tracking-wide text-rose-50 flex ${playfair.className}`}>
              {titleChars.map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.05, ease: "easeOut" }}
                >
                  {char}
                </motion.span>
              ))}
            </h1>
          </div>
          
          <div className="h-[20px] overflow-hidden relative mt-1">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-sm font-medium text-rose-200/60 tracking-wider"
            >
              Top secret
            </motion.p>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mt-4 opacity-40">
            <div className="h-px w-10 md:w-12 bg-gradient-to-r from-transparent to-rose-300" />
            <Sparkles size={12} className="text-rose-300" />
            <div className="h-px w-10 md:w-12 bg-gradient-to-l from-transparent to-rose-300" />
          </div>
        </div>

        <motion.form 
          onSubmit={handleLogin} 
          className="w-full space-y-6"
          key={shakeKey}
          animate={shakeKey > 0 ? { x: [-5, 5, -4, 4, -2, 2, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="relative group">
            {/* Focus Bloom Ring - Removed CSS blur for mobile performance */}
            <div className={`absolute -inset-0.5 rounded-xl transition-opacity duration-300 ${isFocused ? 'opacity-100 bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'opacity-0'}`} />
            
            <div className="relative">
              <input
                id="credential"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="peer w-full bg-[#0a0812]/90 border border-white/[0.08] rounded-xl px-5 pt-6 pb-2 text-[15px] font-medium text-white transition-all duration-300 focus:outline-none focus:border-rose-400/40 focus:bg-[#0f0b18]"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder=" "
              />
              {/* Floating Label */}
              <label 
                htmlFor="credential"
                className="absolute left-5 top-4 text-slate-400 text-[15px] transition-all duration-300 peer-focus:-translate-y-2.5 peer-focus:text-xs peer-focus:text-rose-300/80 peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-rose-300/80 pointer-events-none"
              >
                Who goes there?
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <div className="relative flex items-center justify-center w-4 h-4 border border-rose-300/30 rounded transition-colors bg-[#0a0812]">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <motion.div
                  initial={false}
                  animate={{ opacity: rememberMe ? 1 : 0, scale: rememberMe ? 1 : 0.5 }}
                  className="w-2 h-2 bg-rose-400 rounded-[2px]"
                />
              </div>
              <span className="text-xs text-rose-200/50 group-hover:text-rose-200/80 transition-colors">Remember me</span>
            </label>
            <span className="text-xs text-rose-200/30">Just the two of us</span>
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0, y: -5 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -5 }}
                className="text-rose-400/90 text-xs font-medium text-center !mt-4"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              animate={{
                boxShadow: [
                  "0 0 10px rgba(244,63,94,0.1)",
                  "0 0 20px rgba(244,63,94,0.25)",
                  "0 0 10px rgba(244,63,94,0.1)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              type="submit"
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-rose-600/90 via-rose-500/90 to-purple-600/90 text-white font-medium text-[15px] py-3.5 transition-all border border-rose-400/20 group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
              Enter Sanctuary
            </motion.button>
          </div>
        </motion.form>
      </motion.div>
      
      {/* Footer Tagline */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-6 md:bottom-8 text-rose-200/30 text-xs tracking-widest uppercase flex items-center gap-2"
      >
        <Star size={10} />
        Always Private
        <Star size={10} />
      </motion.p>
    </main>
  );
}
