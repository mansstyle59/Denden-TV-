import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import DendenLogo from "./DendenLogo";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 800); // Crossfade transition
    }, 2800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
        >
          <DendenLogo variant="splash" size={140} animate />
          
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            className="mt-8 w-10 h-0.5 bg-[#00A8FF] rounded-full shadow-[0_0_8px_rgba(0,168,255,0.5)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
