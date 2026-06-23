import React, { useState } from 'react';
import { 
  Search, ChevronLeft, 
  Play, Calendar, Zap, Tv, Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

// --- Types ---
interface SportSection { id: string; name: string; }
const SPORT_SECTIONS: SportSection[] = [
  { id: 'football', name: '⚽ Football' },
  { id: 'basket', name: '🏀 Basket' },
  { id: 'tennis', name: '🎾 Tennis' },
  { id: 'rugby', name: '🏉 Rugby' },
  { id: 'f1', name: '🏎 Formule 1' },
];

const HERO_MATCH = {
  title: "FRANCE VS BRESIL",
  competition: "COUPE DU MONDE",
  date: "22 Juin 2026",
  time: "21:00",
  channel: "beIN SPORTS 1",
  bg: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&h=900&fit=crop"
};

const LIVE_MATCHES = [
  { id: 1, title: "Lakers vs Celtics", score: "102 - 98", time: "Q4 - 05:20", channel: "Canal+ Sport" },
  { id: 2, title: "Nadal vs Djokovic", score: "6-4, 5-7, 2-1", time: "Set 3", channel: "Eurosport" },
];

const EPG_DATA = [
    { id: 101, title: "Grand Prix Australie", competition: "F1", time: "15:00", channel: "CANAL+" },
    { id: 102, title: "Real Madrid vs Barça", competition: "Liga", time: "19:00", channel: "beIN" },
    { id: 103, title: "Tournoi des 6 Nations", competition: "Rugby", time: "21:00", channel: "L'Equipe" },
];

export default function SportPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-3 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={24} /></button>
                <h1 className="text-lg font-black italic uppercase tracking-tighter">
                    DENDEN <span className="text-[#e72e1d]">SPORT+</span>
                </h1>
            </div>
            <div className="flex-1 max-w-xs mx-4">
                <div className="flex items-center gap-2 bg-neutral-900 border border-white/5 rounded-full px-4 py-2 hover:border-white/20 transition-colors">
                    <Search size={16} className="text-white/40" />
                    <input placeholder="Chercher sport..." className="bg-transparent focus:outline-none text-xs w-full" />
                </div>
            </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="relative h-[300px] sm:h-[400px] md:h-[500px] w-full bg-neutral-950 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_MATCH.bg})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-10" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12 z-20 max-w-[1600px] mx-auto">
            <div className="inline-block px-2 py-0.5 bg-[#e72e1d] text-white text-[10px] font-black uppercase rounded mb-2 tracking-wider">
                {HERO_MATCH.competition}
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter mb-2">{HERO_MATCH.title}</h2>
            <div className="flex items-center gap-4 text-white/70 font-semibold text-xs mt-4">
                <div className="flex items-center gap-1.5"><Calendar size={14} /> {HERO_MATCH.date} • {HERO_MATCH.time}</div>
                <div className="flex items-center gap-1.5"><Tv size={14} /> {HERO_MATCH.channel}</div>
            </div>
            <button className="mt-6 flex items-center gap-2 px-6 py-3 bg-white text-black font-black uppercase rounded-lg text-sm hover:bg-neutral-200 transition-colors">
                <Play size={14} fill="black" /> Regarder
            </button>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="max-w-[1600px] mx-auto px-4 py-8 space-y-10">
        
        {/* LIVE */}
        <section>
          <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 mb-4">
            <Zap className="text-[#e72e1d]" size={18} fill="currentColor" /> 🔴 En direct
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LIVE_MATCHES.map(match => (
                <div key={match.id} className="bg-neutral-900 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                    <div>
                        <h4 className="text-sm font-bold">{match.title}</h4>
                        <div className="text-neutral-500 text-[10px] mt-1 flex items-center gap-1"><Tv size={12} />{match.channel}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-black text-[#e72e1d]">{match.score}</div>
                        <div className="text-white/60 text-[10px] mt-0.5 font-bold">{match.time}</div>
                    </div>
                </div>
            ))}
          </div>
        </section>

        {/* EPG */}
        <section>
          <h2 className="text-lg font-black uppercase tracking-tight mb-4">Guide TV</h2>
          <div className="space-y-2">
            {EPG_DATA.map(prog => (
                <div key={prog.id} className="bg-neutral-900/50 p-3 rounded-xl flex items-center gap-4 border border-white/5">
                    <div className="text-xs font-black text-[#e72e1d] w-12">{prog.time}</div>
                    <div className="flex-1">
                        <div className="text-sm font-bold">{prog.title}</div>
                        <div className="text-[10px] text-white/50">{prog.competition} • {prog.channel}</div>
                    </div>
                </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
