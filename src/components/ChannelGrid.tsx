import React from 'react';
import { motion } from 'motion/react';
import { Star, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Channel } from '../types';
import { DeviceType } from '../hooks/useDeviceType';
import ChannelCardWrapper from './ChannelCardWrapper';

interface ChannelGridProps {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  onChannelLongPress?: (channel: Channel) => void;
  deviceType: DeviceType;
  liveEpg?: { [id: string]: { current: any; next: any; programmeTv?: any } };
}

export default function ChannelGrid({ channels, onChannelSelect, onChannelLongPress, deviceType, liveEpg }: ChannelGridProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-white/40">
        <PlayCircle size={64} className="mb-4 opacity-20" />
        <p>Aucune chaîne disponible</p>
      </div>
    );
  }

  const gridCols = {
    mobile: "grid-cols-2 gap-3",
    tablet: "grid-cols-3 gap-4",
    desktop: "grid-cols-5 gap-6",
    tv: "grid-cols-6 lg:grid-cols-8 gap-6"
  };

  const isMobile = deviceType === 'mobile';

  return (
    <div className={cn("grid", gridCols[deviceType])}>
      {channels.map((channel, i) => {
        const epg = liveEpg?.[channel.id];
        const currentProgram = epg?.programmeTv?.title || epg?.current?.title;
        const progress = epg?.programmeTv?.progress || 0;

        return (
          <motion.div
            key={`${channel.id}-${i}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChannelCardWrapper
              channel={channel}
              onClick={onChannelSelect}
              onLongPress={onChannelLongPress}
              className={cn(
                "group relative bg-[#111111] border-2 border-white/5 cursor-pointer shadow-2xl overflow-hidden transition-all duration-500 hover:border-red-650 focus-within:border-red-650 hover:bg-[#151515] hover:shadow-[0_25px_50px_rgba(229,9,20,0.25)] rounded-[18px]",
                isMobile ? "p-3" : "p-4"
              )}
            >
              {/* Card Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-650/0 to-transparent group-hover:from-red-650/10 transition-all duration-700 pointer-events-none" />
              
              <div className={cn(
                "w-full flex items-center justify-center relative overflow-hidden transition-all duration-500 bg-black/40 rounded-xl",
                isMobile ? "h-24 mb-3" : "h-32 mb-4 group-hover:scale-110"
              )}>
                <img 
                  src={channel.logo || undefined} 
                  alt={channel.name} 
                  className={cn(
                    "object-contain relative z-10 transition-transform duration-700 group-hover:scale-110 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]",
                    isMobile ? "max-h-[70px] max-w-[90%]" : "max-h-[100px] max-w-[90%]"
                  )}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                
                {/* Subtle backlight glow */}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />
              </div>
              
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1.5 bg-red-650 px-2 py-0.5 rounded-lg text-[7px] font-black text-white uppercase tracking-widest shadow-lg">
                       <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                       EN DIRECT
                    </div>
                   <span className={cn(
                    "font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-red-650/40 transition-colors shrink-0", 
                    isMobile ? "text-[6px]" : "text-[8px]"
                  )}>
                    CH {channels.indexOf(channel) + 1}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className={cn(
                    "text-white font-black uppercase tracking-tight line-clamp-1 transition-colors leading-none", 
                    isMobile ? "text-[10px]" : "text-[13px]",
                    "group-hover:text-white"
                  )}>
                    {channel.name}
                  </h4>
                  
                  {currentProgram && !isMobile && (
                    <p className="text-[9px] text-white/40 truncate font-black uppercase tracking-widest leading-none">
                      {currentProgram}
                    </p>
                  )}
                </div>
                
                {progress > 0 && (
                  <div className={cn("w-full bg-white/5 rounded-full overflow-hidden shrink-0", isMobile ? "h-[3px] mt-1.5" : "h-1.5 mt-2")}>
                    <div 
                      className="h-full bg-red-650 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(229,9,20,0.6)]" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/5">
                  <span className={cn(
                    "font-black uppercase tracking-[0.3em] truncate text-white/20", 
                    isMobile ? "text-[6px]" : "text-[8px]"
                  )}>
                    {channel.category}
                  </span>
                  <div className={cn(
                    "rounded-full",
                    isMobile ? "w-1 h-1" : "w-1.5 h-1.5",
                    channel.status === 'online' || !channel.status ? "bg-emerald-500" : 
                    channel.status === 'slow' ? "bg-amber-500" : "bg-rose-500"
                  )} />
                </div>
              </div>
            </ChannelCardWrapper>
          </motion.div>
        );
      })}
    </div>
  );
}
