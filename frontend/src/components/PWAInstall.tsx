"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PWAInstall() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only show if we are not already in standalone
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowInstall(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {showInstall && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setShowInstall(false)}
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-surface z-50 rounded-t-3xl p-6 border-t border-white/10"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-1 bg-white/20 rounded-full mb-2" />
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-2">
                <Download size={32} />
              </div>
              <h3 className="text-xl font-semibold">Install App</h3>
              <p className="text-gray-400 text-sm pb-4">
                Install Cloud Messenger on your home screen for a full-screen, native experience.
              </p>
              <button 
                onClick={handleInstall}
                className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl active:scale-95 transition-transform"
              >
                Add to Home Screen
              </button>
              <button 
                onClick={() => setShowInstall(false)}
                className="w-full py-3 text-gray-500 font-medium active:bg-white/5 rounded-xl transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
