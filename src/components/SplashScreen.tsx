import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DendenLogo from './DendenLogo';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 600); // Increased smoothness
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 overflow-hidden"
        >
          {/* Subtle Dynamic Background Decoration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-650/10 rounded-full blur-[120px] pointer-events-none"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            <DendenLogo variant="splash" size={90} animate />
          </motion.div>

          {/* Elegant Pulse Loader */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "240px", opacity: 1 }}
            transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
            className="h-[1px] bg-white/10 mt-12 rounded-full relative overflow-hidden"
          >
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="absolute inset-0 bg-red-650 shadow-[0_0_15px_rgba(14,165,233,0.8)]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
