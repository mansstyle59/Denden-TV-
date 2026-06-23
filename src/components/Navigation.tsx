import React, { useState, useRef, useEffect } from 'react';
import { Home, Tv2, Search, Clapperboard, SlidersHorizontal, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { DeviceType } from '../hooks/useDeviceType';
import DendenLogo from './DendenLogo';
import useLongPress from '../hooks/useLongPress';

interface NavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed?: boolean;
  deviceType: DeviceType;
}

interface NavigationButtonProps {
  onClick: () => void;
  onLongPress?: () => void;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  key?: React.Key;
}

function NavigationButton({ onClick, onLongPress, className, style, children }: NavigationButtonProps) {
  if (onLongPress) {
    return (
      <NavigationButtonWithLongPress
        onClick={onClick}
        onLongPress={onLongPress}
        className={className}
        style={style}
      >
        {children}
      </NavigationButtonWithLongPress>
    );
  }

  return (
    <button onClick={onClick} className={className} style={style}>
      {children}
    </button>
  );
}

function NavigationButtonWithLongPress({ onClick, onLongPress, className, style, children }: NavigationButtonProps) {
  const { isHolding, ...longPressEvents } = useLongPress({
    onLongPress: () => {
      if (onLongPress) onLongPress();
    },
    onClick: onClick,
    ms: 800
  });

  return (
    <button
      className={cn(className, isHolding && "scale-95 bg-white/5")}
      style={style}
      {...longPressEvents}
    >
      {isHolding && (
        <div className="absolute inset-0 rounded-[inherit] border-2 border-red-500 overflow-hidden pointer-events-none z-50">
          <div className="h-1 bg-red-500 animate-[long-press-progress_800ms_linear_forwards]" style={{ transformOrigin: 'left' }} />
        </div>
      )}
      {children}
    </button>
  );
}

const defaultMenuItems = [
  { id: 'home', icon: Home, label: 'Accueil' },
  { id: 'channels', icon: Tv2, label: 'Chaînes' },
  { id: 'movies', icon: Clapperboard, label: 'Films' },
  { id: 'search', icon: Search, label: 'Recherche' },
];

export default function Navigation({ activeSection, onSectionChange, isCollapsed = false, deviceType }: NavigationProps) {
  const isMobile = deviceType === 'mobile';

  const menuItems = React.useMemo(() => {
    return defaultMenuItems;
  }, []);

  if (isMobile) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50">
        <nav className="bg-[#111111]/90 backdrop-blur-3xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)] rounded-full flex items-center justify-around px-2 py-2">
          {menuItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <NavigationButton
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center relative w-[18%] min-w-[3.5rem] h-14 rounded-full transition-all focus:outline-none group",
                  isActive ? "text-white" : "text-white/40 hover:text-white/80"
                )}
                style={{ touchAction: 'none' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-red-600/10 rounded-full border border-red-500/20"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
                <div className={cn("relative z-10 mb-1 transition-all duration-300", isActive ? "text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "group-hover:scale-105")}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[9px] font-black tracking-widest relative z-10 uppercase transition-colors duration-300", 
                  isActive ? "text-white" : "text-white/50"
                )}>{item.label}</span>
              </NavigationButton>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <nav className={cn(
      "bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col transition-all duration-300 z-50 select-none relative",
      deviceType === 'tv' ? "w-80" : (isCollapsed ? "w-20" : "w-64")
    )}>
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-red-650/5 to-transparent pointer-events-none" />
      
      <div className="p-8 relative z-10 border-b border-white/5 bg-black/40">
        {isCollapsed && deviceType !== 'tv' ? (
          <DendenLogo variant="icon-only" size={32} />
        ) : (
          <DendenLogo variant="horizontal" size={40} />
        )}
      </div>

      <div className="flex-1 px-5 space-y-3 mt-8 overflow-y-auto scrollbar-hide relative z-10 w-full">
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <NavigationButton
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center px-4 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest focus:outline-none relative overflow-hidden group cursor-pointer",
                isActive ? "text-white" : "text-white/40 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="desktop-nav-indicator"
                  className="absolute inset-0 bg-red-600/10 rounded-2xl border border-red-500/20"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              {!isActive && (
                <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
              
              <div className="relative z-10 flex items-center gap-4 w-full">
                <div className={cn("transition-all duration-300", isActive ? "text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "group-hover:scale-105")}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                </div>
                {(!isCollapsed || deviceType === 'tv') && <span className="truncate">{item.label}</span>}
              </div>
            </NavigationButton>
          );
        })}
      </div>

      <div className="p-6 relative z-10 border-t border-white/5 mt-auto bg-black/20">
        <button
          onClick={() => onSectionChange('settings')}
          className={cn(
            "w-full flex items-center px-4 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest relative overflow-hidden group cursor-pointer",
            activeSection === 'settings' ? "text-white" : "text-white/40 hover:text-white"
          )}
        >
          {activeSection === 'settings' && (
            <motion.div
              layoutId="desktop-nav-indicator"
              className="absolute inset-0 bg-red-600/10 rounded-2xl border border-red-500/20"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          {activeSection !== 'settings' && (
             <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          )}
          <div className="relative z-10 flex items-center gap-4 w-full">
            <div className={cn("transition-all duration-300", activeSection === 'settings' ? "text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "group-hover:rotate-45")}>
              <SlidersHorizontal size={22} strokeWidth={activeSection === 'settings' ? 2.5 : 2} className="flex-shrink-0" />
            </div>
            {(!isCollapsed || deviceType === 'tv') && <span>Réglages</span>}
          </div>
        </button>
      </div>
    </nav>
  );
}
