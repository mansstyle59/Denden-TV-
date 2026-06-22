import React, { useState, useMemo } from 'react';
import { PLUTO_CHANNELS } from '../plutoChannels';
import { Channel } from '../types';
import ChannelCardWrapper from './ChannelCardWrapper';
import { Play, Tv, Search, Zap, ArrowLeft, Disc } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface Props {
  onChannelSelect: (channel: Channel) => void;
  onBack: () => void;
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

export default function PlutoTVPage({ onChannelSelect, onBack, deviceType }: Props) {
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = useMemo(() => {
    const cats = new Set(PLUTO_CHANNELS.map(c => c.category || 'Autres'));
    return Array.from(cats).sort();
  }, []);

  const channelsByCategory = useMemo(() => {
    const grouped: { [key: string]: Channel[] } = {};
    categories.forEach(cat => {
      grouped[cat] = PLUTO_CHANNELS.filter(c => (c.category || 'Autres') === cat);
    });
    return grouped;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(cat => 
       cat.toLowerCase().includes(q) || 
       channelsByCategory[cat].some(c => (c.name || '').toLowerCase().includes(q))
    );
  }, [categories, channelsByCategory, searchQuery]);

  const recentPlutoChannels = useMemo(() => {
    try {
      const stored = localStorage.getItem('denden_recent_history');
      if (stored) {
        const history = JSON.parse(stored) as { id: string, type: 'channel' | 'movie' }[];
        return history
          .filter(item => item.type === 'channel')
          .map(item => PLUTO_CHANNELS.find(pc => pc.id === item.id))
          .filter((c): c is Channel => !!c)
          .slice(0, 12);
      }
    } catch (e) {}
    return [];
  }, []);

  return (
    <div className="min-h-screen space-y-10 bg-[#000000] rounded-[40px] md:rounded-[56px] border border-white/5 p-4 md:p-8 lg:p-16 relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-sky-600/10 rounded-full blur-[180px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] bg-red-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
        <div className="flex items-start gap-4 md:gap-8">
           <button 
             onClick={onBack} 
             className="group w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-xl md:rounded-[18px] transition-all border border-white/10 active:scale-90 shadow-2xl"
           >
             <ArrowLeft className="group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} size={deviceType === 'mobile' ? 20 : 24} />
           </button>
           <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-sky-400 px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl shadow-lg border border-white/10">
                  <Disc size={deviceType === 'mobile' ? 12 : 14} className="text-white animate-spin-slow" />
                  <span className="text-white text-[9px] md:text-[11px] font-black uppercase tracking-[0.25em]">Alliance Pack</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-white/10 backdrop-blur-xl">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-white/40 text-[9px] md:text-[11px] font-black uppercase tracking-[0.25em]">Officiel</span>
                </div>
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-[-0.05em] italic uppercase leading-none">
                PLUTO <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-white to-red-500 drop-shadow-sm">TV</span>
              </h1>
           </div>
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-sky-500 transition-all duration-500" size={20} />
          <input
            type="text"
            placeholder="Rechercher une chaîne Pluto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl md:rounded-[18px] bg-white/[0.03] py-3 md:py-4 pl-14 pr-6 text-sm md:text-base text-white placeholder:text-white/20 border border-white/10 outline-none focus:border-sky-500/50 focus:bg-white/[0.08] transition-all duration-500 shadow-xl focus:shadow-sky-500/10 backdrop-blur-3xl font-medium"
          />
        </div>
      </div>

      {/* Categories Content */}
      <div className="relative z-10 space-y-12 md:space-y-20 pb-20">
        {/* History Carousel */}
        {!searchQuery && recentPlutoChannels.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-1 md:w-1.5 h-6 md:h-8 bg-amber-500 rounded-full" />
                <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter italic">Reprendre la lecture</h2>
                <span className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest">Récents</span>
              </div>
            </div>

            <div className="flex items-center gap-4 md:gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 snap-x">
              {recentPlutoChannels.map((channel, i) => (
                <motion.div
                  key={`pluto-recent-${channel.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="snap-start shrink-0"
                >
                  <ChannelCardWrapper
                    channel={channel}
                    onClick={onChannelSelect}
                    className="group relative w-[160px] sm:w-[200px] md:w-[240px] aspect-video bg-[#111] border border-white/5 cursor-pointer rounded-xl md:rounded-[24px] overflow-hidden hover:border-amber-500/50 transition-all duration-500"
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-full h-full object-contain relative z-20 group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center opacity-50 group-hover:opacity-80 transition-opacity">
                          <Tv size={32} className="text-white/20 mb-2" />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-3 z-30 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <h4 className="text-white font-black uppercase text-[10px] truncate italic">{channel.name}</h4>
                    </div>
                  </ChannelCardWrapper>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {filteredCategories.length > 0 ? (
          filteredCategories.map((cat) => {
            const catChannels = searchQuery 
              ? channelsByCategory[cat].filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
              : channelsByCategory[cat];
              
            if (catChannels.length === 0) return null;

            return (
              <section key={cat} className="space-y-4 md:space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1 md:w-1.5 h-6 md:h-8 bg-sky-500 rounded-full" />
                    <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter italic">{cat}</h2>
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[8px] md:text-[10px] font-black text-white/30 uppercase tracking-widest">{catChannels.length}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 snap-x">
                  {catChannels.map((channel, i) => (
                    <motion.div
                      key={channel.id}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="snap-start shrink-0"
                    >
                      <ChannelCardWrapper
                        channel={channel}
                        onClick={onChannelSelect}
                        className="group relative w-[180px] sm:w-[220px] md:w-[280px] aspect-[16/10] bg-[#0c0c0c] border border-white/5 cursor-pointer rounded-xl md:rounded-[24px] overflow-hidden hover:border-sky-500 hover:shadow-[0_20px_40px_rgba(14,165,233,0.2)] transition-all duration-500"
                      >
                        {/* Image Container - Rectangular and Logo Large */}
                        <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4 group-hover:scale-105 transition-transform duration-700">
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-10" />
                          
                          {channel.logo ? (
                            <img
                              src={channel.logo}
                              alt={channel.name}
                              className="w-full h-full object-contain relative z-20 transition-all duration-700 filter drop-shadow-[0_10px_20px_rgba(0,0,0,1)]"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center relative z-20 opacity-50 group-hover:opacity-80 transition-opacity">
                              <Tv size={32} className="text-white/20 mb-2 md:mb-3" />
                              <span className="text-white/40 font-black uppercase tracking-widest text-center truncate px-2 w-full text-[10px] md:text-xs">{channel.name}</span>
                            </div>
                          )}

                          {/* Glow effect on hover */}
                          <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />
                        </div>

                        {/* Title Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 z-30 transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-t from-black via-black/80 to-transparent">
                          <h4 className="text-white font-black uppercase tracking-tight text-[10px] md:text-sm line-clamp-1 italic">
                            {channel.name}
                          </h4>
                        </div>
                        
                        {/* Play Indicator */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100">
                           <div className="w-10 h-10 md:w-14 md:h-14 bg-sky-500 rounded-full flex items-center justify-center shadow-2xl">
                              <Play size={20} className="text-white fill-current ml-1" />
                           </div>
                        </div>
                      </ChannelCardWrapper>
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="py-48 flex flex-col items-center justify-center text-center space-y-8">
            <div className="w-32 h-32 rounded-[40px] bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/5 shadow-2xl relative">
              <Search size={56} className="relative z-10 text-sky-500/20" />
              <div className="absolute inset-0 bg-sky-600/5 rounded-full blur-3xl" />
            </div>
            <div>
              <h3 className="text-white/40 font-black text-3xl uppercase tracking-[0.3em]">Vide Intergalactique</h3>
              <p className="text-white/20 text-base mt-3 max-w-lg mx-auto font-medium leading-relaxed italic">Aucune chaîne ne correspond à cette recherche dans le catalogue Pluto.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-16 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8 relative z-20 bg-black/50 backdrop-blur-3xl -mx-4 md:-mx-8 lg:-mx-16 px-4 md:px-8 lg:px-16 mt-auto">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3 text-sky-500/60 font-black text-[11px] uppercase tracking-[0.3em] group cursor-default">
            <Zap size={18} className="group-hover:text-sky-400 transition-colors" /> Category View Enabled
          </div>
          <div className="flex items-center gap-3 text-sky-700/60 font-black text-[11px] uppercase tracking-[0.3em] group cursor-default">
            <Tv size={18} className="group-hover:text-sky-500 transition-colors" /> Official Pluto Streams
          </div>
        </div>
        <div className="text-white/10 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white/20 transition-colors cursor-default">
          Propulsé par Denden Tech × Pluto TV
        </div>
      </div>
    </div>
  );
}

