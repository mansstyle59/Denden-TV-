import React from "react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface DendenLogoProps {
  variant?: "horizontal" | "icon-only" | "splash" | "compact";
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function DendenLogo({
  variant = "horizontal",
  size = 40,
  className,
  animate = false,
}: DendenLogoProps) {
  // Icon only component - matching the new blue neon TV design
  const renderIcon = () => {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("overflow-visible", animate && "animate-pulse")}
      >
        <defs>
          <radialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00A8E1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00A8E1" stopOpacity="0" />
          </radialGradient>

          <filter id="neonBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Global background glow for splash */}
        {variant === "splash" && (
          <circle cx="50" cy="50" r="45" fill="url(#blueGlow)" opacity="0.3" />
        )}

        {/* TV Frame Shape */}
        <rect
          x="16"
          y="24"
          width="68"
          height="44"
          rx="8"
          stroke="#00A8E1"
          strokeWidth="4"
          filter="url(#neonBlur)"
          className="transition-all duration-300"
        />

        {/* TV Stand / Base Connector */}
        <rect
          x="46"
          y="68"
          width="8"
          height="4"
          fill="#00A8E1"
          filter="url(#neonBlur)"
        />
        <rect
          x="36"
          y="72"
          width="28"
          height="4"
          rx="2"
          fill="#00A8E1"
          filter="url(#neonBlur)"
        />

        {/* Play Button inside TV */}
        <path
          d="M43 34L60 46L43 58V34Z"
          fill="#00A8E1"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
          filter="url(#neonBlur)"
        />
      </svg>
    );
  };

  if (variant === "icon-only") {
    return (
      <div className={cn("inline-flex items-center justify-center", className)}>
        {renderIcon()}
      </div>
    );
  }

  if (variant === "splash") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center",
          className,
        )}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          {renderIcon()}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <h1
            className="text-white text-6xl lg:text-7xl font-black tracking-tight uppercase italic leading-none"
            style={{
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            DENDEN
          </h1>
          <div className="flex items-center gap-4 mt-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 40 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="h-1 bg-[#00A8E1] rounded-full"
            />
            <span className="text-[#00A8E1] font-black text-2xl tracking-[0.2em] uppercase">
              TV
            </span>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 40 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="h-1 bg-[#00A8E1] rounded-full"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {renderIcon()}
        <div className="flex flex-col leading-none">
          <span
            className="text-white text-xl font-black tracking-tight uppercase italic leading-none"
            style={{
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            DENDEN
          </span>
          <div className="flex items-center gap-1.5 scale-[0.65] origin-left mt-1">
            <div className="h-0.5 w-5 bg-[#00A8E1] rounded-full" />
            <span className="text-[#00A8E1] font-black not-italic tracking-widest uppercase">
              TV
            </span>
            <div className="h-0.5 w-5 bg-[#00A8E1] rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Active Horizontal Variant
  return (
    <div className={cn("flex items-center gap-4 select-none", className)}>
      <div className="relative flex items-center">
        {renderIcon()}
        {/* Subtle backing shadow glow */}
        <div className="absolute inset-0 bg-[#00A8E1]/10 rounded-full blur-lg pointer-events-none" />
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex flex-col">
          <h2
            className="text-white text-3xl lg:text-4xl font-black tracking-tight leading-none uppercase italic"
            style={{
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            DENDEN
          </h2>
          <div className="flex items-center gap-2 mt-1 scale-75 origin-left">
            <div className="h-0.5 w-6 bg-[#00A8E1] rounded-full" />
            <span className="text-[#00A8E1] font-black not-italic tracking-widest leading-none uppercase">
              TV
            </span>
            <div className="h-0.5 w-6 bg-[#00A8E1] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
