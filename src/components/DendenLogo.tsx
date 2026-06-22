import React from 'react';
import { cn } from '../lib/utils';

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
  
  // Icon only component - combining TV Frame, Play Button, and Streaming Waves
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
          <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
          
          {/* Metallic / Premium stroke gradient */}
          <linearGradient id="tvStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#333333" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#111111" />
          </linearGradient>

          {/* Premium Denden Blue Gradient for Play Button */}
          <linearGradient id="redPlayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Neon shadow filter for TV screen glow */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer ambient glow for TV mode */}
        {variant === 'splash' && (
          <circle cx="50" cy="50" r="45" fill="url(#redGlow)" className="animate-pulse" />
        )}

        {/* 1. TV Screen Shape (Rounded container) */}
        <rect
          x="12"
          y="18"
          width="76"
          height="54"
          rx="12"
          fill="#000000"
          stroke="url(#tvStroke)"
          strokeWidth="3.5"
          className="transition-all duration-300"
        />

        {/* TV Indicator LED */}
        <circle cx="50" cy="76" r="2.5" fill="#0ea5e9" />
        {/* TV Stand Base */}
        <path d="M40 76 L60 76 L55 82 L45 82 Z" fill="#1A1A1A" stroke="#333" strokeWidth="1" />

        {/* 2. Streaming Waves (Concentric broadcast radiation rings) */}
        {/* Left Waves */}
        <path
          d="M 32 35 A 18 18 0 0 0 32 55"
          stroke="#0ea5e9"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
          className={cn(animate && "animate-[ping_2s_infinite_100ms]")}
        />
        <path
          d="M 24 30 A 28 28 0 0 0 24 60"
          stroke="#0ea5e9"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.3"
          className={cn(animate && "animate-[ping_2.5s_infinite_300ms]")}
        />

        {/* Right Waves */}
        <path
          d="M 68 35 A 18 18 0 0 1 68 55"
          stroke="#0ea5e9"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
          className={cn(animate && "animate-[ping_2s_infinite_100ms]")}
        />
        <path
          d="M 76 30 A 28 28 0 0 1 76 60"
          stroke="#0ea5e9"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.3"
          className={cn(animate && "animate-[ping_2.5s_infinite_300ms]")}
        />

        {/* 3. Deep inner screen container */}
        <rect
          x="17"
          y="23"
          width="66"
          height="44"
          rx="8"
          fill="#060606"
          stroke="#1A1A1A"
          strokeWidth="1.5"
        />

        {/* 4. Play Button Centerpiece */}
        <g filter="url(#neonGlow)">
          <polygon
            points="42,33 65,45 42,57"
            fill="url(#redPlayGrad)"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
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
        {/* Huge Animated TV Glowing Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-[#0ea5e9]/15 rounded-full blur-3xl w-64 h-64 -translate-y-16 -translate-x-12 pointer-events-none" />
          {renderIcon()}
        </div>

        <div className="space-y-4">
          <h1 className="text-white text-5xl lg:text-7xl font-black tracking-tight flex items-center justify-center gap-1.5 font-sans">
            DENDEN
            <span className="relative inline-block ml-2 px-4 py-1.5 bg-[#0ea5e9] text-white text-3xl lg:text-4xl font-extrabold rounded-2xl shadow-[0_4px_25px_rgba(14,165,233,0.4)] tracking-wide border border-white/10 uppercase transform -rotate-1">
              TV
            </span>
          </h1>
          <p className="text-white/40 text-sm lg:text-base font-bold tracking-[0.4em] uppercase font-mono mt-4">
            VOTRE TÉLÉVISION, SANS LIMITES
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {renderIcon()}
        <span className="text-white font-black text-lg tracking-tighter">
          DENDEN<span className="text-[#0ea5e9] font-bold ml-0.5">TV</span>
        </span>
      </div>
    );
  }

  // Active Horizontal Variant matching Molotov / Netflix standard header
  return (
    <div className={cn("flex items-center gap-4 select-none", className)}>
      <div className="relative flex items-center">
        {renderIcon()}
        {/* Subtle backing shadow glow */}
        <div className="absolute inset-0 bg-[#0ea5e9]/10 rounded-full blur-lg pointer-events-none" />
      </div>
      <div className="flex flex-col justify-center">
        <h2 className="text-white text-2xl lg:text-3xl font-black tracking-tighter leading-none flex items-center gap-1.5">
          DENDEN
          <span className="px-2.5 py-0.5 bg-[#0ea5e9] text-white text-sm lg:text-base font-extrabold rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] tracking-normal border border-white/5 uppercase">
            TV
          </span>
        </h2>
        <span className="text-[9px] text-white/30 font-bold uppercase tracking-[0.3em] font-mono mt-1">
          L'EXPÉRIENCE PREMIUM
        </span>
      </div>
    </div>
  );
}
