import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface DendenLogoProps {
  variant?: 'horizontal' | 'icon-only' | 'splash' | 'compact';
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function DendenLogo({ 
  variant = 'horizontal', 
  size = 40, 
  className,
  animate = false 
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
        className={cn(
          "overflow-visible",
          animate && "animate-pulse"
        )}
      >
        <defs>
          <radialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00A8E1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00A8E1" stopOpacity="0" />
          </radialGradient>
          
          <linearGradient id="tvNeon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00A8E1" />
            <stop offset="49%" stopColor="#00A8E1" />
            <stop offset="51%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          <filter id="neonBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Global background glow for splash */}
        {variant === 'splash' && (
          <circle cx="50" cy="50" r="45" fill="url(#blueGlow)" opacity="0.3" />
        )}

        {/* TV Frame Shape */}
        <rect
          x="15"
          y="20"
          width="70"
          height="45"
          rx="10"
          stroke="url(#tvNeon)"
          strokeWidth="4"
          filter="url(#neonBlur)"
          className="transition-all duration-300"
        />

        {/* TV Stand / Base Connector */}
        <rect x="47" y="65" width="6" height="5" fill="#00A8E1" />
        <rect x="35" y="70" width="30" height="3" rx="1.5" fill="#00A8E1" />

        {/* Play Button inside TV */}
        <path
          d="M44 32.5L62 42.5L44 52.5V32.5Z"
          fill="white"
          className="drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
        />
      </svg>
    );
  };

  if (variant === 'icon-only') {
    return (
      <div className={cn("inline-flex items-center justify-center", className)}>
        {renderIcon()}
      </div>
    );
  }

  if (variant === 'splash') {
    return (
      <div className={cn("flex flex-col items-center justify-center text-center", className)}>
        {/* Rounded Icon Background mimicking the App Icon */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-64 h-64 bg-black rounded-[60px] border border-white/5 flex items-center justify-center shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] mb-12"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[60px]" />
          <div className="scale-[2.5]">
            {renderIcon()}
          </div>
          
          {/* Red/Blue floor glow mimicking the icon's bottom accents */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden rounded-b-[60px] pointer-events-none">
             <div className="absolute bottom-0 left-0 w-1/2 h-4 bg-blue-600/20 blur-xl" />
             <div className="absolute bottom-0 right-0 w-1/2 h-4 bg-red-600/20 blur-xl" />
          </div>
        </motion.div>

        <div className="space-y-6">
          <h1 className="text-white text-6xl lg:text-8xl font-black tracking-tighter uppercase italic leading-none">
            DENDEN
          </h1>
          <div className="flex items-center justify-center gap-4">
             <div className="h-1 w-12 bg-blue-500 rounded-full" />
             <span className="text-4xl lg:text-5xl font-black text-blue-500 italic uppercase tracking-widest">TV</span>
             <div className="h-1 w-12 bg-blue-500 rounded-full" />
          </div>
          <p className="text-white/20 text-xs lg:text-sm font-bold tracking-[0.5em] uppercase mt-8 animate-pulse">
            L'EXPÉRIENCE ULTIME
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {renderIcon()}
        <div className="flex flex-col leading-none">
          <span className="text-white font-black text-sm tracking-tighter uppercase italic">
            DENDEN
          </span>
          <div className="flex items-center gap-1 scale-[0.6] origin-left">
             <div className="h-0.5 w-4 bg-blue-500 rounded-full" />
             <span className="text-blue-500 font-black not-italic tracking-widest">TV</span>
             <div className="h-0.5 w-4 bg-blue-500 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Active Horizontal Variant matching Molotov / Netflix standard header
  return (
    <div className={cn("flex items-center gap-4 select-none", className)}>
      <div className="relative flex items-center">
        {renderIcon()}
        {/* Subtle backing shadow glow */}
        <div className="absolute inset-0 bg-[#00A8E1]/10 rounded-full blur-lg pointer-events-none" />
      </div>
      <div className="flex flex-col justify-center">
        <h2 className="text-white text-2xl lg:text-3xl font-black tracking-tighter leading-none flex flex-col italic uppercase">
          DENDEN
          <div className="flex items-center gap-2 mt-0.5 scale-75 origin-left">
             <div className="h-0.5 w-6 bg-blue-500 rounded-full" />
             <span className="text-blue-500 font-black not-italic tracking-widest">TV</span>
             <div className="h-0.5 w-6 bg-blue-500 rounded-full" />
          </div>
        </h2>
      </div>
    </div>
  );
}
