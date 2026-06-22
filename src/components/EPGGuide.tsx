import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, RefreshCw, Tv, Info } from 'lucide-react';
import { Channel } from '../types';
import { format, addHours, startOfHour, differenceInMinutes, isBefore, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { cn } from '../lib/utils';
import { useDeviceType } from '../hooks/useDeviceType';

interface EPGGuideProps {
  channels: Channel[];
}

export default function EPGGuide({ channels }: EPGGuideProps) {
  const [guideData, setGuideData] = useState<{ [channelId: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [timelineStart, setTimelineStart] = useState<Date>(startOfHour(new Date()));
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile' || deviceType === 'tablet';
  
  const hourWidth = isMobile ? 200 : 260; // Slightly narrower on mobile for better fit
  const totalHours = 12; // Display 12 hours timeline segments
  const hours = Array.from({ length: totalHours }, (_, i) => addHours(timelineStart, i));
  const timelineEnd = addHours(timelineStart, totalHours);

  const fetchEPG = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/epg/guide');
      setGuideData(res.data);
    } catch (err) {
      console.error('Error fetching EPG Guide dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEPG();
  }, [channels, timelineStart]);

  const shiftHours = (amount: number) => {
    setTimelineStart(prev => addHours(prev, amount));
  };

  const getTimelineProgs = (channelId: string) => {
    const progs = guideData[channelId] || [];
    const visibleProgs = progs.filter(p => {
      const start = new Date(p.startTime);
      const end = new Date(p.endTime);
      return end > timelineStart && start < timelineEnd;
    });

    if (visibleProgs.length === 0) {
      return [{
        id: `mock-${channelId}`,
        title: "Direct Vidéo - Programme non communiqué",
        startTime: timelineStart.toISOString(),
        endTime: timelineEnd.toISOString(),
        category: "Généraliste",
        description: "Programmes TV en direct mis à jour en continu"
      }];
    }
    return visibleProgs;
  };

  const now = new Date();

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header Panel */}
      <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-[#111] rounded-[24px] md:rounded-[40px] border border-white/5 backdrop-blur-2xl shadow-2xl", isMobile ? "p-4" : "p-8 lg:p-10")}>
        <div className="flex items-center gap-4 md:gap-6">
          <div className={cn("bg-indigo-500/10 rounded-full border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/5", isMobile ? "w-12 h-12" : "w-16 h-16")}>
            <Calendar size={isMobile ? 24 : 32} />
          </div>
          <div>
            <h2 className={cn("font-black text-white tracking-tighter uppercase font-sans leading-none", isMobile ? "text-xl md:text-2xl" : "text-3xl")}>Guide des Programmes</h2>
            <p className={cn("text-white/40 font-black uppercase tracking-[0.2em] mt-1", isMobile ? "text-[9px]" : "text-xs")}>Grid interactive • Denden Premium</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 justify-between w-full md:w-auto mt-2 md:mt-0">
          <button 
            onClick={fetchEPG}
            className={cn("bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl", isMobile ? "w-10 h-10 shrink-0" : "w-14 h-14")}
            title="Rafraîchir l'EPG"
          >
            <RefreshCw size={isMobile ? 18 : 22} className={cn(loading && "animate-spin text-indigo-500")} />
          </button>
          
          <div className="flex-1 max-w-[200px] flex items-center bg-black/60 border border-white/5 rounded-full p-1.5 md:p-2 gap-1.5 md:gap-2 shadow-inner">
            <button 
              onClick={() => shiftHours(-3)}
              className={cn("bg-white/5 hover:bg-white/10 text-white rounded-full active:scale-95 transition-all font-black shadow-md border border-white/5 shrink-0", isMobile ? "w-8 h-8 text-[10px]" : "w-12 h-12 text-xs")}
            >
              -3H
            </button>
            <span className={cn("flex-1 text-white/60 font-black text-center uppercase tracking-widest font-mono truncate", isMobile ? "text-[10px]" : "text-xs px-4 min-w-[140px]")}>
              {format(timelineStart, isMobile ? 'dd/MM HH:mm' : 'dd/MM HH:mm', { locale: fr })}
            </span>
            <button 
              onClick={() => shiftHours(3)}
              className={cn("bg-white/5 hover:bg-white/10 text-white rounded-full active:scale-95 transition-all font-black shadow-md border border-white/5 shrink-0", isMobile ? "w-8 h-8 text-[10px]" : "w-12 h-12 text-xs")}
            >
              +3H
            </button>
          </div>
        </div>
      </div>

      {/* Main EPG Table Box */}
      <div className={cn("bg-[#111] border border-white/10 overflow-hidden flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative", isMobile ? "rounded-[24px] h-[75vh]" : "rounded-[48px] h-[70vh]")}>
        
        {/* Horizontal scroll container serving the entire timeline */}
        <div className="flex-1 overflow-auto custom-scrollbar flex flex-col relative">
          
          {/* Header Row: Channel Info and Hour marks */}
          <div className="flex bg-white/[0.02] border-b border-white/5 sticky top-0 z-30 flex-shrink-0">
            {/* Hour Block Header Title */}
            <div className={cn("flex-shrink-0 font-black text-white bg-[#0a0a0a] border-r border-white/5 uppercase tracking-widest flex items-center gap-2 sticky left-0 z-40 shadow-[4px_0_15px_rgba(0,0,0,0.5)]", isMobile ? "w-24 p-2 text-[9px]" : "w-52 md:w-60 p-4 text-xs")}>
              <Clock size={isMobile ? 12 : 14} className="text-indigo-500" /> {!isMobile && "Chaînes"}
            </div>
            
            {/* Timeline hour coordinates mapping */}
            <div className="flex flex-1" style={{ width: totalHours * hourWidth }}>
              {hours.map((hour) => (
                <div 
                  key={hour.toISOString()} 
                  className="flex-shrink-0 border-r border-white/5 text-white/50 font-black text-xs uppercase tracking-widest flex items-center justify-center font-mono"
                  style={{ width: hourWidth }}
                >
                  <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">{format(hour, 'HH:mm')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows corresponding to the Channels with programs */}
          <div className="flex-1 flex flex-col">
            {channels.map((channel, i) => {
              const livePrograms = getTimelineProgs(channel.id);
              
              return (
                <div key={`${channel.id}-${i}`} className={cn("flex border-b border-white/5 hover:bg-white/[0.01] transition-colors relative flex-shrink-0 group", isMobile ? "h-20" : "h-24")}>
                  
                  {/* Sticky left panel for Channel logo/info */}
                  <div className={cn("flex-shrink-0 border-r border-white/5 bg-[#0a0a0a] flex items-center gap-2 md:gap-4 sticky left-0 z-20 shadow-[4px_0_15px_rgba(0,0,0,0.5)]", isMobile ? "w-24 p-2" : "w-52 md:w-60 p-4")}>
                    <div className={cn("bg-white/5 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 transition-all group-hover:scale-105 active:scale-95 cursor-pointer", isMobile ? "w-10 h-10 p-1" : "w-12 h-12 p-1.5")}>
                      <img src={channel.logo || undefined} alt="" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={cn("text-white font-black block tracking-tight line-clamp-2 leading-tight", isMobile ? "text-[11px]" : "text-sm truncate")}>{channel.name}</span>
                      {!isMobile && <span className="text-white/40 text-[10px] font-bold block uppercase tracking-widest mt-0.5">{channel.category}</span>}
                    </div>
                  </div>

                  {/* Horizontal strip displaying the current channel schedule in timeline */}
                  <div className="flex-1 relative h-full bg-[#111]/30 scrollbar-hide" style={{ width: totalHours * hourWidth }}>
                    {livePrograms.map((p, idx) => {
                      const pStart = new Date(p.startTime);
                      const pEnd = new Date(p.endTime);
                      
                      const startOffset = Math.max(0, differenceInMinutes(pStart, timelineStart));
                      const left = (startOffset / 60) * hourWidth;
                      
                      const effectiveStart = isBefore(pStart, timelineStart) ? timelineStart : pStart;
                      const effectiveEnd = isAfter(pEnd, timelineEnd) ? timelineEnd : pEnd;
                      const duration = Math.max(15, differenceInMinutes(effectiveEnd, effectiveStart));
                      const width = (duration / 60) * hourWidth;

                      const isLive = now >= pStart && now <= pEnd;

                      return (
                        <div 
                          key={`${p.id || 'prog'}-${p.startTime}-${idx}`}
                          style={{ left: `${left}px`, width: `${width}px` }} 
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 rounded-2xl flex flex-col justify-between transition-all select-none overflow-hidden duration-300",
                            isMobile ? "h-[85%] border p-2" : "h-[80%] border p-3",
                            isLive 
                              ? "bg-indigo-500/10 border-indigo-500/30 shadow-[inset_0_0_15px_rgba(99,102,241,0.1)] group-hover:bg-indigo-500/15" 
                              : "bg-white/[0.02] border-white/5 group-hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              {isLive && (
                                <span className="flex h-2 w-2 relative shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                              )}
                              <h5 className={cn(
                                "font-black truncate tracking-tight transition-colors",
                                isMobile ? "text-[12px]" : "text-xs",
                                isLive ? "text-indigo-400" : "text-white/80"
                              )}>
                                {p.title}
                              </h5>
                            </div>
                            {p.description && !isMobile && (
                              <p className="text-white/30 text-[10px] font-medium truncate mt-0.5">{p.description}</p>
                            )}
                          </div>
                          
                          <div className={cn("flex items-center justify-between font-bold tracking-wider font-mono", isMobile ? "text-[10px]" : "text-[9px]")}>
                            <span className={isLive ? "text-indigo-400/80" : "text-white/30"}>
                              {format(pStart, 'HH:mm')} - {format(pEnd, 'HH:mm')}
                            </span>
                            {isLive && (
                              <span className={cn("bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded font-black uppercase tracking-widest origin-right", isMobile ? "px-1.5 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[8px]")}>
                                Direct
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
