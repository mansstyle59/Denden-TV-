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
      filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(q));
    }
    
    return filtered;
  }, [channels, selectedSubCategory, searchQuery]);

  const gridCols = {
    mobile: "grid-cols-2 sm:grid-cols-3 gap-3",
    tablet: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4",
    desktop: "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-4"
  };

  return (
    <div className="min-h-screen space-y-5 md:space-y-8 bg-[#040202] md:rounded-[40px] border-x-0 md:border md:border-white/5 p-3 sm:p-6 lg:p-10 relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.95)]">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[180px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] bg-rose-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-8 relative z-10">
        <div className="flex flex-col gap-3 w-full">
           <div className="flex items-center gap-3 md:gap-5">
             <button 
               onClick={onBack} 
               className="group shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/5 hover:bg-red-600/20 text-white rounded-xl transition-all border border-white/10 hover:border-red-500/30 active:scale-95 shadow-2xl"
             >
               <ArrowLeft className="group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} size={18} />
             </button>
             <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5 bg-red-600 px-2 py-0.5 rounded shadow-lg shadow-red-600/30 border border-red-400/20">
                    <Shield size={9} className="text-white" />
                    <span className="text-white text-[8px] font-black uppercase tracking-[0.1em]">Zone Adulte</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/10 backdrop-blur-xl">
                    <Lock size={9} className="text-red-400" />
                    <span className="text-white/40 text-[8px] font-black uppercase tracking-[0.1em]">Privé</span>
                  </div>
                  <button 
                    onClick={onBack}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[8px] font-black uppercase tracking-widest border border-white/10 transition-all"
                  >
                    Quitter
                  </button>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter italic uppercase leading-none mt-0.5">
                  DENDEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-600 drop-shadow-sm">XXX</span>
                </h1>
             </div>
           </div>
        </div>

        <div className="relative w-full lg:w-80 group shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500 transition-all duration-500" size={16} />
          <input
            type="text"
            placeholder="Rechercher un canal adulte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-white/[0.03] py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-white/20 border border-white/10 outline-none focus:border-red-500/50 focus:bg-white/[0.08] transition-all duration-500 shadow-xl focus:shadow-red-500/10 backdrop-blur-3xl font-medium"
          />
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-2 px-2 relative z-10">
        {subCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedSubCategory(cat)}
            className={cn(
              "px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all duration-300 border active:scale-95",
              selectedSubCategory === cat
                ? "bg-red-600 text-white border-red-400 shadow-[0_5px_15px_rgba(220,38,38,0.25)]"
                : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/30 backdrop-blur-md"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className={cn("grid gap-4 sm:gap-6 relative z-10", gridCols[deviceType])}>
        {filteredChannels.length > 0 ? (
          filteredChannels.map((channel, i) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.012, 0.4), type: "spring", stiffness: 300, damping: 25 }}
            >
              <ChannelCardWrapper
                channel={channel}
                onClick={onChannelSelect}
                className="group relative bg-[#0c0909] border border-white/5 cursor-pointer rounded-xl overflow-hidden hover:border-red-600/40 hover:shadow-[0_12px_24px_rgba(220,38,38,0.15)] transition-all duration-300 shadow-xl"
              >
                {/* Image Container */}
                <div className="w-full h-20 sm:h-24 bg-[#050303] relative flex items-center justify-center p-3 overflow-hidden transition-all duration-300 border-b border-white/[0.02]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 z-10" />
                  
                  <img
                    src={channel.logo || "/logo-18.svg"}
                    alt={channel.name}
                    className="max-h-[50px] sm:max-h-[60px] max-w-[85%] object-contain relative z-20 group-hover:scale-105 transition-transform duration-500 filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.8)]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // fallback to clean 18 logo if broken URL
                      e.currentTarget.src = "/logo-18.svg";
                    }}
                  />

                  {/* Discrete -18 tag in corner of image */}
                  <div className="absolute top-1.5 right-1.5 z-30 bg-black/80 px-1 py-0.5 rounded text-[8px] font-black text-red-500 border border-red-500/30 scale-90">
                    -18
                  </div>

                  <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
                </div>

                {/* Info Section */}
                <div className="p-2 sm:p-3 space-y-1 relative z-50 bg-[#0c0909]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-extrabold uppercase tracking-tight text-xs line-clamp-1 group-hover:text-red-500 transition-colors leading-tight">
                      {channel.name}
                    </h4>
                  </div>
                  
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white/30 font-bold uppercase tracking-wider truncate max-w-[65%]">
                      {channel.country || 'MONDIAL'}
                    </span>
                    <div className="flex items-center gap-1 text-red-500/50 group-hover:text-red-400 transition-all duration-300 font-extrabold">
                      <Flame size={10} className="animate-pulse" />
                      <span className="text-[8px] uppercase tracking-wider">HOT</span>
                    </div>
                  </div>

                  {/* Discreet bottom line on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </div>
              </ChannelCardWrapper>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-24 sm:py-36 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-white/[0.01] border border-white/5 flex items-center justify-center text-white/5 shadow-2xl relative text-red-500/10">
              <Search size={40} className="relative z-10" />
              <div className="absolute inset-0 bg-red-600/5 rounded-full blur-2xl" />
            </div>
            <div>
              <h3 className="text-white/40 font-black text-xl uppercase tracking-widest">Zone déserte</h3>
              <p className="text-white/20 text-xs mt-2 max-w-sm mx-auto font-medium leading-relaxed italic">Aucune diffusion trouvée pour votre recherche adulte.</p>
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
