import React, { useState, useMemo } from 'react';
import { Channel } from '../types';
import ChannelCardWrapper from './ChannelCardWrapper';
import { Play, Tv, Search, Lock, Shield, Eye, Flame, Heart, Zap, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface Props {
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  onBack: () => void;
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

export default function PrivatePlutoPage({ channels, onChannelSelect, onBack, deviceType }: Props) {
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const subCategories = useMemo(() => {
    // We use 'country' as sub-categories for private channels
    const cats = new Set(channels.map(c => c.country || 'Mondial'));
    return ['Tous', ...Array.from(cats)].sort();
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let filtered = channels;
    
    if (selectedSubCategory !== 'Tous') {
      filtered = filtered.filter(c => (c.country || 'Mondial') === selectedSubCategory);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q));
    }
    
    return filtered;
  }, [channels, selectedSubCategory, searchQuery]);

  const gridCols = {
    mobile: "grid-cols-2",
    tablet: "grid-cols-3",
    desktop: "grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
  };

  return (
    <div className="min-h-screen space-y-8 md:space-y-12 bg-[#080505] md:rounded-[56px] border-x-0 md:border md:border-white/5 p-4 sm:p-8 lg:p-16 relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[180px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] bg-rose-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-10 relative z-10">
        <div className="flex flex-col gap-4 w-full">
           <div className="flex items-start gap-4 md:gap-6">
             <button 
               onClick={onBack} 
               className="group shrink-0 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-white/5 hover:bg-red-600/20 text-white rounded-xl md:rounded-2xl transition-all border border-white/10 hover:border-red-500/30 active:scale-90 shadow-2xl"
             >
               <ArrowLeft className="group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} size={20} />
             </button>
             <div className="flex flex-col gap-2 mt-0.5 w-full">
                <div className="flex items-center flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 bg-red-600 px-2 py-1 rounded shadow-lg shadow-red-600/30 border border-red-400/20">
                    <Shield size={10} className="text-white" />
                    <span className="text-white text-[9px] font-black uppercase tracking-[0.1em]">Premium Hub</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/10 backdrop-blur-xl">
                    <Lock size={10} className="text-red-400" />
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.1em]">Restricted Area</span>
                  </div>
                  <button 
                    onClick={onBack}
                    className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all"
                  >
                    Quitter
                  </button>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter italic uppercase leading-none mt-1">
                  DENDEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-600 drop-shadow-sm">XXX</span>
                </h1>
             </div>
           </div>
        </div>

        <div className="relative w-full lg:w-96 group shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500 transition-all duration-500" size={18} />
          <input
            type="text"
            placeholder="Explorer la zone secrète..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-white/[0.03] py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/20 border border-white/10 outline-none focus:border-red-500/50 focus:bg-white/[0.08] transition-all duration-500 shadow-xl focus:shadow-red-500/10 backdrop-blur-3xl font-medium"
          />
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 relative z-10">
        {subCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedSubCategory(cat)}
            className={cn(
              "px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-500 border active:scale-95",
              selectedSubCategory === cat
                ? "bg-red-600 text-white border-red-400 shadow-[0_10px_30px_rgba(220,38,38,0.3)]"
                : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/30 backdrop-blur-md"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className={cn("grid gap-10 relative z-10", gridCols[deviceType])}>
        {filteredChannels.length > 0 ? (
          filteredChannels.map((channel, i) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.6), type: "spring", stiffness: 260, damping: 20 }}
            >
              <ChannelCardWrapper
                channel={channel}
                onClick={onChannelSelect}
                className="group relative bg-[#111111] border-2 border-white/5 cursor-pointer rounded-[18px] overflow-hidden hover:border-red-650 hover:shadow-[0_25px_50px_rgba(229,9,20,0.3)] transition-all duration-500 shadow-2xl"
              >
                {/* Image Container */}
                <div className="w-full h-32 md:h-44 bg-black relative flex items-center justify-center p-6 overflow-hidden transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40 z-10" />
                  
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="max-h-[100px] md:max-h-[130px] max-w-[90%] object-contain relative z-20 group-hover:scale-110 transition-transform duration-700 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-white/5 group-hover:text-red-500/20 transition-colors relative z-20">
                      <Tv size={64} strokeWidth={1} />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-red-650/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl" />
                </div>

                {/* Info Section */}
                <div className="p-4 md:p-6 space-y-3 relative z-50 bg-[#111111]">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-red-650 px-2.5 py-1 rounded-xl border border-white/20 shadow-xl shadow-red-600/30 backdrop-blur-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">En Direct</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-white font-black uppercase tracking-tight text-sm md:text-lg line-clamp-1 group-hover:text-red-500 transition-colors italic leading-none">
                      {channel.name}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em] truncate max-w-[70%]">
                        {channel.country || 'MONDIAL'}
                      </span>
                      <div className="flex items-center gap-1.5 text-red-500/40 group-hover:text-red-400 transition-all duration-500">
                        <Flame size={12} className="animate-pulse" />
                        <span className="text-[9px] font-black italic tracking-wider">HOT</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mt-4">
                     <div className="h-full w-[65%] bg-gradient-to-r from-red-650 to-orange-500 shadow-[0_0_15px_rgba(229,9,20,0.5)]" />
                  </div>
                </div>
              </ChannelCardWrapper>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-48 flex flex-col items-center justify-center text-center space-y-8">
            <div className="w-32 h-32 rounded-[40px] bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/5 shadow-2xl relative text-red-500/10">
              <Search size={56} className="relative z-10" />
              <div className="absolute inset-0 bg-red-600/5 rounded-full blur-3xl" />
            </div>
            <div>
              <h3 className="text-white/40 font-black text-3xl uppercase tracking-[0.3em]">Zone déserte</h3>
              <p className="text-white/20 text-base mt-3 max-w-lg mx-auto font-medium leading-relaxed italic">Aucune diffusion n'a été trouvée pour votre recherche dans cette section premium.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-16 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3 text-red-500/60 font-black text-[11px] uppercase tracking-[0.3em] group cursor-default">
            <Zap size={18} className="group-hover:text-red-400 transition-colors" /> Private Engine v4.0
          </div>
          <div className="flex items-center gap-3 text-rose-500/60 font-black text-[11px] uppercase tracking-[0.3em] group cursor-default">
            <Heart size={18} className="group-hover:text-rose-400 transition-colors" /> Exclusive Hub
          </div>
        </div>
        <div className="text-white/10 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white/20 transition-colors cursor-default">
          Powered by Denden TV Private Network
        </div>
      </div>
    </div>
  );
}
