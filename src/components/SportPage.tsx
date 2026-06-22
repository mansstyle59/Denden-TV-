import React, { useState, useMemo, useEffect } from 'react';
import { Channel } from '../types';
import ChannelCardWrapper from './ChannelCardWrapper';
import { Play, Tv, Search, Zap, ArrowLeft, Trophy, CalendarDays, Clock, ChevronRight, Activity, TrendingUp, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  onBack: () => void;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  liveEpg?: Record<string, any>;
}

const getDynamicDate = (offset: number, timeStr: string) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  if (offset === 0) return `Aujourd'hui, ${timeStr}`;
  if (offset === 1) return `Demain, ${timeStr}`;
  const formatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });
  const day = formatter.format(date);
  return `${day.charAt(0).toUpperCase() + day.slice(1)}, ${timeStr}`;
};

const generateDynamicEvents = () => [
  { 
    id: 1, 
    title: 'France vs Pays-Bas', 
    league: 'Coupe du Monde 2026', 
    time: getDynamicDate(0, '21:00'), 
    type: 'Football', 
    icon: Trophy, 
    color: 'from-blue-600 to-indigo-900', 
    img: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1000&auto=format&fit=crop',
    stats: { form1: [1, 1, 1, 1, 0], form2: [1, 1, 0, 1, 1], winProb: 55, desc: "Choc du Groupe E au Canada." },
    broadcasts: [
      { id: 'fstv-44', name: 'CANAL+' },
      { id: 'tf1-fr', name: 'TF1' },
      { id: 'bein-1-cartelive', name: 'beIN SPORTS 1' }
    ]
  },
  { 
    id: 2, 
    title: 'Grand Prix du Canada', 
    league: 'Formule 1', 
    time: getDynamicDate(0, '20:00'), 
    type: 'Football', 
    icon: Zap, 
    color: 'from-red-600 to-orange-900', 
    img: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=1000&auto=format&fit=crop',
    stats: { form1: [1, 1, 1, 1, 1], form2: [1, 0, 1, 1, 0], winProb: 75, desc: "Course sur le circuit Gilles-Villeneuve." },
    broadcasts: [
      { id: 'fstv-44', name: 'CANAL+' },
      { id: 'fstv-46', name: 'CANAL+ SPORT' }
    ]
  },
  { 
    id: 3, 
    title: 'Toulouse vs Bordeaux Bègles', 
    league: 'Top 14 - Finale', 
    time: getDynamicDate(1, '21:05'), 
    type: 'Rugby', 
    icon: Trophy, 
    color: 'from-emerald-600 to-teal-900', 
    img: 'https://images.unsplash.com/photo-1518605368461-1eb42144e662?q=80&w=1000&auto=format&fit=crop',
    stats: { form1: [1, 1, 0, 1, 1], form2: [1, 1, 1, 1, 1], winProb: 40, desc: "La grande finale du Top 14 au Stade de France." },
    broadcasts: [
      { id: 'fstv-44', name: 'CANAL+' },
      { id: 'france-2-fr', name: 'France 2' }
    ]
  },
  { 
    id: 6, 
    title: 'Carlos Alcaraz vs Jannik Sinner', 
    league: 'ATP Wimbledon', 
    time: getDynamicDate(3, '15:00'), 
    type: 'Tennis', 
    icon: Trophy, 
    color: 'from-amber-500 to-amber-900', 
    img: 'https://images.unsplash.com/photo-1518544806140-57508499de7d?q=80&w=1000&auto=format&fit=crop',
    stats: { form1: [1, 0, 1, 1, 1], form2: [1, 1, 1, 0, 1], winProb: 50, desc: "Demi-finale très attendue sur le gazon londonien." },
    broadcasts: [
      { id: 'bein-1-cartelive', name: 'beIN SPORTS 1' },
      { id: 'bein-2-cartelive', name: 'beIN SPORTS 2' },
      { id: 'bein-3-cartelive', name: 'beIN SPORTS 3' }
    ]
  },
];

