import React, { useState, useMemo, useEffect } from 'react';
import { Channel } from '../types';
import ChannelCardWrapper from './ChannelCardWrapper';
import { Play, Tv, Search, Zap, ArrowLeft, Trophy, CalendarDays, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  onBack: () => void;
  deviceType: 'mobile' | 'desktop' | 'tablet';
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
  { id: 1, title: 'Paris SG vs Bayern Munich', league: 'Ligue des Champions', time: getDynamicDate(0, '21:00'), channelId: 'fstv-44', channelName: 'CANAL+', type: 'Football', icon: Trophy, color: 'from-blue-600 to-indigo-900', img: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1000&auto=format&fit=crop' },
  { id: 2, title: 'UFC 305: Makhachev vs Poirier', league: 'UFC MMA', time: 'Nuit Prochaine, 04:00', channelId: 'rmc-2-cartelive', channelName: 'RMC Sport 2', type: 'MMA', icon: Zap, color: 'from-red-600 to-orange-900', img: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=1000&auto=format&fit=crop' },
  { id: 3, title: 'Arsenal vs Manchester City', league: 'Premier League', time: getDynamicDate(1, '17:30'), channelId: 'fstv-44', channelName: 'CANAL+', type: 'Football', icon: Trophy, color: 'from-emerald-600 to-teal-900', img: 'https://images.unsplash.com/photo-1518605368461-1eb42144e662?q=80&w=1000&auto=format&fit=crop' },
  { id: 4, title: 'Boston Celtics vs Dallas', league: 'NBA Finals', time: getDynamicDate(2, '02:30'), channelId: 'bein-1-cartelive', channelName: 'BeIN Sport 1', type: 'Basketball', icon: Trophy, color: 'from-orange-500 to-red-800', img: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1000&auto=format&fit=crop' },
  { id: 5, title: 'Grand Prix de Monaco', league: 'Formule 1', time: getDynamicDate(2, '15:00'), channelId: 'fstv-44', channelName: 'CANAL+', type: 'F1', icon: Zap, color: 'from-red-600 to-red-950', img: 'https://images.unsplash.com/photo-1532983330958-4b32bb3f9df0?q=80&w=1000&auto=format&fit=crop' },
  { id: 6, title: 'France vs All Blacks', league: 'Rugby', time: getDynamicDate(3, '21:00'), channelId: 'bein-2-cartelive', channelName: 'BeIN Sport 2', type: 'Rugby', icon: Trophy, color: 'from-blue-500 to-blue-900', img: 'https://images.unsplash.com/photo-1518544806140-57508499de7d?q=80&w=1000&auto=format&fit=crop' },
  { id: 7, title: 'Roland-Garros: Finale', league: 'Tennis', time: getDynamicDate(4, '15:00'), channelId: 'bein-3-cartelive', channelName: 'BeIN Sport 3', type: 'Tennis', icon: Trophy, color: 'from-amber-600 to-orange-800', img: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1000&auto=format&fit=crop' },
];

export default function SportPage({ channels, onChannelSelect, onBack, deviceType }: Props) {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [liveEvents, setLiveEvents] = useState<any[]>(() => generateDynamicEvents());

  useEffect(() => {
    let active = true;
    const fetchSports = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const [resSoccer, resFight] = await Promise.all([
          fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Soccer`),
          fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Fighting`)
        ]);
        const jsonSoccer = await resSoccer.json().catch(() => ({}));
        const jsonFight = await resFight.json().catch(() => ({}));

        let events: any[] = [];
        if (jsonSoccer.events) events = [...events, ...jsonSoccer.events.slice(0, 15)];
        if (jsonFight.events) events = [...events, ...jsonFight.events.slice(0, 5)];

        if (events.length > 0 && active) {
          events.sort((a,b) => (a.strTime || '').localeCompare(b.strTime || ''));

          const colors = [
             'from-blue-600 to-indigo-900',
             'from-emerald-600 to-teal-900',
             'from-red-600 to-orange-900',
             'from-amber-600 to-orange-800',
             'from-purple-600 to-purple-900',
          ];
          const cNames = [
             { name: 'CANAL+ SPORT', id: 'vavoo-canalplus-sport' },
             { name: 'BeIN Sport 1', id: 'bein-1-cartelive' },
             { name: 'RMC Sport 1', id: 'rmc-1-cartelive' },
             { name: 'BeIN Sport 2', id: 'bein-2-cartelive' },
             { name: 'RMC Sport 2', id: 'rmc-2-cartelive' },
             { name: 'BeIN Sport 3', id: 'bein-3-cartelive' },
             { name: 'DAZN 1', id: 'dazn-1' },
          ];

          const mapped = events.slice(0, 12).map((evt: any, i: number) => {
            const isFight = evt.strSport === 'Fighting';
            const timeStr = evt.strTimeLocal ? evt.strTimeLocal.substring(0, 5) : (evt.strTime ? evt.strTime.substring(0, 5) : 'Bientôt');
            const cAssigned = cNames[i % cNames.length];
            
            return {
              id: evt.idEvent || Date.now() + i,
              title: evt.strEventAlternate || evt.strEvent || `${evt.strHomeTeam} vs ${evt.strAwayTeam}`,
              league: evt.strLeague || (isFight ? 'MMA/Boxe' : 'Football'),
              time: `Aujourd'hui, ${timeStr}`,
              channelId: cAssigned.id,
              channelName: cAssigned.name,
              type: isFight ? 'MMA' : 'Football',
              icon: isFight ? Zap : Trophy,
              color: colors[i % colors.length],
              img: evt.strThumb || evt.strPoster || (isFight ? 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=1000' : 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1000')
            };
          });
          
          setLiveEvents(mapped);
        }
      } catch (err) {
        // Fallback to static events already loaded in state
      }
    };
    fetchSports();
    
    return () => { active = false; };
  }, []);

  const sportChannels = useMemo(() => {
    return channels.filter(c => c.category === 'Sport');
  }, [channels]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return sportChannels;
    const q = searchQuery.toLowerCase();
    return sportChannels.filter(c => c.name.toLowerCase().includes(q));
  }, [sportChannels, searchQuery]);

  const handleEventClick = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) onChannelSelect(channel);
  };

  return (
    <div className="min-h-screen space-y-10 bg-[#000000] rounded-[40px] md:rounded-[56px] border border-white/5 p-4 md:p-8 lg:p-12 relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-emerald-600/10 rounded-full blur-[180px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10 shrink-0">
        <div className="flex items-start gap-4 md:gap-8">
           <button 
             onClick={onBack} 
             className="group w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-xl md:rounded-[18px] transition-all border border-white/10 active:scale-90 shadow-2xl shrink-0"
           >
             <ArrowLeft className="group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} size={deviceType === 'mobile' ? 20 : 24} />
           </button>
           <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-400 px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl shadow-lg border border-white/10">
                  <Trophy size={deviceType === 'mobile' ? 12 : 14} className="text-white" />
                  <span className="text-white text-[9px] md:text-[11px] font-black uppercase tracking-[0.25em]">Pack Sport Événementiel</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-white/10 backdrop-blur-xl">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-white/40 text-[9px] md:text-[11px] font-black uppercase tracking-[0.25em]">100% Live</span>
                </div>
              </div>
              <h1 className="text-2xl md:text-5xl font-black text-white tracking-[-0.05em] italic uppercase leading-none mt-2">
                DENDEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-white to-blue-500 drop-shadow-sm">SPORT+</span>
              </h1>
           </div>
        </div>

        <div className="relative w-full md:w-96 group shrink-0">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-all duration-500" size={20} />
          <input
            type="text"
            placeholder="Rechercher une chaîne sportive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl md:rounded-[18px] bg-white/[0.03] py-3 md:py-4 pl-14 pr-6 text-sm md:text-base text-white placeholder:text-white/20 border border-white/10 outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all duration-500 shadow-xl focus:shadow-emerald-500/10 backdrop-blur-3xl font-medium"
          />
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 pb-10 space-y-12">
        
        {/* EPG Calendar Section */}
        {!searchQuery && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <CalendarDays className="text-emerald-500" size={24} />
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase italic">Calendrier des Matchs <span className="text-white/30 text-lg md:text-xl font-medium">& Événements</span></h2>
            </div>
            
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
              {liveEvents.map((evt, idx) => (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handleEventClick(evt.channelId)}
                  className={cn(
                    "relative shrink-0 w-[240px] md:w-[300px] h-[340px] md:h-[380px] rounded-[24px] md:rounded-[32px] overflow-hidden group cursor-pointer border border-white/10 snap-start shadow-2xl transition-all duration-500",
                    "hover:border-white/30 hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                  )}
                >
                  <img src={evt.img} alt={evt.title} className="absolute inset-0 w-full h-full object-cover filter brightness-[0.4] group-hover:brightness-[0.6] group-hover:scale-110 transition-all duration-700" />
                  <div className={cn("absolute inset-0 bg-gradient-to-t opacity-90 transition-opacity duration-500", evt.color)} />
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent" />
                  
                  <div className="absolute inset-0 p-5 md:p-6 flex flex-col items-start justify-between">
                    <div className="flex items-center justify-between w-full">
                      <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 shadow-lg">
                         <evt.icon size={14} className="text-emerald-400" />
                         <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">{evt.league}</span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-emerald-500 group-hover:border-emerald-400 transition-colors shadow-lg">
                        <Play fill="currentColor" size={16} className="text-white ml-0.5" />
                      </div>
                    </div>
                    
                    <div className="w-full space-y-3 pb-2">
                       <h3 className="text-white font-black text-xl md:text-2xl leading-[1.1] uppercase italic tracking-tight drop-shadow-xl">{evt.title}</h3>
                       
                       <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-xl p-3 md:p-4 border border-white/5 w-full">
                         <div className="flex-1 space-y-1">
                           <div className="flex items-center gap-1.5 text-emerald-400">
                             <Clock size={12} strokeWidth={3} />
                             <span className="text-[10px] font-black uppercase tracking-widest">{evt.time}</span>
                           </div>
                           <div className="flex items-center gap-1.5 text-white/50">
                             <Tv size={12} strokeWidth={3} />
                             <span className="text-[10px] font-black uppercase tracking-widest">{evt.channelName}</span>
                           </div>
                         </div>
                         <ChevronRight size={20} className="text-white/20 group-hover:text-emerald-500 transition-colors group-hover:translate-x-1" />
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
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <Tv className="text-blue-500" size={24} />
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase italic">{searchQuery ? "Résultats" : "Toutes les Chaînes Sport"} <span className="text-white/30 text-lg md:text-xl font-medium">& Direct</span></h2>
          </div>

          {filteredChannels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredChannels.map((channel, i) => (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                >
                  <ChannelCardWrapper
                    channel={channel}
                    onClick={onChannelSelect}
                    className="group relative aspect-[4/3] bg-[#0f0f0f] border border-white/5 cursor-pointer rounded-xl md:rounded-[24px] overflow-hidden hover:border-emerald-500 hover:shadow-[0_20px_40px_rgba(16,185,129,0.2)] transition-all duration-500"
                  >
                    {/* Image Container */}
                    <div className="absolute inset-0 flex items-center justify-center p-4 group-hover:scale-105 transition-transform duration-700 bg-gradient-to-b from-[#111] to-[#050505]">
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent z-10" />
                      
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-full h-full object-contain relative z-20 filter drop-shadow-[0_10px_20px_rgba(0,0,0,1)]"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-white/5 group-hover:text-emerald-500/20 transition-colors relative z-20">
                          <Tv size={64} strokeWidth={1} />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />
                    </div>

                    {/* Title Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 z-30 transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <h4 className="text-white font-black uppercase tracking-tight text-[10px] md:text-sm line-clamp-1 italic">
                        {channel.name}
                      </h4>
                    </div>
                    
                    {/* Play Indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100">
                       <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                          <Play size={20} className="text-white fill-current ml-1" />
                       </div>
                    </div>
                    
                    {/* Live badge */}
                    <div className="absolute top-3 left-3 z-30">
                      <div className="flex items-center gap-1.5 bg-red-650 px-2 py-0.5 rounded-lg text-[7px] font-black text-white uppercase tracking-widest shadow-lg">
                         <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                         EN DIRECT
                      </div>
                    </div>
                  </ChannelCardWrapper>
                </motion.div>
              ))}
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
      <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-8 relative z-20 shrink-0">
        <div className="hidden lg:flex items-center gap-10">
          <div className="flex items-center gap-3 text-emerald-500/60 font-black text-[10px] md:text-[11px] uppercase tracking-[0.3em] group cursor-default">
            <Zap size={16} className="group-hover:text-emerald-400 transition-colors" /> Flux Haute Qualité
          </div>
          <div className="flex items-center gap-3 text-emerald-700/60 font-black text-[10px] md:text-[11px] uppercase tracking-[0.3em] group cursor-default">
            <Trophy size={16} className="group-hover:text-emerald-500 transition-colors" /> Événements Majeurs
          </div>
        </div>
        <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] mx-auto lg:mr-0 lg:ml-auto">
          Denden Tech
        </div>
      </div>
    </div>
  );
}
