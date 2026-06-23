import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Maximize2, MonitorPlay, Star, Volume2, VolumeX, History, 
  Search, Calendar, FileUp, Link, Trash2, ArrowRight, Activity, 
  Trophy, Tv, RefreshCw, AlertCircle, Sparkles, ChevronRight, Check,
  Clock, Wifi, User, Zap, Info, ZapOff, Activity as Pulse, Heart,
  Film, BookOpen, Users, Globe, X
} from 'lucide-react';
import { Channel, Movie } from '../types';
import { cn } from '../lib/utils';
import DendenLogo from './DendenLogo';
import VideoPlayer from './VideoPlayer';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import useLongPress from '../hooks/useLongPress';
import ChannelCardWrapper from './ChannelCardWrapper';

interface HomePremiumProps {
  channels: Channel[];
  movies?: Movie[];
  onChannelSelect: (content: any) => void;
  onChannelLongPress?: (channel: Channel) => void;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv';
  onNavigateToSection: (section: string) => void;
  liveEpg?: { [channelId: string]: { current: any; next: any; programmeTv?: any } };
  continueWatching?: { [id: string]: number };
}

export default function HomePremium({
  channels = [],
  movies = [],
  onChannelSelect,
  onChannelLongPress,
  deviceType,
  onNavigateToSection,
  liveEpg,
  continueWatching = {}
}: HomePremiumProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyWatched, setRecentlyWatched] = useState<(Channel | Movie)[]>([]);
  const [heroChannel, setHeroChannel] = useState<Channel | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'grid'>('categories');
  const [heroType, setHeroType] = useState<'channel' | 'movie'>('channel');
  const [selectedDetailMovie, setSelectedDetailMovie] = useState<Movie | null>(null);
  
  // M3U Import Form States
  const [m3uUrl, setM3uUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time for dynamic progression
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Load recently watched history
  useEffect(() => {
    try {
      const stored = localStorage.getItem('denden_recent_history');
      if (stored) {
        try {
          const history = JSON.parse(stored) as { id: string, type: 'channel' | 'movie' }[];
          const matching = history
            .map(item => {
              if (item.type === 'channel') return channels.find(c => c.id === item.id);
              if (item.type === 'movie') return movies.find(m => m.id === item.id);
              return null;
            })
            .filter((item): item is (Channel | Movie) => !!item);
          setRecentlyWatched(matching);
        } catch (err) {
          console.error('Error parsing recent history:', err);
        }
      }
    } catch (e) {}
  }, [channels, movies]);

  // Set hero channel (last watched channel)
  useEffect(() => {
    if (channels.length > 0) {
      if (recentlyWatched.length > 0) {
        // Find first channel in history for hero
        const firstChannel = recentlyWatched.find(item => !('videoUrl' in item)) as Channel | undefined;
        if (firstChannel) {
          setHeroChannel(firstChannel);
        } else {
          setHeroChannel(channels[0]);
        }
      } else {
        setHeroChannel(channels[0]);
      }
    }
  }, [channels, recentlyWatched]);

  // Handle Drag Over
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseM3u = (text: string) => {
    const lines = text.split('\n');
    const parsed: Partial<Channel>[] = [];
    let current: Partial<Channel> | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXTINF:')) {
        const logoMatch = line.match(/tvg-logo="([^"]+)"/) || line.match(/logo="([^"]+)"/);
        const groupMatch = line.match(/group-title="([^"]+)"/) || line.match(/category="([^"]+)"/);
        const commaIndex = line.lastIndexOf(',');
        const name = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Chaîne sans nom';
        current = {
          name: name || 'Chaîne en direct',
          logo: logoMatch ? logoMatch[1] : 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120',
          category: groupMatch ? groupMatch[1] : 'Généraliste',
        };
      } else if (line && !line.startsWith('#') && current) {
        current.url = line;
        parsed.push(current);
        current = null;
      }
    }
    return parsed;
  };

  const handleM3uUpload = async (text: string) => {
    setIsImporting(true);
    try {
      const channelsParsed = parseM3u(text);
      if (channelsParsed.length === 0) {
        alert('Playlist invalide.');
        return;
      }
      const response = await axios.post('/api/channels/bulk', channelsParsed);
      setImportCount(response.data.count);
      setTimeout(() => setImportCount(null), 5000);
    } catch (err) {
      console.error(err);
      alert('Erreur importation.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const text = await file.text();
      await handleM3uUpload(text);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const text = await e.target.files[0].text();
      await handleM3uUpload(text);
    }
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!m3uUrl) return;
    setIsImporting(true);
    try {
      const res = await axios.get(m3uUrl);
      await handleM3uUpload(res.data);
      setM3uUrl('');
    } catch (err) {
      console.error(err);
      alert('Erreur URL.');
    } finally {
      setIsImporting(false);
    }
  };

  const getDynamicProgram = (channel: Channel) => {
    const epgData = liveEpg?.[channel.id];
    
    if (epgData?.programmeTv) {
      const ptv = epgData.programmeTv;
      return {
        title: ptv.title,
        type: channel.category || "Divertissement",
        progressPercent: ptv.progress,
        startTimeLabel: ptv.time || "--:--",
        endTimeLabel: "", 
        nextShow: "",
        isScraped: true,
        image: ptv.image,
        description: "" 
      };
    }

    const realEpg = epgData?.current;
    if (realEpg) {
      const start = new Date(realEpg.startTime);
      const end = new Date(realEpg.endTime);
      const nowMs = Date.now();
      const duration = (end.getTime() - start.getTime()) / 60000;
      const elapsed = Math.max(0, (nowMs - start.getTime()) / 60000);
      const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (elapsed / duration) * 100)) : 50;
      return {
        title: realEpg.title,
        type: realEpg.category || "Généraliste",
        progressPercent,
        startTimeLabel: format(start, 'HH:mm'),
        endTimeLabel: format(end, 'HH:mm'),
        nextShow: epgData?.next?.title || "Film / Émission",
        isScraped: false,
        image: realEpg.icon || null,
        description: realEpg.description || ""
      };
    }

    const hour = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    let title = "Streaming Direct";
    let type = "Généraliste";
    if ((channel.category || '').toLowerCase().includes('sport')) { title = "Compétition Live"; type = "Sport"; }
    else if ((channel.category || '').toLowerCase().includes('ciné')) { title = "Film du moment"; type = "Cinéma"; }
    const elapsedP = (minutes / 60) * 100;
    return {
      title,
      type,
      progressPercent: elapsedP,
      startTimeLabel: `${hour}:00`,
      endTimeLabel: `${hour + 1}:00`,
      nextShow: "Nouveau programme",
      isScraped: false,
      image: null,
      description: ""
    };
  };

  const fuzzyMatch = (str: string | undefined, query: string) => {
    const s = (str || '').toLowerCase();
    const q = query.toLowerCase();
    let i = 0, j = 0;
    while (i < s.length && j < q.length) {
      if (s[i] === q[j]) j++;
      i++;
    }
    return j === q.length;
  };

  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => (a.channelNumber || 9999) - (b.channelNumber || 9999));
  }, [channels]);

  const searchResults = searchQuery.trim() === '' ? [] : sortedChannels.filter(channel => {
    if ((channel.name || '').toLowerCase().includes(searchQuery.toLowerCase())) return true;
    if ((channel.category || '').toLowerCase().includes(searchQuery.toLowerCase())) return true;
    const prog = getDynamicProgram(channel);
    if ((prog.title || '').toLowerCase().includes(searchQuery.toLowerCase())) return true;
    return fuzzyMatch(channel.name, searchQuery);
  }).slice(0, 12);

  const isMobile = deviceType === 'mobile' || deviceType === 'tablet';

  const spotlightMovie = useMemo(() => {
    if (!movies || movies.length === 0) return null;
    const withVisual = movies.filter(m => m.banner || m.poster);
    const pool = withVisual.length > 0 ? withVisual : movies;
    return [...pool].sort((a, b) => {
      const bScore = (b.ratingImdb || 0);
      const aScore = (a.ratingImdb || 0);
      return bScore - aScore;
    })[0];
  }, [movies]);

  if (channels.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full bg-[#111]/80 backdrop-blur-3xl rounded-[32px] border border-white/5 shadow-2xl p-10"
        >
          <div className="flex justify-center mb-10"><DendenLogo variant="splash" size={120} animate /></div>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Bienvenue sur DENDEN TV</h2>
            <p className="text-white/40 text-xs mt-2 uppercase tracking-[0.3em]">Importez vos chaînes pour commencer</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div 
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn("flex flex-col items-center justify-center p-8 rounded-[28px] border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group h-64", dragActive && "border-indigo-600 bg-indigo-600/5")}
            >
              <input ref={fileInputRef} type="file" accept=".m3u,.m3u8" onChange={handleFileChange} className="hidden" />
              <FileUp size={32} className="text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-black text-sm uppercase tracking-widest">Fichier M3U</h3>
              <p className="text-white/20 text-[10px] mt-2 text-center uppercase tracking-widest font-black">Glisser-Déposer</p>
            </div>
            <div className="flex flex-col justify-center p-8 rounded-[28px] border border-white/10 bg-white/[0.02] h-64">
              <Link size={32} className="text-blue-500 mb-4 mx-auto" />
              <form onSubmit={handleUrlImport} className="space-y-4">
                <input 
                  type="url" placeholder="Lien M3U..." value={m3uUrl} onChange={(e) => setM3uUrl(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-4 text-base text-white focus:outline-none" required
                />
                <button type="submit" disabled={isImporting} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                  {isImporting ? <RefreshCw className="animate-spin mx-auto" size={14} /> : 'Importer URL'}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const categoriesMap = sortedChannels.reduce((acc, channel) => {
    const cat = channel.category || 'Généralistes';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(channel);
    return acc;
  }, {} as { [key: string]: Channel[] });

  const getCategoryPriority = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('général') || n.includes('tnt')) return 1;
    if (n.includes('ciné') || n.includes('film') || n.includes('série') || n.includes('cinema')) return 2;
    if (n.includes('sport')) return 3;
    if (n.includes('jeunesse') || n.includes('kid') || n.includes('dessin') || n.includes('anime')) return 4;
    if (n.includes('info') || n.includes('news') || n.includes('actualité')) return 5;
    if (n.includes('doc') || n.includes('découverte') || n.includes('histoire') || n.includes('science')) return 6;
    return 10;
  };

  const getCategoryIcon = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('général') || n.includes('tnt')) return Tv;
    if (n.includes('ciné') || n.includes('film') || n.includes('série') || n.includes('cinema')) return MonitorPlay;
    if (n.includes('sport')) return Trophy;
    if (n.includes('jeunesse') || n.includes('kid') || n.includes('dessin') || n.includes('anime')) return Sparkles;
    if (n.includes('info') || n.includes('news') || n.includes('actualité')) return Activity;
    if (n.includes('doc') || n.includes('découverte') || n.includes('histoire') || n.includes('science')) return Info;
    return Heart;
  };

  const sortedCategories = Object.keys(categoriesMap).sort((a, b) => {
    return getCategoryPriority(a) - getCategoryPriority(b);
  });

  const heroProgDetails = heroChannel ? getDynamicProgram(heroChannel) : null;

  return (
    <div 
      id="home-container"
      tabIndex={0}
      className={cn("relative space-y-8 pb-32 focus:outline-none", isMobile && "pb-36")}
    >
      {/* HEADER SECTION */}
      <header className="flex items-center justify-between bg-transparent py-4 px-4 lg:px-8 gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-6">
          <DendenLogo variant="compact" size={32} />
        </div>

        {/* INTEGRATED SEARCH BAR */}
        <div className="flex-1 max-w-xl mx-auto hidden md:block">
           <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-indigo-400 transition-colors">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Rechercher une chaîne, un film, une catégorie..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.08] border border-white/10 focus:border-indigo-500/50 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none transition-all backdrop-blur-md shadow-inner"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-4 flex items-center text-white/30 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
           </div>
        </div>

        <div className="flex items-center gap-4">
           {deviceType !== 'mobile' && !isMobile && (
             <div className="flex items-center gap-4 px-5 py-2 bg-white/[0.03] border border-white/5 rounded-full text-[11px] font-black uppercase tracking-wider text-white/50">
                <div className="flex items-center gap-2">
                  <Tv size={14} className="text-white/70" />
                  <span className="hidden lg:inline">{channels.length} Chaînes</span>
                </div>
                <div className="h-3 w-[1px] bg-white/10" />
                <div className="flex items-center gap-2">
                  <Film size={14} className="text-white/70" />
                  <span className="hidden lg:inline">{movies.length} Films</span>
                </div>
             </div>
           )}

           <div className="flex items-center gap-3 px-5 py-2 bg-white/[0.03] rounded-full border border-white/5 shadow-sm">
              <div className="flex items-center gap-2">
                 <Clock size={14} className="text-white/70 shrink-0" />
                 <span className="text-white/90 font-bold text-xs tracking-tight font-mono">{format(currentTime, 'HH:mm')}</span>
              </div>
           </div>
        </div>
      </header>

      {/* MOBILE SEARCH BAR */}
      <div className="px-4 md:hidden">
        <div className="relative group">
           <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/30">
             <Search size={16} />
           </div>
           <input 
             type="text" 
             placeholder="Rechercher..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none"
           />
        </div>
      </div>

      {/* TABS FOR HERO SWITCHER */}
      {searchQuery.trim() === '' && spotlightMovie && heroChannel && (
        <div className="flex bg-white/[0.02] p-1 rounded-2xl border border-white/5 w-fit ml-4 text-[10px] font-black uppercase tracking-wider shadow-inner shrink-0 scale-95 origin-left">
          <button 
            type="button"
            onClick={() => setHeroType('channel')}
            className={cn("px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-black", heroType === 'channel' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" : "text-white/40 hover:text-white")}
          >
            <Tv size={12} />
            Direct TV à la une
          </button>
          <button 
            type="button"
            onClick={() => setHeroType('movie')}
            className={cn("px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-black", heroType === 'movie' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" : "text-white/40 hover:text-white")}
          >
            <Film size={12} />
            Blockbuster VOD vedette
          </button>
        </div>
      )}

      {/* PREMIUM CINEMA HERO SHOWCASE */}
      {searchQuery.trim() === '' && (
        <section className="px-4">
          {heroType === 'channel' && heroChannel && heroProgDetails ? (
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#120a16] p-6 lg:p-12 shadow-2xl min-h-[360px] flex items-center">
              {heroProgDetails.image && (
                <>
                  <div className="absolute inset-0 bg-black/60 z-0" />
                  <img src={heroProgDetails.image} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity blur-[2px] transition-all duration-1000 scale-105" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-0" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent z-0" />
                </>
              )}
              <div className="absolute right-0 top-0 w-1/2 h-full bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none z-0" />
              
              <div className="relative w-full z-10 flex flex-col gap-6">
                {/* Pill & Logo/Name row */}
                <div className="flex items-center gap-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white/60">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] font-sans">À LA UNE MAINTENANT</span>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-neutral-900 border border-white/10 rounded-2xl p-3 flex items-center justify-center shadow-2xl">
                       <img src={heroChannel.logo || undefined} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase leading-none">{heroChannel.name}</h2>
                        <div className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em] mt-1">{heroChannel.category || "Sport"}</div>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="space-y-4 bg-white/[0.03] p-6 rounded-[24px] border border-white/5 shadow-inner backdrop-blur-sm">
                    <h3 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight uppercase">
                      {heroProgDetails.title}
                    </h3>
                    <p className="text-white/60 text-sm line-clamp-2 leading-relaxed">
                      {heroProgDetails.description || "Profitez de votre programme favori."}
                    </p>
                    <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-wider bg-black/20 w-fit px-3 py-1.5 rounded-lg border border-white/5">
                        <Clock size={12} />
                        <span>{heroProgDetails.startTimeLabel} — {heroProgDetails.endTimeLabel || "Direct"}</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${heroProgDetails.progressPercent}%` }} />
                    </div>
                </div>
                
                {/* Buttons */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => onChannelSelect(heroChannel)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-black text-xs uppercase tracking-[0.1em] rounded-xl transition-all hover:bg-neutral-200"
                  >
                    <Play size={14} fill="currentColor" /> REGARDER
                  </button>
                  <button 
                    onClick={() => onNavigateToSection('guide')}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-black text-xs uppercase tracking-[0.1em] rounded-xl transition-all hover:bg-white/20 border border-white/10"
                  >
                    <Calendar size={14} /> GUIDE TV
                  </button>
                </div>
              </div>
            </div>
          ) : heroType === 'movie' && spotlightMovie ? (
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#070707] min-h-[360px] shadow-2xl flex items-center">
              <div 
                className="absolute inset-x-0 top-0 bottom-0 right-0 w-full md:w-3/4 bg-cover bg-center opacity-40 md:opacity-50 transition-all duration-1000 scale-100 pointer-events-none"
                style={{ 
                  backgroundImage: `url(${spotlightMovie.banner || spotlightMovie.poster})`,
                  maskImage: 'linear-gradient(to left, black 40%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 50%, black 10%, transparent 100%)'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/95 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
              
              <div className="relative w-full z-10 p-6 lg:p-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-4 max-w-2xl">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 rounded-full text-amber-500 shadow-xl">
                    <Star size={14} className="fill-current text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em]">{spotlightMovie.ratingImdb || '8.8'} SCORE IMDB</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] uppercase drop-shadow-2xl">{spotlightMovie.title}</h2>
                    {spotlightMovie.originalTitle && (
                      <p className="text-white/30 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mt-3">Titre original : {spotlightMovie.originalTitle}</p>
                    )}
                  </div>

                  <p className="text-white/50 text-sm md:text-base line-clamp-3 leading-relaxed max-w-xl font-medium mt-6 bg-white/[0.02] p-4 rounded-2xl border border-white/5 shadow-inner">
                    {spotlightMovie.summary || "Découvrez notre sélection spéciale VOD. Lancez la lecture instantanée en haute définition (4K / UHD) ou visionnez la bande annonce complète."}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-white/40 uppercase tracking-widest mt-8 bg-black/40 w-fit px-5 py-2.5 rounded-2xl backdrop-blur-xl border border-white/5 shadow-2xl">
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-black border border-emerald-500/20">{spotlightMovie.quality}</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span>{spotlightMovie.year}</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span>{spotlightMovie.duration}</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-indigo-400">{spotlightMovie.genres ? spotlightMovie.genres.slice(0, 2).join(' / ') : 'Cinéma'}</span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-4 shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => onChannelSelect(spotlightMovie)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[20px] transition-all shadow-[0_10px_40px_rgba(79,70,229,0.3)] border border-indigo-400/20 hover:border-indigo-400/40 group"
                  >
                    <Play size={18} fill="currentColor" className="group-hover:scale-125 transition-transform" /> Regarder
                  </button>
                  <button 
                    onClick={() => setSelectedDetailMovie(spotlightMovie)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 active:scale-95 text-white/90 hover:text-white font-black text-xs uppercase tracking-[0.2em] rounded-[20px] transition-all border border-white/10 backdrop-blur-sm"
                  >
                    <Info size={18} /> Détails
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {searchQuery.trim() !== '' ? (
        <section className="space-y-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-white tracking-tighter uppercase font-sans">Résultats ({searchResults.length})</h3>
              <button 
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
              >
                Fermer
              </button>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {searchResults.map((channel, i) => (
                <ChannelCardWrapper 
                  key={`${channel.id}-${i}`} 
                  channel={channel} 
                  onClick={onChannelSelect} 
                  onLongPress={onChannelLongPress} 
                  className="group relative cursor-pointer flex flex-col rounded-[16px] overflow-hidden transition-all duration-300"
                >
                   <div className={cn("aspect-video bg-[#1a1c23] relative overflow-hidden flex flex-col p-0 shadow-lg border border-white/5", isMobile ? "rounded-[16px]" : "rounded-[20px]")}>
                      {getDynamicProgram(channel).image ? (
                        <>
                          <img src={getDynamicProgram(channel).image} className="absolute inset-0 w-full h-full object-cover filter brightness-[0.8] group-hover:brightness-100 group-hover:scale-105 transition-all duration-700" alt="" referrerPolicy="no-referrer" />
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#111] via-[#111]/40 to-transparent pointer-events-none" />
                          {channel.logo && (
                            <img src={channel.logo} alt="" className="absolute left-3 bottom-3 md:left-4 md:bottom-4 h-5 md:h-7 max-w-[60%] object-contain filter drop-shadow-xl z-20" referrerPolicy="no-referrer" />
                          )}
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center p-6 md:p-8">
                            {channel.logo ? (
                              <img src={channel.logo} alt="" className="w-full h-full object-contain filter group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl" />
                            ) : (
                              <div className="flex flex-col items-center justify-center opacity-50 group-hover:opacity-80 transition-opacity duration-500">
                                <Tv size={32} className="text-white/30" />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10 z-20">
                        <div className="bg-indigo-500 h-full shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all duration-500" style={{ width: `${getDynamicProgram(channel).progressPercent}%` }} />
                      </div>
                   </div>
                   <div className="pt-3 px-1 space-y-1">
                      <span className={cn("text-white font-bold uppercase truncate tracking-tight transition-colors block leading-none", isMobile ? "text-xs" : "text-sm")}>{channel.name}</span>
                      <span className="text-white/50 text-[10px] md:text-xs truncate block leading-tight">{getDynamicProgram(channel).title}</span>
                   </div>
                </ChannelCardWrapper>
              ))}
           </div>
        </section>
      ) : (
        <>
          {/* REPRENDRE LA LECTURE SECTION */}
          {Object.keys(continueWatching).length > 0 && (
            <section className="space-y-6 px-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#E50914] shadow-lg">
                  <Play size={16} fill="currentColor" className="ml-0.5" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider font-sans leading-none">REPRENDRE LA LECTURE</h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.15em] mt-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />
                    Films et séries en cours
                  </p>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide scroll-smooth scroll-px-4">
                {Object.entries(continueWatching).map(([id, mins]) => {
                  const movie = movies.find(m => m.id === id);
                  if (!movie) return null;
                  
                  return (
                    <motion.div
                      key={`cw-${id}`}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onChannelSelect(movie)}
                      className={cn(
                        "snap-start shrink-0 group relative cursor-pointer flex flex-col rounded-[18px] transition-all duration-500",
                        isMobile ? "w-[160px]" : "w-[240px]"
                      )}
                    >
                      <div className={cn(
                        "bg-[#111] relative overflow-hidden flex items-center justify-center shadow-2xl border border-white/5 rounded-[16px]",
                        isMobile ? "h-[220px]" : "h-[320px]"
                      )}>
                        <img 
                          src={movie.poster || movie.banner} 
                          alt="" 
                          className="h-full w-full object-cover filter brightness-[0.7] group-hover:brightness-100 group-hover:scale-110 transition-all duration-1000" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
                        <div className="absolute inset-x-0 bottom-4 px-3 flex flex-col gap-2 pointer-events-none">
                           <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="bg-[#E50914] h-full shadow-[0_0_12px_rgba(229,9,20,0.8)]" style={{ width: '45%' }} />
                           </div>
                        </div>
                      </div>
                      <div className="pt-3 px-1">
                        <span className="text-white font-black uppercase truncate tracking-tight text-[11px] md:text-[13px] block group-hover:text-[#E50914] transition-colors leading-none">
                          {movie.title}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* HISTORIQUE SECTION */}
          {recentlyWatched.length > 0 && (
            <section className="space-y-6 px-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-indigo-400">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider font-sans leading-none">VUS RÉCEMMENT</h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.15em] mt-1.5 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                     Derniers contenus visionnés
                  </p>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide scroll-smooth scroll-px-4">
                {recentlyWatched.slice(0, 15).map((item, idx) => {
                  const isMovie = 'videoUrl' in item;
                  const channel = !isMovie ? (item as Channel) : null;
                  const movie = isMovie ? (item as Movie) : null;
                  const prog = channel ? getDynamicProgram(channel) : null;
                  
                  return (
                   <ChannelCardWrapper
                      key={`recent-${item.id}-${idx}`}
                      channel={channel || {} as any}
                      onClick={() => onChannelSelect(item)}
                      className={cn(
                        "snap-start shrink-0 group relative cursor-pointer flex flex-col rounded-[18px] transition-all duration-500",
                        isMobile ? "w-[150px]" : "w-[200px]"
                      )}
                    >
                       <div className={cn(
                        "bg-[#111] relative overflow-hidden flex items-center justify-center shadow-xl border border-white/5 rounded-[14px]",
                        isMobile ? "h-24 md:h-28" : "h-32"
                      )}>
                        {isMovie ? (
                          <img src={movie?.banner || movie?.poster} alt="" className="h-full w-full object-cover filter brightness-[0.7] group-hover:brightness-100 group-hover:scale-110 transition-all duration-1000" referrerPolicy="no-referrer" />
                        ) : prog?.image ? (
                          <>
                            <img src={prog.image} className="absolute inset-0 w-full h-full object-cover filter brightness-[0.5] group-hover:brightness-[0.8] group-hover:scale-110 transition-all duration-1000" alt="" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                            {channel?.logo && (
                              <div className="absolute left-3 bottom-3 w-10 h-10 bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10">
                                <img src={channel.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-3">
                             {channel?.logo ? (
                               <img src={channel.logo} alt="" className="h-16 w-16 object-contain filter grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" referrerPolicy="no-referrer" />
                             ) : <Tv size={32} className="text-white/10" />}
                          </div>
                        )}
                        {!isMovie && (
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${prog?.progressPercent}%` }}
                              className="bg-indigo-500 h-full shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all duration-700" 
                            />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-2xl flex items-center justify-center border border-white/20">
                            <Play size={16} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 px-1">
                        <span className="text-white font-black uppercase truncate tracking-tight text-[11px] md:text-[12px] block group-hover:text-indigo-400 transition-colors leading-none">
                          {item.name}
                        </span>
                      </div>
                    </ChannelCardWrapper>
                  );
                })}
              </div>
            </section>
          )}

          {/* DIRECT CHANNELS SECTION */}
          <section className="space-y-6 pt-2">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div className="space-y-1.5 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/5">
                        <Activity size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-black text-white tracking-widest uppercase font-sans leading-none">
                          Chaînes en Direct
                        </h3>
                        {!isMobile && <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.15em] mt-2">
                          Vos programmes préférés en temps réel
                        </p>}
                      </div>
                    </div>
                 </div>

                 {/* ANIMATED MODE TOGGLE SWITCH (Categories vs Grid) */}
                 <div className="flex items-center gap-5">
                   <div className="flex bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 font-black text-[9px] md:text-xs uppercase tracking-wider shadow-inner shrink-0">
                     <button 
                       onClick={() => setViewMode('categories')}
                       className={cn("px-4 py-2 rounded-lg transition-all", viewMode === 'categories' ? "bg-white text-black shadow-lg font-black" : "text-white/40 hover:text-white")}
                     >
                       Catégories
                     </button>
                     <button 
                       onClick={() => setViewMode('grid')}
                       className={cn("px-4 py-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-black shadow-lg font-black" : "text-white/40 hover:text-white")}
                     >
                       Grille
                     </button>
                   </div>
                   
                   <button 
                      onClick={() => onNavigateToSection('channels')} 
                      className={cn("bg-indigo-600/10 hover:bg-indigo-600/20 text-[10px] md:text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-2 font-black uppercase tracking-widest rounded-xl transition-all border border-indigo-500/20 py-2.5 px-4 md:py-3 md:px-5", isMobile ? "hidden" : "flex")}
                   >
                      Toutes <ChevronRight size={16} />
                   </button>
                 </div>
             </div>

             {viewMode === 'categories' ? (
                /* CATEGORIZED ROW VIEW (Netflix / AppleTV Style) */
                <div className="space-y-12">
                  {sortedCategories.map(categoryName => {
                    const categoryChannels = categoriesMap[categoryName] || [];
                    if (categoryChannels.length === 0) return null;
                    const IconComp = getCategoryIcon(categoryName);
                    
                    return (
                      <div key={categoryName} className="space-y-5 px-1">
                        <div className="flex items-center justify-between px-3 md:px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40">
                              <IconComp size={14} />
                            </div>
                            <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-3 font-sans leading-none">
                              {categoryName}
                              <span className="text-[9px] font-black text-white/10 bg-white/[0.02] px-1.5 py-0.5 rounded leading-none border border-white/5">{categoryChannels.length}</span>
                            </h4>
                          </div>
                        </div>

                        {/* Swipe Container */}
                        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 snap-x scrollbar-hide scroll-smooth scroll-px-4 px-3 md:px-5">
                          {categoryChannels.slice(0, 24).map((channel, idx) => {
                            const prog = getDynamicProgram(channel);
                            return (
                              <ChannelCardWrapper
                                key={`cat-card-${categoryName}-${channel.id}-${idx}`}
                                channel={channel}
                                onClick={onChannelSelect}
                                onLongPress={onChannelLongPress}
                                className={cn(
                                  "snap-start shrink-0 group relative cursor-pointer flex flex-col rounded-[18px] transition-all duration-500",
                                  isMobile ? "w-[160px]" : "w-[220px]"
                                )}
                              >
                                <div className={cn(
                                  "bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center shadow-xl border border-white/5",
                                  isMobile ? "rounded-[14px] h-[90px]" : "rounded-[20px] h-[120px]"
                                )}>
                                  {prog.image ? (
                                    <>
                                      <img src={prog.image} className="absolute inset-0 w-full h-full object-cover filter brightness-[0.5] group-hover:brightness-[0.8] group-hover:scale-110 transition-all duration-1000" alt="" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                                      {channel.logo && (
                                        <div className="absolute left-3 bottom-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center filter drop-shadow-2xl z-20">
                                          <img src={channel.logo} alt="" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center p-4">
                                      {channel.logo ? (
                                        <img src={channel.logo} alt="" className="max-h-full max-w-full object-contain filter group-hover:scale-110 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" referrerPolicy="no-referrer" />
                                      ) : <Tv size={32} className="text-white/10" />}
                                    </div>
                                  )}
                                  
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-30 pointer-events-none">
                                     <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center">
                                       <Play size={16} fill="white" className="ml-0.5" />
                                     </div>
                                  </div>

                                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10 z-20 overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${prog.progressPercent}%` }}
                                      className="bg-indigo-500 h-full shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all duration-700" 
                                    />
                                  </div>
                                </div>
                                <div className="pt-3 px-1 space-y-1.5">
                                  <h5 className="text-white font-black uppercase truncate tracking-tight text-[11px] md:text-[12px] block group-hover:text-indigo-400 transition-colors leading-none">
                                    {channel.name}
                                  </h5>
                                  <div className="flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                     <p className="text-white/40 text-[9px] md:text-[10px] truncate font-bold uppercase tracking-wider leading-none">
                                       {prog.title}
                                     </p>
                                  </div>
                                </div>
                              </ChannelCardWrapper>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* RAW FLAT GRID VIEW */
                <div className={cn("grid gap-6 md:gap-8 px-4", isMobile ? "grid-cols-2" : "grid-cols-3 lg:grid-cols-5 xl:grid-cols-6")}>
                   {sortedChannels.slice(0, 24).map((channel, i) => {
                      const prog = getDynamicProgram(channel);
                      return (
                        <ChannelCardWrapper 
                           key={`live-main-${channel.id}-${i}`} 
                           channel={channel} 
                           onClick={onChannelSelect} 
                           onLongPress={onChannelLongPress}
                           className={cn("group relative cursor-pointer flex flex-col rounded-[18px] transition-all duration-500")}
                        >
                           <div className={cn("aspect-video bg-[#0a0a0a] relative overflow-hidden flex flex-col p-0 shadow-lg border border-white/5", isMobile ? "rounded-[14px]" : "rounded-[20px]")}>
                              {prog.image ? (
                                <>
                                  <img src={prog.image} className="absolute inset-0 w-full h-full object-cover filter brightness-[0.5] group-hover:brightness-[0.8] group-hover:scale-110 transition-all duration-1000" alt="" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                                  {channel.logo && (
                                    <div className="absolute left-3 bottom-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center z-20">
                                      <img src={channel.logo} alt="" className="max-h-full max-w-full object-contain filter drop-shadow-2xl" referrerPolicy="no-referrer" />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center p-4">
                                  {channel.logo ? (
                                    <img src={channel.logo} alt="" className="max-h-full max-w-full object-contain filter group-hover:scale-110 transition-all duration-700 opacity-40 group-hover:opacity-100 grayscale group-hover:grayscale-0" referrerPolicy="no-referrer" />
                                  ) : <Tv size={32} className="text-white/10" />}
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-30 pointer-events-none">
                                 <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl">
                                   <Play size={16} fill="white" className="ml-0.5" />
                                 </div>
                              </div>
                              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10 z-20 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${prog.progressPercent}%` }}
                                  className="bg-indigo-500 h-full shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all duration-500" 
                                />
                              </div>
                           </div>
                           <div className="pt-3 px-1 space-y-1.5">
                              <span className={cn("text-white font-black uppercase truncate tracking-tight transition-colors block leading-none group-hover:text-indigo-400", isMobile ? "text-[11px]" : "text-[12px]")}>{channel.name}</span>
                              <div className="flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                 <p className="text-white/40 text-[9px] md:text-[10px] truncate font-bold uppercase tracking-wider leading-none">
                                   {prog.title}
                                 </p>
                              </div>
                           </div>
                        </ChannelCardWrapper>
                      );
                   })}
                 </div>
              )}
           </section>

           {/* MOVIES / CINÉMA VOD SECTION */}
           {movies && movies.length > 0 && (
            <section className="space-y-6 pt-6 mb-12">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
                    <Film size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-black text-white tracking-wider uppercase font-sans leading-none">FILMS & CINÉMA (VOD)</h3>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.15em] mt-2">Blockbusters en haute définition</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => onNavigateToSection('movies')} 
                    className="bg-white/[0.03] hover:bg-white/[0.08] text-[8px] font-black text-white/50 hover:text-white flex items-center gap-1.5 uppercase tracking-widest rounded-full transition-all border border-white/5 py-1.5 px-3"
                   >
                    Catalogue <ChevronRight size={12} />
                   </button>
                </div>
              </div>

              {/* Movies Swiper Carousel */}
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide scroll-smooth scroll-px-4 px-4">
                {movies.slice(0, 15).map((movie, idx) => (
                  <motion.div
                    key={`home-movie-${movie.id}-${idx}`}
                    onClick={() => setSelectedDetailMovie(movie)}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "snap-start shrink-0 relative rounded-[18px] overflow-hidden cursor-pointer shadow-2xl border border-white/5 bg-black group",
                      isMobile ? "w-[150px]" : "w-[200px]"
                    )}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden">
                       <img 
                        src={movie.poster} 
                        alt={movie.title} 
                        className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105 group-hover:brightness-110 brightness-[0.8]" 
                        referrerPolicy="no-referrer" 
                       />
                       <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
                       
                       <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {movie.isNew && (
                            <span className="bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-lg uppercase tracking-widest border border-indigo-400/30">NOUVEAU</span>
                          )}
                          <span className="bg-emerald-600/20 text-emerald-400 text-[6px] font-black px-1 py-0.5 rounded backdrop-blur-md border border-emerald-500/20 shadow-lg uppercase tracking-widest w-fit">{movie.quality}</span>
                       </div>
                    </div>
                    
                    <div className="pt-3 px-1">
                      <h4 className="text-white font-black text-[11px] md:text-[13px] line-clamp-1 group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-none">{movie.title}</h4>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-all">
                        <div className="flex items-center gap-1">
                          <Star size={8} className="text-amber-500 fill-current" />
                          <span className="text-[8px] font-black text-white">{movie.ratingImdb || '8.2'}</span>
                        </div>
                        <span className="text-[7px] font-black text-white uppercase tracking-widest">{movie.year}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Dynamic Detail Modal for Landing Page Movies */}
      <AnimatePresence>
        {selectedDetailMovie && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
              onClick={() => setSelectedDetailMovie(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              className="relative w-full max-w-4xl bg-[#0f0f0f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl z-20 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden"
            >
              <div className="relative h-[240px] sm:h-[365px] w-full">
                <img 
                  src={selectedDetailMovie.banner || selectedDetailMovie.poster} 
                  alt={selectedDetailMovie.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/50 to-black/20" />
                
                <button 
                  onClick={() => setSelectedDetailMovie(null)}
                  className="absolute top-6 right-6 p-2 bg-black/60 hover:bg-neutral-800 text-white rounded-full transition-all border border-white/10 active:scale-95"
                >
                  <X size={20} />
                </button>

                <div className="absolute bottom-0 left-0 p-6 sm:p-10 w-full">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black mb-2">
                    <span className="text-yellow-500 font-extrabold flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded">
                      <Star size={10} className="fill-current text-yellow-500" /> {selectedDetailMovie.ratingImdb || 'N/A'} IMDb
                    </span>
                    <span className="text-white/60 bg-white/5 border border-white/10 px-2 py-1 rounded">{selectedDetailMovie.year}</span>
                    <span className="text-white/60 bg-white/5 border border-white/10 px-2 py-1 rounded">{selectedDetailMovie.duration || 'N/A'}</span>
                    <span className="border border-red-600/30 text-red-500 bg-red-950/20 px-2.5 py-1 rounded tracking-wider uppercase font-black">{selectedDetailMovie.quality}</span>
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-lg uppercase font-sans">{selectedDetailMovie.title}</h2>
                </div>
              </div>

              <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-1.5 font-sans">
                      <BookOpen size={12} /> Synopsis et Résumé
                    </h3>
                    <p className="text-white/70 font-medium text-sm sm:text-base leading-relaxed">{selectedDetailMovie.summary || "Aucun synopsis disponible."}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs font-sans">
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Réalisateur</span>
                      <span className="font-extrabold text-white/80">{selectedDetailMovie.director || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Pays</span>
                      <span className="font-extrabold text-white/80">{selectedDetailMovie.country || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Langue</span>
                      <span className="font-extrabold text-white/80 flex items-center gap-1">
                        <Globe size={11} className="text-white/40" />
                        {selectedDetailMovie.language || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Type</span>
                      <span className="font-black text-indigo-500 uppercase tracking-widest">VOD</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        onChannelSelect(selectedDetailMovie);
                        setSelectedDetailMovie(null);
                      }}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/25 text-xs uppercase tracking-widest flex items-center justify-center gap-2 group"
                    >
                      <Play size={14} fill="currentColor" className="group-hover:scale-120 transition-transform" /> Jouer
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
