import React, { useState, useEffect } from 'react';
import { 
  Search, ChevronLeft, 
  Play, Calendar, Zap, Tv, Clock, Sparkles, RefreshCw, AlertCircle, Info, Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Config ---
interface SportSection { id: string; name: string; emoji: string; }
const SPORT_SECTIONS: SportSection[] = [
  { id: 'all', name: 'Tous les sports', emoji: '🏆' },
  { id: 'football', name: 'Football', emoji: '⚽' },
  { id: 'basket', name: 'Basket', emoji: '🏀' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'rugby', name: 'Rugby', emoji: '🏉' },
  { id: 'f1', name: 'Formule 1', emoji: '🏎' },
  { id: 'cycling', name: 'Cyclisme', emoji: '🚴' },
];

const HERO_MATCH = {
  title: "FRANCE VS BRESIL",
  competition: "COUPE DU MONDE",
  date: "22 Juin 2026",
  time: "21:00",
  channel: "beIN SPORTS 1",
  bg: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&h=900&fit=crop"
};

interface LiveToast {
  id: string;
  message: string;
  type: 'goal' | 'point' | 'info';
  matchTitle: string;
}

export default function SportPage({ onBack }: { onBack: () => void }) {
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [epgData, setEpgData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [source, setSource] = useState<string>('local');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<LiveToast[]>([]);

  // Local state for Hero Match, dynamically updated from the actual fetched matches
  const [heroMatch, setHeroMatch] = useState<any>({
    title: "Coupe du Monde de la FIFA 2026",
    competition: "Tournoi International",
    date: "Aujourd'hui",
    time: "Direct",
    channel: "TF1 / beIN Sports",
    bg: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&h=900&fit=crop"
  });

  const [initialSplashOpen, setInitialSplashOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialSplashOpen(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const addToast = (message: string, type: 'goal' | 'point' | 'info', matchTitle: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, matchTitle }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const fetchSportsEpg = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const res = await fetch('/api/sports/epg/google');
      if (!res.ok) throw new Error('Failed to fetch sports EPG data');
      const data = await res.json();
      
      setLiveMatches(data.liveMatches || []);
      setEpgData(data.epgData || []);
      setSource(data.source || 'local');
      if (data.error) {
        console.warn('Backend returned fallback with error:', data.error);
      }
      setLastUpdated(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        setError(err.message || 'Erreur lors du chargement des programmes');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Setup periodic background polling every 5 seconds & initial load
  useEffect(() => {
    fetchSportsEpg(false);

    const interval = setInterval(() => {
      fetchSportsEpg(true); // silent background fetch
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Dynamically select the best match for the Hero Banner based on live matches or upcoming EPG
  useEffect(() => {
    if (liveMatches.length > 0) {
      const bestLive = liveMatches.find(m => m.sport?.toLowerCase() === 'football') || liveMatches[0];
      setHeroMatch({
        title: bestLive.title,
        competition: "Coupe du Monde FIFA 2026",
        date: "Match en Direct",
        time: bestLive.time || "Direct",
        channel: bestLive.channel,
        bg: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&h=900&fit=crop"
      });
    } else if (epgData.length > 0) {
      const bestUpcoming = epgData.find(m => m.sport?.toLowerCase() === 'football' || m.sport?.toLowerCase() === 'tennis') || epgData[0];
      setHeroMatch({
        title: bestUpcoming.title,
        competition: bestUpcoming.competition || "Coupe du Monde FIFA 2026",
        date: bestUpcoming.date || "Aujourd'hui",
        time: bestUpcoming.time,
        channel: bestUpcoming.channel,
        bg: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&h=900&fit=crop"
      });
    }
  }, [liveMatches, epgData]);

  // Real-time local game clock increments and occasional score updates every 5 seconds
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      setLiveMatches(prevMatches => {
        return prevMatches.map(match => {
          let updatedMatch = { ...match };

          // 1. Advance the match time ticker
          if (updatedMatch.time && updatedMatch.time.endsWith("'")) {
            const currentMin = parseInt(updatedMatch.time);
            if (!isNaN(currentMin)) {
              if (currentMin >= 90) {
                updatedMatch.time = "90+1'";
              } else {
                updatedMatch.time = `${currentMin + 1}'`;
              }
            }
          }

          // 2. Small random probability of score updates during matches
          if (Math.random() < 0.08) { // 8% chance per tick for score change / alert
            const sport = updatedMatch.sport?.toLowerCase() || '';
            if (sport === 'football') {
              const scores = updatedMatch.score.split('-').map((s: string) => parseInt(s.trim()));
              if (scores.length === 2 && !isNaN(scores[0]) && !isNaN(scores[1])) {
                const teamIndex = Math.random() > 0.5 ? 0 : 1;
                scores[teamIndex]++;
                updatedMatch.score = `${scores[0]} - ${scores[1]}`;
                
                const teams = updatedMatch.title.split('vs');
                const scoringTeam = teams[teamIndex]?.trim() || "But !";
                addToast(`⚽ BUT ! ${scoringTeam} marque ! Le score est maintenant de ${updatedMatch.score}`, 'goal', updatedMatch.title);
              }
            } else if (sport === 'rugby') {
              const scores = updatedMatch.score.split('-').map((s: string) => parseInt(s.trim()));
              if (scores.length === 2 && !isNaN(scores[0]) && !isNaN(scores[1])) {
                const teamIndex = Math.random() > 0.5 ? 0 : 1;
                const points = Math.random() > 0.6 ? 5 : 3;
                scores[teamIndex] += points;
                updatedMatch.score = `${scores[0]} - ${scores[1]}`;
                
                const teams = updatedMatch.title.split('vs');
                const scoringTeam = teams[teamIndex]?.trim() || "Points !";
                addToast(`🏉 POINTS ! +${points} pts pour ${scoringTeam} ! Score : ${updatedMatch.score}`, 'goal', updatedMatch.title);
              }
            } else if (sport === 'tennis') {
              addToast(`🎾 Point splendide ! Échange très intense dans ce jeu serré !`, 'point', updatedMatch.title);
            }
          }

          return updatedMatch;
        });
      });
    }, 5000);

    return () => clearInterval(simulationInterval);
  }, []);

  const getSportEmoji = (sport: string) => {
    const s = sport?.toLowerCase() || '';
    if (s.includes('foot')) return '⚽';
    if (s.includes('basket')) return '🏀';
    if (s.includes('tennis')) return '🎾';
    if (s.includes('rugby')) return '🏉';
    if (s.includes('f1') || s.includes('formula') || s.includes('mote')) return '🏎';
    if (s.includes('cycl') || s.includes('velo') || s.includes('tour')) return '🚴';
    if (s.includes('hand')) return '🤾';
    if (s.includes('box')) return '🥊';
    if (s.includes('golf')) return '⛳';
    return '🏆';
  };

  // Filter logic
  const filteredLiveMatches = liveMatches.filter(match => {
    const matchesSearch = searchQuery === '' || 
      match.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.channel?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || 
      match.sport?.toLowerCase().includes(activeFilter.toLowerCase()) ||
      (activeFilter === 'f1' && match.sport?.toLowerCase().includes('formule'));
      
    return matchesSearch && matchesFilter;
  });

  const filteredEpgData = epgData.filter(prog => {
    const matchesSearch = searchQuery === '' || 
      prog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.channel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.competition?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || 
      prog.sport?.toLowerCase().includes(activeFilter.toLowerCase()) ||
      (activeFilter === 'f1' && prog.sport?.toLowerCase().includes('formule'));
      
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden relative">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[900px] h-[900px] bg-[#e72e1d]/10 rounded-full blur-[180px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[800px] h-[800px] bg-orange-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Loading state / Splash */}
      <AnimatePresence>
        {initialSplashOpen && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#000] z-[99] flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-t-[#e72e1d] border-r-orange-500 border-b-[#e72e1d]/50 border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-xl italic tracking-tighter text-white">S+</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-widest italic">
                DENDEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e72e1d] to-orange-500">SPORT+</span>
              </h2>
              <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Connexion aux serveurs...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING TOASTS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="bg-neutral-900/95 backdrop-blur border border-[#e72e1d]/20 shadow-2xl p-4 rounded-2xl flex items-start gap-3 pointer-events-auto"
            >
              <div className="p-2 bg-[#e72e1d]/15 text-[#e72e1d] rounded-xl shrink-0">
                <Zap size={15} className="animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-[#e72e1d] flex items-center gap-1">
                  <span>🔴 FLASH DIRECT</span>
                </div>
                <div className="text-xs font-bold text-white mt-0.5 leading-snug">{toast.message}</div>
                <div className="text-[9px] text-white/50 mt-1 font-semibold truncate max-w-[200px]">{toast.matchTitle}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 hover:bg-white/10 rounded-full transition-colors" id="sport-back-btn">
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                DENDEN <span className="text-[#e72e1d]">SPORT+</span>
              </h1>
            </div>
          </div>

          <div className="flex-1 max-w-sm">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un match, une équipe..."
                className="w-full bg-white/5 border border-white/5 hover:bg-white/10 focus:bg-white/10 focus:border-white/20 rounded-full py-2.5 pl-11 pr-4 text-white text-xs outline-none transition-all placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Sync indicator */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all duration-300",
              source === 'google' 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            )}>
              {source === 'google' ? (
                <>
                  <Sparkles size={12} className="text-emerald-400 animate-pulse" />
                  <span>Amélioré par Google Live Search</span>
                </>
              ) : (
                <>
                  <Info size={12} className="text-blue-400" />
                  <span>Guide Local</span>
                </>
              )}
            </div>

            <button 
              onClick={() => fetchSportsEpg(false)} 
              disabled={loading || isRefreshing}
              className="p-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-full border border-white/5 text-white/80 hover:text-white transition-all flex items-center justify-center"
              title="Actualiser les programmes"
            >
              <RefreshCw size={14} className={cn("transition-transform", (loading || isRefreshing) && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="relative h-[250px] sm:h-[350px] md:h-[450px] w-full bg-neutral-950 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105" style={{ backgroundImage: `url(${heroMatch.bg})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-10" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12 z-20 max-w-[1600px] mx-auto">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#e72e1d] text-white text-[10px] font-black uppercase rounded mb-2 tracking-wider">
            <Zap size={10} fill="white" /> {heroMatch.competition}
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter mb-2 leading-none max-w-4xl">{heroMatch.title}</h2>
          <div className="flex items-center gap-4 text-white/70 font-semibold text-xs mt-4">
            <div className="flex items-center gap-1.5"><Calendar size={13} /> {heroMatch.date} • {heroMatch.time}</div>
            <div className="flex items-center gap-1.5"><Tv size={13} /> {heroMatch.channel}</div>
          </div>
          <button className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-white text-black font-black uppercase rounded-lg text-xs hover:bg-neutral-200 transition-colors shadow-lg shadow-white/5 active:scale-95">
            <Play size={12} fill="black" /> Regarder le direct
          </button>
        </div>
      </section>

      {/* SPORT CATEGORY CHIPS */}
      <div className="max-w-[1600px] mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {SPORT_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveFilter(section.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border",
                activeFilter === section.id
                  ? "bg-[#e72e1d] text-white border-[#e72e1d] shadow-lg shadow-[#e72e1d]/25"
                  : "bg-neutral-900 text-white/70 border-white/5 hover:bg-neutral-800 hover:text-white"
              )}
            >
              <span>{section.emoji}</span>
              <span>{section.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-[1600px] mx-auto px-4 py-6 space-y-10">
        {/* Real-time sync status bar */}
        {isRefreshing && (
          <div className="flex items-center justify-center gap-2 text-xs text-white/50 bg-white/5 py-1 px-4 rounded-full max-w-xs mx-auto animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Mise à jour en temps réel...</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20 flex flex-col items-center justify-center space-y-4"
            >
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-[#e72e1d]/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#e72e1d] animate-spin"></div>
                <div className="absolute inset-0.5 rounded-full border border-white/10 animate-pulse"></div>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-widest text-[#e72e1d] animate-pulse">Recherche Google en cours...</p>
                <p className="text-[11px] text-white/50 mt-1 max-w-sm">
                  Denden Sport+ interroge l'intelligence de Google pour extraire les vrais matchs de sport diffusés à la TV aujourd'hui.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              {/* SOURCE BANNER */}
              {source === 'google' && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/15 rounded-xl text-emerald-400">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">EPG Enrichi par Google</h3>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        Les horaires et rencontres ci-dessous proviennent des derniers résultats de recherche Google en temps réel.
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right text-[10px] text-white/40">
                    <div>Mise à jour: <span className="text-white/70 font-bold">{lastUpdated}</span></div>
                    <div>Source: Google Search Grounding API</div>
                  </div>
                </div>
              )}

              {/* LIVE SECTION */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Zap className="text-[#e72e1d] animate-pulse" size={18} fill="currentColor" /> 🔴 En direct ({filteredLiveMatches.length})
                  </h2>
                  {searchQuery && <span className="text-[10px] text-white/40 font-bold uppercase">Résultats filtrés</span>}
                </div>

                {filteredLiveMatches.length === 0 ? (
                  <div className="bg-neutral-900/40 border border-white/5 rounded-2xl py-8 text-center text-white/50 text-xs">
                    Aucun événement en direct trouvé pour ce filtre.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLiveMatches.map((match, idx) => (
                      <div 
                        key={match.id || idx} 
                        className="bg-neutral-900/80 p-4.5 rounded-2xl flex items-center justify-between border border-white/5 hover:border-[#e72e1d]/30 hover:bg-neutral-900 transition-all duration-300 group"
                      >
                        <div className="space-y-2 flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base" title={match.sport}>
                              {getSportEmoji(match.sport)}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#e72e1d] bg-[#e72e1d]/10 px-1.5 py-0.5 rounded">
                              {match.sport || 'Sport'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#e72e1d] transition-colors">{match.title}</h4>
                          <div className="text-neutral-500 text-[10px] font-semibold flex items-center gap-1">
                            <Tv size={11} />
                            <span className="text-white/60 truncate">{match.channel}</span>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end justify-center">
                          <div className="text-base font-black text-[#e72e1d] font-mono tracking-tight bg-[#e72e1d]/5 px-2.5 py-1 rounded-lg border border-[#e72e1d]/10">
                            {match.score || 'VS'}
                          </div>
                          <div className="text-emerald-400 text-[10px] mt-1.5 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            {match.time || 'Direct'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* UPCOMING EPG SECTION */}
              <section>
                <h2 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-[#e72e1d]" /> Guide TV & Prochainement ({filteredEpgData.length})
                </h2>

                {filteredEpgData.length === 0 ? (
                  <div className="bg-neutral-900/40 border border-white/5 rounded-2xl py-8 text-center text-white/50 text-xs">
                    Aucun programme à venir trouvé pour ce filtre.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredEpgData.map((prog, idx) => (
                      <div 
                        key={prog.id || idx} 
                        className="bg-neutral-900/40 p-3.5 rounded-xl flex items-center gap-4 border border-white/5 hover:border-white/10 hover:bg-neutral-900/70 transition-all group"
                      >
                        {/* Time block */}
                        <div className="flex flex-col items-center justify-center bg-neutral-900 border border-white/5 rounded-lg w-16 h-14 shrink-0">
                          <span className="text-xs font-black text-[#e72e1d] font-mono">{prog.time}</span>
                          <span className="text-[8px] uppercase tracking-tighter text-white/40 font-bold">{prog.date || 'Auj.'}</span>
                        </div>

                        {/* Title block */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs" title={prog.sport}>
                              {getSportEmoji(prog.sport)}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">
                              {prog.competition}
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-white group-hover:text-[#e72e1d] transition-colors truncate">{prog.title}</h3>
                          <div className="text-[10px] text-white/50 font-semibold flex items-center gap-1 mt-0.5">
                            <Tv size={10} />
                            <span className="truncate">{prog.channel}</span>
                          </div>
                        </div>

                        {/* Watch Button Shortcut */}
                        <button className="p-2 bg-white/5 hover:bg-[#e72e1d] text-white hover:text-white rounded-lg border border-white/5 hover:border-transparent transition-all shrink-0 active:scale-95" title="Regarder">
                          <Play size={10} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