export default function SportPage({ channels, onChannelSelect, onBack, deviceType }: Props) {
  const isMobile = deviceType === 'mobile';
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveEvents, setLiveEvents] = useState<any[]>(() => generateDynamicEvents());

  const sportChannels = useMemo(() => {
    return channels.filter(c => c.category === 'Sport');
  }, [channels]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return sportChannels;
    const q = searchQuery.toLowerCase();
    return sportChannels.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [sportChannels, searchQuery]);

  const handleEventClick = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) onChannelSelect(channel);
  };

  const getDynamicProgram = (channel: Channel) => {
    // @ts-ignore
    const epgData = typeof liveEpg !== 'undefined' ? liveEpg[channel.id] : null;
    
    if (epgData?.programmeTv) {
      const ptv = epgData.programmeTv;
      return {
        title: ptv.title,
        progressPercent: ptv.progress,
        image: ptv.image
      };
    }

    const realEpg = epgData?.current;
    if (realEpg) {
      const startObj = new Date(realEpg.start);
      const endObj = new Date(realEpg.stop);
      const now = new Date();
      let percent = 0;
      if (now >= startObj && now <= endObj) {
        const total = endObj.getTime() - startObj.getTime();
        const elapsed = now.getTime() - startObj.getTime();
        percent = (elapsed / total) * 100;
      }
      return {
        title: realEpg.title?.[0]?.value || channel.name,
        progressPercent: percent,
        image: realEpg.icon?.[0]?.src
      };
    }
    
    return {
      title: "Programme Actuel",
      progressPercent: 0,
      image: null
    };
  };

  return (
    <div className={cn("min-h-screen flex flex-col bg-[#030508] relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]", isMobile ? "rounded-[32px] p-4 pb-32 space-y-8" : "rounded-[40px] md:rounded-[56px] border border-white/5 p-8 lg:p-12 space-y-14")}>
      {/* Background Glows & Texture */}
      <div className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-emerald-600/15 rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-700/10 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10 shrink-0">
        <div className="flex items-start gap-4 md:gap-8">
           <button 
             onClick={onBack} 
             className="group w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.08] text-white rounded-2xl md:rounded-[20px] transition-all border border-white/10 active:scale-95 shadow-xl shrink-0"
           >
             <ArrowLeft className="group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} size={deviceType === 'mobile' ? 20 : 24} />
           </button>
           <div className={cn("space-y-1 md:space-y-3", isMobile ? "pt-1.5" : "")}>
              <h1 className={cn("font-black text-white tracking-tighter uppercase leading-none drop-shadow-2xl", isMobile ? "text-[28px]" : "text-4xl md:text-6xl")}>
                DENDEN <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-teal-200 to-blue-500 drop-shadow-lg">SPORT+</span>
              </h1>
           </div>
        </div>

        <div className="relative w-full md:w-[400px] group shrink-0">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition-all duration-500" size={20} />
          <input
            type="text"
            placeholder="Rechercher une chaîne sportive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[20px] md:rounded-[24px] bg-white/[0.03] py-4 pl-14 pr-6 text-sm md:text-base text-white placeholder:text-white/30 border border-white/10 outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all duration-500 shadow-xl focus:shadow-[0_0_30px_rgba(16,185,129,0.15)] backdrop-blur-3xl font-medium"
          />
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 pb-10 space-y-12">
        
        {/* EPG Calendar Section & Sports Info */}
        {!searchQuery && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-emerald-500/20 to-teal-600/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                     <CalendarDays size={24} />
                  </div>
                  <div>
                     <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase drop-shadow-lg">À L'AFFICHE</h2>
                     <p className="text-white/40 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                       Événements Majeurs & Stats
                     </p>
                  </div>
               </div>
              <div className="hidden md:flex items-center gap-3">
                <button 
                  onClick={() => {
                    const el = document.getElementById('sport-carousel');
                    if (el) el.scrollBy({ left: -400, behavior: 'smooth' });
                  }}
                  className="w-12 h-12 rounded-[20px] bg-white/[0.03] border border-white/10 flex items-center justify-center text-white hover:bg-white/[0.08] active:scale-95 transition-all outline-none"
                >
                  <ArrowLeft size={20} />
                </button>
                <button 
                   onClick={() => {
                    const el = document.getElementById('sport-carousel');
                    if (el) el.scrollBy({ left: 400, behavior: 'smooth' });
                  }}
                  className="w-12 h-12 rounded-[20px] bg-white/[0.03] border border-white/10 flex items-center justify-center text-white hover:bg-white/[0.08] active:scale-95 transition-all outline-none"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>
            
            <div id="sport-carousel" className="flex gap-4 md:gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x pt-2">
              {liveEvents.map((evt, idx) => (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "relative shrink-0 rounded-[28px] md:rounded-[40px] overflow-hidden group border border-white/10 snap-start shadow-2xl transition-all duration-500 flex flex-col bg-[#05080c]",
                    isMobile ? "w-[280px] h-[280px]" : "w-[380px] h-[340px]",
                    "hover:border-white/30 hover:shadow-[0_0_60px_rgba(255,255,255,0.1)]"
                  )}
                >
                  <div className={cn("relative shrink-0 w-full h-full overflow-hidden")}>
                    <img src={evt.img} alt={evt.title} className="absolute inset-0 w-full h-full object-cover object-top filter brightness-[0.5] group-hover:brightness-[0.8] group-hover:scale-105 transition-all duration-700" />
                    <div className={cn("absolute inset-0 bg-gradient-to-t from-[#05080c] via-[#05080c]/80 to-transparent transition-all duration-500")} />
                    
                    <div className="absolute inset-0 p-6 flex flex-col items-start justify-between">
                      <div className="flex items-center justify-between w-full">
                        <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2 shadow-lg">
                           <evt.icon size={12} className="text-white" />
                           <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.2em]">{evt.league}</span>
                        </div>
                        {evt.type === 'Football' && (
                           <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95">
                              <Plus size={20} strokeWidth={3} />
                           </button>
                        )}
                      </div>
                      
                      <div className="w-full space-y-3">
                         <h3 className="text-white font-black text-2xl md:text-3xl leading-[1.1] uppercase tracking-tighter drop-shadow-xl font-sans">{evt.title}</h3>
                         
                         <div className="flex flex-col bg-white/[0.03] backdrop-blur-xl rounded-[20px] p-3.5 border border-white/10 w-full shadow-inner">
                           <div className="flex items-center gap-2 text-white/70 font-bold mb-3">
                             <Clock size={14} className="text-white" />
                             <span className="text-[10px] uppercase tracking-widest">{evt.time}</span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                             {evt.broadcasts?.map((b: any) => (
                               <button 
                                 key={b.id}
                                 onClick={(e) => { e.stopPropagation(); handleEventClick(b.id); }}
                                 className="flex items-center gap-2 bg-white/5 hover:bg-white hover:text-black px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-white/10 text-white"
                               >
                                 <Play fill="currentColor" size={10} /> {b.name}
                               </button>
                             ))}
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Channels Grid */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
               <Tv size={24} />
            </div>
            <div>
               <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase drop-shadow-lg">{searchQuery ? "Résultats" : "Chaînes Sportives"}</h2>
               <p className="text-white/40 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                 100% Direct
               </p>
            </div>
          </div>

          {filteredChannels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredChannels.map((channel, i) => {
                const prog = getDynamicProgram(channel);
                return (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                >
                  <ChannelCardWrapper
                    channel={channel}
                    onClick={onChannelSelect}
                    className="group relative aspect-[4/3] bg-[#0f0f0f] border border-white/5 cursor-pointer rounded-xl md:rounded-[24px] overflow-hidden hover:border-emerald-500 hover:shadow-[0_20px_40px_rgba(16,185,129,0.2)] transition-all duration-500 flex flex-col"
                  >
                    {/* Image Container */}
                    <div className="absolute inset-0 flex items-center justify-center p-0 group-hover:scale-105 transition-transform duration-700 bg-[#0f0f0f]">
                      {prog.image ? (
                        <>
                          <img src={prog.image} className="absolute inset-0 w-full h-full object-cover filter brightness-[0.8] group-hover:brightness-100 transition-all duration-700" alt="" referrerPolicy="no-referrer" />
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                          {channel.logo && (
                            <img src={channel.logo} alt="" className="absolute left-3 bottom-3 md:left-4 md:bottom-4 h-5 md:h-7 max-w-[60%] object-contain filter drop-shadow-xl z-20" referrerPolicy="no-referrer" />
                          )}
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-6 md:p-8 bg-gradient-to-b from-[#111] to-[#050505]">
                          {channel.logo ? (
                            <img
                              src={channel.logo}
                              alt={channel.name}
                              className="w-full h-full object-contain relative z-20 filter drop-shadow-[0_10px_20px_rgba(0,0,0,1)]"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center relative z-20 opacity-50 group-hover:opacity-80 transition-opacity">
                              <Tv className={cn("text-white/20 mb-2 md:mb-3", isMobile ? "w-8 h-8" : "w-12 h-12")} />
                              <span className={cn("text-white/40 font-black uppercase tracking-widest text-center truncate px-2 md:px-4 w-full", isMobile ? "text-[9px]" : "text-sm")}>{channel.name}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10 z-20">
                        <div className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-500" style={{ width: `${prog.progressPercent}%` }} />
                      </div>
                      <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />
                    </div>

                    {/* Title Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 z-30 transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-t from-[#111] via-[#111]/80 to-transparent">
                      <h4 className="text-white font-black uppercase tracking-tight text-[10px] md:text-sm line-clamp-1 italic text-shadow-sm">
                        {channel.name}
                      </h4>
                      <p className="text-white/60 text-[9px] md:text-[11px] truncate mt-0.5">{prog.title}</p>
                    </div>

                    {/* Play Indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100">
                       <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                          <Play size={20} className="text-white fill-current ml-1" />
                       </div>
                    </div>
                    
                    {/* Live badge */}
                    <div className="absolute top-3 right-3 z-30">
                      <div className="flex items-center gap-1.5 bg-red-650 px-2 py-0.5 rounded-lg text-[7px] font-black text-white uppercase tracking-widest shadow-lg">
                         <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                         LIVE
                      </div>
                    </div>
                  </ChannelCardWrapper>
                </motion.div>
              )})}
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-8 bg-white/[0.02] rounded-3xl border border-white/5">
              <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/5 shadow-2xl relative">
                <Trophy size={48} className="relative z-10 text-emerald-500/20" />
                <div className="absolute inset-0 bg-emerald-600/5 rounded-full blur-2xl" />
              </div>
              <div>
                <h3 className="text-white/40 font-black text-2xl uppercase tracking-[0.2em] italic">Aucun Résultat</h3>
                <p className="text-white/20 text-sm mt-2 max-w-sm mx-auto font-medium leading-relaxed italic">Aucune chaîne ne correspond à "{searchQuery}".</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-8 border-t border-white/5 flex items-center justify-between gap-8 relative z-20 shrink-0">
        <div className="hidden lg:flex items-center gap-8">
          <div className="flex items-center gap-3 bg-white/[0.02] px-4 py-2 rounded-xl text-white/50 font-black text-[10px] uppercase tracking-[0.2em] border border-white/5">
            <Zap size={14} className="text-blue-500" /> Flux Haute Qualité
          </div>
          <div className="flex items-center gap-3 bg-white/[0.02] px-4 py-2 rounded-xl text-white/50 font-black text-[10px] uppercase tracking-[0.2em] border border-white/5">
            <Trophy size={14} className="text-emerald-500" /> Événements Majeurs
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/30 text-[10px] font-black uppercase tracking-[0.4em] mx-auto lg:mr-0 lg:ml-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          DENDEN TECH
        </div>
      </div>
    </div>
  );
}
