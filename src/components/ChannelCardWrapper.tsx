import React from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { Channel } from '../types';
import useLongPress from '../hooks/useLongPress';

interface ChannelCardWrapperProps {
  key?: React.Key;
  channel: Channel;
  onClick: (channel: Channel) => void;
  onLongPress?: (channel: Channel) => void;
  className?: string;
  children: React.ReactNode;
  whileHover?: any;
  whileTap?: any;
  transition?: any;
}

export default function ChannelCardWrapper({ 
  channel, 
  onClick, 
  onLongPress, 
  className, 
  children,
  whileHover = { 
    scale: 1.06, 
    y: -6,
    borderColor: "rgba(229, 9, 20, 0.45)",
    boxShadow: "0 20px 35px rgba(229, 9, 20, 0.25)"
  },
  whileTap = { scale: 0.97, y: 0 },
  transition = { type: "spring", stiffness: 300, damping: 20 }
}: ChannelCardWrapperProps) {
  const { isHolding, ...longPressEvents } = useLongPress({
    onLongPress: () => onLongPress?.(channel),
    onClick: () => onClick(channel)
  });

  return (
    <motion.div
      tabIndex={0}
      data-nav-id={`channel-${channel.id}`}
      whileHover={whileHover}
      whileTap={whileTap}
      transition={transition}
      style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
      className={cn(
        className, 
        "focus:outline-none focus:ring-4 focus:ring-red-650/60 focus:scale-105 focus:z-10 focus:shadow-[0_0_25px_rgba(0,168,225,0.4)]",
        isHolding && "scale-95 bg-white/5"
      )}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick(channel);
      }}
      {...longPressEvents}
    >
      {isHolding && (
        <div className="absolute inset-0 rounded-[inherit] border-2 border-[#00A8E1] overflow-hidden pointer-events-none z-50">
          <div className="h-1 bg-[#00A8E1] animate-[long-press-progress_600ms_linear_forwards]" style={{ transformOrigin: 'left' }} />
        </div>
      )}
      {children}
    </motion.div>
  );
}
