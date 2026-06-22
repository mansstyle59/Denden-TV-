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
  
  const totalHours = 12; // Display 12 hours timeline segments
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
    
    // Sort and deduplicate overlapping times
    const sortedProgs = visibleProgs.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const dedupedProgs = [];
    let lastEnd = 0;
    for (const p of sortedProgs) {
      const start = new Date(p.startTime).getTime();
      const end = new Date(p.endTime).getTime();
      
      let pCopy = { ...p };
      if (start < lastEnd + 1000) {
        // Overlapping with previous program, fast forward its start time or skip
        if (end <= lastEnd + 1000) continue;
        pCopy.startTime = new Date(lastEnd).toISOString();
      }
      dedupedProgs.push(pCopy);
      lastEnd = new Date(pCopy.endTime).getTime();
    }
    
    return dedupedProgs;
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

      {/* Main EPG List View */}
      <div className="flex-1 flex flex-col gap-4 md:gap-6 mt-4 md:mt-8">
        {channels.map((channel, i) => {
          const livePrograms = getTimelineProgs(channel.id);
          if (livePrograms.length === 0) return null;
          
          return (
            <div key={`${channel.id}-${i}`} className="flex flex-col lg:flex-row gap-4 md:gap-6 bg-[#050505] border border-white/5 rounded-[24px] md:rounded-[32px] p-4 md:p-6 shadow-2xl relative overflow-hidden group">
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-700" />
              
              {/* Left panel for Channel logo/info */}
              <div className="flex lg:flex-col items-center lg:items-start gap-4 lg:w-48 shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0 lg:pr-6 relative z-10">
                <div className={cn("bg-white/5 backdrop-blur-md rounded-[16px] md:rounded-[20px] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner border border-white/5", isMobile ? "w-14 h-14 p-2" : "w-20 h-20 p-3")}>
                  {channel.logo ? (
                    <img src={channel.logo} alt="" className="h-full w-full object-contain filter drop-shadow-xl" />
                  ) : (
                    <Tv size={24} className="text-white/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-white font-black text-lg md:text-xl block truncate leading-tight drop-shadow-md">{channel.name}</span>
                  <span className="text-white/40 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] mt-1 block">{channel.category || 'Généraliste'}</span>
                </div>
              </div>

              {/* Vertical list of programs */}
              <div className="flex-1 flex flex-col gap-2 relative z-10">
                {livePrograms.map((p, idx) => {
                  const pStart = new Date(p.startTime);
                  const pEnd = new Date(p.endTime);
                  const isLive = now >= pStart && now <= pEnd;

                  return (
                    <div 
                       key={`${p.id || 'prog'}-${p.startTime}-${idx}`}
                       className={cn(
                         "flex items-center gap-3 md:gap-5 rounded-[12px] md:rounded-[16px] p-3 md:p-4 transition-all relative overflow-hidden",
                         isLive 
                           ? "bg-indigo-600/10 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]" 
                           : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"
                       )}
                     >
                       {isLive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                       )}
                       <div className="w-12 md:w-16 text-center shrink-0">
                          <div className={cn("font-mono text-xs md:text-sm font-bold tracking-wider", isLive ? "text-indigo-400" : "text-white/50")}>
                            {format(pStart, 'HH:mm')}
                          </div>
                          {!isMobile && !isLive && (
                             <div className="text-white/20 font-mono text-[9px] uppercase tracking-widest mt-1">
                               {format(pEnd, 'HH:mm')}
                             </div>
                          )}
                       </div>
                       
                       {p.icon && !isMobile && (
                          <div className="hidden sm:block w-24 h-16 shrink-0 rounded-lg overflow-hidden relative shadow-md">
                            <img src={p.icon} alt="" className="w-full h-full object-cover filter brightness-[0.8]" referrerPolicy="no-referrer" />
                          </div>
                       )}

                       <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3 flex-wrap">
                             {isLive && (
                               <span className="bg-red-650 text-white text-[8px] md:text-[9px] uppercase px-2 py-0.5 rounded-md font-black tracking-widest flex items-center gap-1.5 shadow-md shadow-red-650/40">
                                 <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                 DIRECT
                               </span>
                             )}
                             <h4 className={cn("font-bold truncate font-sans", isLive ? "text-white text-base md:text-lg" : "text-white/80 text-sm md:text-base")}>{p.title}</h4>
                           </div>
                           {p.description && (
                             <p className={cn("line-clamp-1 md:line-clamp-2 mt-1", isLive ? "text-white/60 text-xs md:text-sm" : "text-white/40 text-[10px] md:text-xs")}>{p.description}</p>
                           )}
                       </div>
                       <button className={cn("w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all", isLive ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white")}>
                         <Info size={14} />
                       </button>
                     </div>
                  );
                })}
              </div>
              
            </div>
          );
        })}
      </div>
    </div>
  );
}
