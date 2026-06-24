import React from "react";
import { Star, PlayCircle, Tv } from "lucide-react";
import { cn } from "../lib/utils";
import { Channel } from "../types";
import { DeviceType } from "../hooks/useDeviceType";
import ChannelCardWrapper from "./ChannelCardWrapper";

interface ChannelGridProps {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  onChannelLongPress?: (channel: Channel) => void;
  deviceType: DeviceType;
  liveEpg?: { [id: string]: { current: any; next: any; programmeTv?: any } };
}

export default function ChannelGrid({
  channels,
  onChannelSelect,
  onChannelLongPress,
  deviceType,
  liveEpg,
}: ChannelGridProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-white/40">
        <PlayCircle size={64} className="mb-4 opacity-20" />
        <p>Aucune chaîne disponible</p>
      </div>
    );
  }

  const isMobile = deviceType === "mobile";

  return (
    <div
      className={cn(
        "grid w-full gap-3 md:gap-4",
        "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5",
      )}
    >
      {channels.map((channel, i) => {
        const epg = liveEpg?.[channel.id];
        const currentProgram =
          epg?.programmeTv?.title || epg?.current?.title?.[0]?.value || "";
        const progress = epg?.programmeTv?.progress || 0;
        const progImage = epg?.programmeTv?.image || null;

        return (
          <div key={`${channel.id}-${i}`}>
            <ChannelCardWrapper
              channel={channel}
              onClick={onChannelSelect}
              onLongPress={onChannelLongPress}
              className={cn(
                "group relative bg-[#0c0c0e] border border-white/5 cursor-pointer rounded-xl md:rounded-2xl overflow-hidden flex flex-col aspect-[4/3] transition-all duration-300",
                "focus:border-[#00A8E1]/50 focus:shadow-[0_10px_30px_rgba(0,168,225,0.15)] hover:border-[#00A8E1]/50 hover:shadow-[0_10px_30px_rgba(0,168,225,0.15)] hover:bg-[#111]",
              )}
            >
              {/* Category Badge - visible on hover */}
              {channel.category && (
                <div className="absolute top-2 left-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="bg-[#00A8E1]/90 backdrop-blur-md text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-lg">
                    {channel.category}
                  </span>
                </div>
              )}

              {/* Image Container */}
              <div className="absolute inset-0 flex items-center justify-center p-0 group-hover:scale-105 transition-transform duration-500 bg-[#0f0f0f]">
                {progImage ? (
                  <>
                    <img
                      src={progImage}
                      className="absolute inset-0 w-full h-full object-cover filter brightness-[0.7] group-hover:brightness-100 transition-all duration-500"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-10" />
                    {channel.logo && (
                      <img
                        src={channel.logo}
                        alt=""
                        className="absolute left-3 top-3 h-10 md:h-12 max-w-[50%] object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] z-20 brightness-110"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-[#151515] to-[#080808]">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-[80%] h-[80%] object-contain relative z-20 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center relative z-20 opacity-30 group-hover:opacity-60 transition-opacity">
                        <Tv
                          className={cn(
                            "text-white mb-2 group-hover:text-[#00A8E1] transition-colors",
                            isMobile ? "w-6 h-6" : "w-10 h-10",
                          )}
                        />
                        <span className="text-white/50 font-black uppercase tracking-widest text-center truncate px-2 text-[10px] w-full">
                          {channel.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Bar inside image */}
              {progress > 0 && (
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10 z-20">
                  <div
                    className="bg-[#00A8E1] h-full shadow-[0_0_10px_rgba(0,168,225,0.8)] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Title Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 z-30 transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col justify-end h-2/3">
                <h4 className="text-white font-black uppercase tracking-tight text-[10px] md:text-xs line-clamp-1 group-hover:text-[#00A8E1] transition-colors mb-0.5">
                  {channel.name}
                </h4>
                {currentProgram && (
                  <p className="text-white/60 text-[9px] md:text-[10px] font-bold line-clamp-2 leading-snug">
                    {currentProgram}
                  </p>
                )}
              </div>
            </ChannelCardWrapper>
          </div>
        );
      })}
    </div>
  );
}
