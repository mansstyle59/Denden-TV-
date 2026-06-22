import React, { useState, useMemo, useEffect } from 'react';
import { Channel } from '../types';
import ChannelCardWrapper from './ChannelCardWrapper';
import { Play, Tv, Search, Zap, ArrowLeft, Trophy, CalendarDays, Clock, ChevronRight, Activity, TrendingUp, Plus, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
    league: 'Qualification Coupe du Monde', 
    time: getDynamicDate(0, '21:00'), 
    type: 'Football', 
    icon: Trophy, 
    img: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1000&auto=format&fit=crop',
    broadcasts: [
      { id: 'fstv-44', name: 'CANAL+' },
      { id: 'bein-1-cartelive', name: 'beIN SPORTS 1' }
    ]
  },
  { 
    id: 2, 
    title: 'Grand Prix d\'Autriche', 
    league: 'Formule 1', 
    time: getDynamicDate(0, '15:00'), 
    type: 'Moto', 
    icon: Zap, 
    img: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?q=80&w=1000&auto=format&fit=crop',
    broadcasts: [
      { id: 'fstv-44', name: 'CANAL+' },
      { id: 'fstv-46', name: 'CANAL+ SPORT' }
    ]
  },
  { 
    id: 3, 
    title: 'Wimbledon : Finale', 
    league: 'ATP Finals', 
    time: getDynamicDate(1, '15:00'), 
    type: 'Tennis', 
    icon: Trophy, 
    img: 'https://images.unsplash.com/photo-1592709823125-a191f07a2a5e?q=80&w=1000&auto=format&fit=crop',
    broadcasts: [
      { id: 'bein-1-cartelive', name: 'beIN SPORTS 1' }
    ]
  },
  { 
    id: 4, 
    title: 'Real Madrid vs Man. City', 
    league: 'Champions League', 
    time: getDynamicDate(2, '21:00'), 
    type: 'Football', 
    icon: Trophy, 
    img: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000&auto=format&fit=crop',
    broadcasts: [
      { id: 'fstv-44', name: 'CANAL+' },
      { id: 'rmc-sport-1-cartelive', name: 'RMC Sport 1' }
    ]
  }
];

const SPORT_CATEGORIES = [
  { id: 'all', name: 'Tous', icon: Activity },
  { id: 'football', name: 'Football', icon: Trophy },
  { id: 'moto', name: 'Moto & F1', icon: Zap },
  { id: 'rugby', name: 'Rugby', icon: Trophy },
  { id: 'tennis', name: 'Tennis', icon: Trophy },
];

