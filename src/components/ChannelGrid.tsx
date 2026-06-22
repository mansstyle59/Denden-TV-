import React from 'react';
import { Star, PlayCircle, Tv } from 'lucide-react';
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

  const isMobile = deviceType === 'mobile';

  return (
    <div className={cn(
      "grid w-full gap-3 md:gap-4",
      "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10"
    )}>
      {channels.map((channel, i) => {
        const epg = liveEpg?.[channel.id];
        const currentProgram = epg?.programmeTv?.title || epg?.current?.title?.[0]?.value || "";
        const progress = epg?.programmeTv?.progress || 0;
        const progImage = epg?.programmeTv?.image || null;

        return (
          <div key={`${channel.id}-${i}`}>
            <ChannelCardWrapper
              channel={channel}
              onClick={onChannelSelect}
              onLongPress={onChannelLongPress}
              className={cn(
                "group relative bg-[#111111] border border-white/5 cursor-pointer rounded-xl md:rounded-[20px] overflow-hidden flex flex-col aspect-[4/3] transition-all duration-500",
                "focus:border-red-650 focus:shadow-[0_10px_30px_rgba(220,38,38,0.2)] hover:border-red-650 hover:shadow-[0_10px_30px_rgba(220,38,38,0.2)]"
              )}
            >
              {/* Image Container */}
              <div className="absolute inset-0 flex items-center justify-center p-0 group-hover:scale-105 transition-transform duration-700 bg-[#0f0f0f]">
                {progImage ? (
                  <>
                    <img src={progImage} className="absolute inset-0 w-full h-full object-cover filter brightness-[0.7] group-hover:brightness-100 transition-all duration-700" alt="" referrerPolicy="no-referrer" />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                    {channel.logo && (
                      <img src={channel.logo} alt="" className="absolute left-2.5 top-2.5 h-6 md:h-8 max-w-[40%] object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-20" referrerPolicy="no-referrer" />
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-full h-full object-contain relative z-20 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] opacity-80 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center relative z-20 opacity-30 group-hover:opacity-60 transition-opacity">
                        <Tv className={cn("text-white mb-2", isMobile ? "w-6 h-6" : "w-10 h-10")} />
                        <span className="text-white/40 font-black uppercase tracking-widest text-center truncate px-2 text-[10px] w-full">{channel.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Bar inside image */}
              {progress > 0 && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10 z-20">
                  <div className="bg-red-600 h-full shadow-[0_0_10px_rgba(220,38,38,0.8)] transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              )}

              {/* Title Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 z-30 transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end h-1/2">
                <h4 className="text-white font-black uppercase tracking-tight text-[10px] md:text-sm line-clamp-1 italic text-shadow-sm mb-0.5">
                  {channel.name}
                </h4>
                {currentProgram && (
                   <p className="text-white/60 text-[9px] md:text-[11px] font-medium truncate">{currentProgram}</p>
                )}
              </div>
            </ChannelCardWrapper>
          </div>
        );
      })}
    </div>
  );
}