export default function SportPage({ channels, onChannelSelect, onBack, deviceType, liveEpg }: Props) {
  const isMobile = deviceType === 'mobile';
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [liveEvents, setLiveEvents] = useState<any[]>(() => generateDynamicEvents());

  const sportChannels = useMemo(() => {
    return channels.filter(c => c.category === 'Sport');
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let list = sportChannels;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q));
    }
    
    if (activeCategory !== 'all') {
      const catNorm = activeCategory.toLowerCase();
      list = list.filter(c => {
        const name = (c.name || '').toLowerCase();
        if (catNorm === 'football') return name.includes('foot') || name.includes('bein') || name.includes('rmc');
        if (catNorm === 'moto') return name.includes('moto') || name.includes('f1') || name.includes('gp') || name.includes('canal');
        if (catNorm === 'rugby') return name.includes('rugby') || name.includes('canal');
        if (catNorm === 'tennis') return name.includes('tennis') || name.includes('eurosport');
        return true;
      });
    }
    
    return list;
  }, [sportChannels, searchQuery, activeCategory]);

  const handleEventClick = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) onChannelSelect(channel);
  };

  const getDynamicProgram = (channel: Channel) => {
    const epgData = liveEpg?.[channel.id];
    
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
    <div className={cn("min-h-screen flex flex-col bg-[#010204] relative overflow-hidden", isMobile ? "rounded-none p-0 pb-32" : "rounded-[40px] md:rounded-[56px] border border-white/5 p-0")}>
      {/* Dynamic Background Glows */}
      <div className={cn(
        "absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full blur-[160px] pointer-events-none transition-all duration-1000 opacity-20",
        activeCategory === 'football' ? "bg-emerald-500" : 
        activeCategory === 'moto' ? "bg-red-500" :
        activeCategory === 'tennis' ? "bg-lime-500" : "bg-blue-500"
      )} />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay pointer-events-none" />

      {/* Decorative Ticker */}
      <div className="bg-white/5 border-b border-white/5 py-1.5 overflow-hidden relative z-20 shrink-0 backdrop-blur-md">
        <motion.div 
          animate={{ x: [0, -1500] }} 
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="flex items-center gap-10 whitespace-nowrap"
        >
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex items-center gap-10 font-bold">
               <div className="flex items-center gap-2">
                 <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">Live Connect</span>
               </div>
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 italic flex items-center gap-2">
                 <Trophy size={9} className="text-emerald-500/50" /> UCL Final : Paris SG vs Real Madrid - Live Coverage
               </span>
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 italic flex items-center gap-2">
                 <Zap size={9} className="text-blue-500/50" /> Moto GP : Silverstone Qualifications - P1 Marc Marquez
               </span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className={cn("flex flex-col flex-1 relative z-20 overflow-y-auto scrollbar-hide", isMobile ? "px-4 pt-4 pb-12 space-y-8" : "p-10 lg:p-14 space-y-12")}>
        
      {/* Header */}
      <div className="flex flex-col gap-6 relative z-10 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <button 
               onClick={onBack} 
               className="group w-10 h-10 flex items-center justify-center bg-white/[0.05] backdrop-blur-2xl hover:bg-white/[0.1] text-white rounded-xl transition-all border border-white/10 active:scale-90 shrink-0"
             >
               <ArrowLeft strokeWidth={3} size={16} />
             </button>
             <div className="space-y-0 text-left">
                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.5em] leading-none mb-1 opacity-50">Sport+ Universe</p>
                <h1 className={cn("font-black text-white tracking-tight uppercase leading-none italic", isMobile ? "text-2xl" : "text-4xl")}>
                  DENDEN <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-teal-300 to-blue-400">SPORT+</span>
                </h1>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-emerald-500">
               <Activity size={16} strokeWidth={3} />
            </div>
          </div>
        </div>

        <div className="relative group w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-400 transition-all duration-300" size={14} />
          <input
            type="text"
            placeholder="Équipes, compétitions, canaux..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-white/[0.04] py-3 pl-12 pr-6 text-[10px] text-white placeholder:text-white/20 border border-white/5 outline-none focus:border-emerald-500/30 focus:bg-white/[0.06] transition-all duration-500 backdrop-blur-3xl font-black uppercase tracking-widest"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {SPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-500 shrink-0 border text-[9px] font-black uppercase tracking-widest active:scale-95 group",
                activeCategory === cat.id
                  ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_8px_20px_rgba(16,185,129,0.3)]"
                  : "bg-white/[0.03] text-white/40 border-white/[0.05] hover:border-white/10 hover:text-white"
              )}
            >
              <cat.icon size={13} strokeWidth={3} className={cn("transition-transform group-hover:scale-110", activeCategory === cat.id ? "text-white" : "text-emerald-500/40")} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="relative z-10 space-y-10">
        {/* Floating Visual Accents */}
        <motion.div 
          animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-10 -right-4 opacity-10 pointer-events-none"
        >
          <Trophy size={160} className="text-emerald-500" />
        </motion.div>
        <motion.div 
          animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/2 -left-8 opacity-5 pointer-events-none"
        >
          <Activity size={120} className="text-blue-500" />
        </motion.div>
        
        {/* EPG Calendar Section & Sports Info */}
        {!searchQuery && (
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
               <h2 className="text-base font-black text-white tracking-widest uppercase flex items-center gap-3">
                 <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                 À LA UNE
               </h2>
               <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 uppercase tracking-widest">Premium Live</span>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-10 scrollbar-hide snap-x -mx-4 px-4 scroll-smooth">
              <AnimatePresence mode="popLayout">
                {liveEvents.map((evt, idx) => (
                  <motion.div
                    key={evt.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className={cn(
                      "relative shrink-0 rounded-[12px] overflow-hidden group snap-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 bg-neutral-900",
                      isMobile ? "w-[290px] h-[380px]" : "w-[380px] h-[400px]"
                    )}
                  >
                    <div className="absolute inset-0 bg-black">
                      <img src={evt.img} alt={evt.title} className="w-full h-full object-cover filter brightness-[0.5] group-hover:brightness-[0.7] group-hover:scale-105 transition-all duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      
                      <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div className="bg-white px-2.5 py-1 rounded-sm flex items-center shadow-lg">
                             <span className="text-[9px] font-black text-black uppercase tracking-[0.1em]">{evt.league}</span>
                          </div>
                          {evt.time.includes("Aujourd'hui") && (
                             <div className="flex items-center gap-1.5 bg-[#E50914] px-2 py-0.5 rounded-sm text-[8px] font-black text-white shadow-xl">
                                DIRECT
                             </div>
                          )}
                        </div>
                        
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <h3 className="text-white font-black text-2xl md:text-3xl leading-[1] uppercase tracking-tighter drop-shadow-2xl">{evt.title}</h3>
                              <div className="flex items-center gap-2 text-white/60">
                                <Clock size={11} strokeWidth={3} className="text-white/40" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{evt.time}</span>
                              </div>
                           </div>
                           
                           <div className="flex flex-wrap gap-2 pt-2">
                              {evt.broadcasts?.map((b: any) => (
                                <button 
                                  key={b.id}
                                  onClick={(e) => { e.stopPropagation(); handleEventClick(b.id); }}
                                  className="group/btn flex items-center gap-3 bg-white text-black pl-5 pr-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-[0.05em] transition-all hover:bg-[#E50914] hover:text-white shadow-2xl active:scale-95"
                                >
                                  <Play fill="currentColor" size={10} /> 
                                  <span>Regarder {b.name}</span>
                                </button>
                              ))}
                           </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Channels Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-black text-white tracking-widest uppercase flex items-center gap-3">
               <div className="w-1 h-4 bg-emerald-500 rounded-full" />
               {searchQuery ? "RÉSULTATS" : "CATALOGUE DIRECT"}
            </h2>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-1 rounded-lg">
               <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{filteredChannels.length} CHAINES</span>
            </div>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {filteredChannels.length > 0 ? (
              <motion.div 
                layout
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {filteredChannels.map((channel, i) => {
                  const prog = getDynamicProgram(channel);
                  return (
                  <motion.div
                    key={channel.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: Math.min(i * 0.01, 0.2) }}
                  >
                    <ChannelCardWrapper
                      channel={channel}
                      onClick={onChannelSelect}
                      className="group relative aspect-[14/12] md:aspect-[14/10] bg-[#0c0e12] border border-white/[0.03] cursor-pointer rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-500 flex flex-col"
                    >
                      {/* Visual Background */}
                      {prog.image ? (
                        <div className="absolute inset-0">
                          <img src={prog.image} className="absolute inset-0 w-full h-full object-cover filter brightness-[0.35] group-hover:brightness-[0.55] group-hover:scale-110 transition-all duration-1000" alt="" referrerPolicy="no-referrer" />
                          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        </div>
                      ) : (
                         <div className="absolute inset-0 bg-gradient-to-br from-[#12161d] to-[#040608] flex items-center justify-center p-6">
                          {channel.logo ? (
                            <img src={channel.logo} alt="" className="w-full h-full object-contain filter drop-shadow-2xl grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" referrerPolicy="no-referrer" />
                          ) : (
                            <Tv className="text-white/5 w-10 h-10" />
                          )}
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/5 z-20 overflow-hidden">
                        <div className="h-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,1)] transition-all duration-1000" style={{ width: `${prog.progressPercent}%` }} />
                      </div>

                      {/* Overlay Info */}
                      <div className="absolute inset-x-0 bottom-0 p-3.5 z-10 space-y-1.5 flex flex-col justify-end h-full">
                        <div className="flex items-center gap-2">
                           <div className="h-3.5 md:h-4 pointer-events-none">
                              {channel.logo ? (
                                <img src={channel.logo} className="h-full max-w-[40px] md:max-w-[60px] object-contain filter brightness-125" alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[10px] font-black text-white italic">{channel.name}</span>
                              )}
                           </div>
                           <div className="w-1 h-1 rounded-full bg-white/20" />
                           <span className="text-emerald-400 text-[8px] font-black uppercase tracking-[0.2em]">{channel.server?.replace('Direct ', '') || 'HD'}</span>
                        </div>
                        <p className="text-white font-black text-[9px] md:text-[10px] leading-tight uppercase tracking-tight line-clamp-1 italic group-hover:text-emerald-400 transition-colors">{prog.title}</p>
                      </div>

                      {/* Live Indicator */}
                      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                         <span className="text-white/20 text-[7px] font-black uppercase tracking-widest leading-none">LIVE</span>
                         <div className="bg-red-650 px-1.5 py-0.5 rounded text-[6px] font-black text-white uppercase tracking-widest shadow-xl">DIRECT</div>
                      </div>
                      
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </ChannelCardWrapper>
                  </motion.div>
                )})}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white/[0.01] rounded-[32px] border border-white/5"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10">
                   <Trophy size={32} />
                </div>
                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Aucun canal sportif trouvé</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Footer Spacing */}
      {isMobile && <div className="h-10 shrink-0" />}
    </div>
  </div>
  );
}
