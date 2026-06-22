import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
    
    // Priority 1: Scraped Programme-TV data (Live and more accurate for generic names)
    if (epgData?.programmeTv) {
      const ptv = epgData.programmeTv;
      return {
        title: ptv.title,
        type: channel.category || "Divertissement",
        progressPercent: ptv.progress,
        startTimeLabel: ptv.time || "--:--",
        endTimeLabel: "", // Often not provided in simple scrape or needs calculation
        nextShow: "",
        isScraped: true
      };
    }

    // Priority 2: XMLTV Data
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
        isScraped: false
      };
    }

    const hour = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    let title = "Streaming Direct";
    let type = "Généraliste";
    if (channel.category.toLowerCase().includes('sport')) { title = "Compétition Live"; type = "Sport"; }
    else if (channel.category.toLowerCase().includes('ciné')) { title = "Film du moment"; type = "Cinéma"; }
    const elapsedP = (minutes / 60) * 100;
    return {
      title,
      type,
      progressPercent: elapsedP,
      startTimeLabel: `${hour}:00`,
      endTimeLabel: `${hour + 1}:00`,
      nextShow: "Nouveau programme",
      isScraped: false
    };
  };

  const fuzzyMatch = (str: string, query: string) => {
    const s = str.toLowerCase();
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
    if (channel.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    if (channel.category.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    const prog = getDynamicProgram(channel);
    if (prog.title.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    return fuzzyMatch(channel.name, searchQuery);
  }).slice(0, 12);

  const smartRecommended = [...sortedChannels]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 8);

  const sportsChannels = sortedChannels.filter(c => 
    c.category.toLowerCase().includes('sport') || 
    c.name.toLowerCase().includes('sport')
  ).slice(0, 8);

  const upcomingPrograms = sortedChannels.map(c => ({ channel: c, prog: getDynamicProgram(c) }))
    .filter(item => item.prog.progressPercent < 30)
    .slice(0, 6);

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

  const heroProgDetails = heroChannel ? getDynamicProgram(heroChannel) : null;
  const isMobile = deviceType === 'mobile' || deviceType === 'tablet';

  const spotlightMovie = useMemo(() => {
    if (!movies || movies.length === 0) return null;
    // Prefer movies with posters or banner
    const withVisual = movies.filter(m => m.banner || m.poster);
    const pool = withVisual.length > 0 ? withVisual : movies;
    return [...pool].sort((a, b) => {
      const bScore = (b.ratingImdb || 0);
      const aScore = (a.ratingImdb || 0);
      return bScore - aScore;
    })[0];
  }, [movies]);

  const [networkPing, setNetworkPing] = useState(24);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setNetworkPing(Math.floor(Math.random() * 12) + 15);
    }, 8000);
    return () => clearInterval(intervalId);
  }, []);

  const stats = {
    active: channels.filter(c => c.status !== 'offline').length,
    total: channels.length,
    epgSync: true
  };

  // Group channels by category dynamically
  const categoriesMap = sortedChannels.reduce((acc, channel) => {
    const cat = channel.category || 'Généralistes';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(channel);
    return acc;
  }, {} as { [key: string]: Channel[] });

  // Custom priority mapping for high-quality French IPTV presentation
  const getCategoryPriority = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('général') || n.includes('tnt')) return 1;
    if (n.includes('ciné') || n.includes('film') || n.includes('série') || n.includes('cinema')) return 2;
    if (n.includes('sport')) return 3;
    if (n.includes('jeunesse') || n.includes('kid') || n.includes('dessin') || n.includes('anime')) return 4;
    if (n.includes('info') || n.includes('news') || n.includes('actualité')) return 5;
    if (n.includes('doc') || n.includes('découverte') || n.includes('histoire') || n.includes('science')) return 6;
    return 10;
  };

  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
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

  return (
    <div 
      id="home-container"
      tabIndex={0}
      className={cn("relative space-y-8 pb-32 focus:outline-none", isMobile && "pb-36")}
    >
      {/* HEADER SECTION */}
      <header className="flex items-center justify-between bg-transparent py-4 px-4 lg:px-8">
        <div className="flex items-center gap-6">
          <DendenLogo variant="compact" size={32} />
        </div>

        <div className="flex items-center gap-4">
           {deviceType !== 'mobile' && (
             <div className="flex items-center gap-4 px-5 py-2 bg-white/[0.03] border border-white/5 rounded-full text-[11px] font-black uppercase tracking-wider text-white/50">
                <div className="flex items-center gap-2">
                  <Tv size={14} className="text-white/70" />
                  <span>{channels.length} Chaînes En Direct</span>
                </div>
                <div className="h-3 w-[1px] bg-white/10" />
                <div className="flex items-center gap-2">
                  <Film size={14} className="text-white/70" />
                  <span>{movies.length} Films VOD</span>
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

      {/* TABS FOR HERO SWITCHER */}
      {searchQuery.trim() === '' && spotlightMovie && heroChannel && (
        <div className="flex bg-white/[0.02] p-1 rounded-2xl border border-white/5 w-fit ml-1 text-[10px] font-black uppercase tracking-wider shadow-inner shrink-0 scale-95 origin-left">
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
        <section className="px-1">
          {heroType === 'channel' && heroChannel && heroProgDetails ? (
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#1a0f0f] p-5 lg:p-8 shadow-2xl">
              {/* Background ambiance glow */}
              <div className="absolute right-0 -top-20 w-1/3 h-1/2 bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />
              <div className="absolute -left-20 -bottom-20 w-1/3 h-1/2 bg-emerald-600/10 blur-[100px] pointer-events-none rounded-full" />
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-4 max-w-2xl flex-1">
                  {/* Hero Badge */}
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-white/40">
                    <Sparkles size={10} className="text-indigo-400" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] font-sans">À la une : Direct maintenant</span>
                  </div>
                  
                  {/* Channel Title & Logo block */}
                  <div className="flex gap-4 md:gap-5 items-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-black/60 border border-white/10 rounded-2xl p-2.5 flex items-center justify-center shadow-inner shrink-0">
                      <img src={heroChannel.logo || undefined} alt="" className="max-h-full max-w-full object-contain filter drop-shadow-2xl" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase font-sans">
                        {heroChannel.name}
                      </h2>
                      <p className="text-white/40 text-[9px] uppercase font-black tracking-widest mt-1 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        {heroChannel.category || "Généraliste"}
                      </p>
                    </div>
                  </div>

                  {/* EPG Program details */}
                  <div className="space-y-2 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                    <h3 className="text-white text-lg md:text-xl font-black leading-tight tracking-tight">
                      {heroProgDetails.title}
                    </h3>
                    <div className="flex items-center gap-2.5 text-white/40 text-[10px] font-bold">
                      <Clock size={12} className="text-indigo-400" />
                      <span>{heroProgDetails.startTimeLabel}</span>
                      {heroProgDetails.nextShow && (
                        <>
                          <span className="text-white/10">|</span>
                          <span className="truncate">Suivant : <span className="text-white/60">{heroProgDetails.nextShow}</span></span>
                        </>
                      )}
                    </div>
                    
                    {/* Progress Line */}
                    <div className="pt-1.5">
                       <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(79,70,229,0.5)]" style={{ width: `${heroProgDetails.progressPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button Column */}
                <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => onChannelSelect(heroChannel)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white text-black hover:bg-neutral-200 active:scale-95 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl group"
                  >
                    <Play size={16} fill="currentColor" className="group-hover:scale-110 transition-transform" /> Regarder
                  </button>
                  <button 
                    onClick={() => onNavigateToSection('guide')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white/5 hover:bg-white/10 active:scale-95 text-white/80 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-white/10"
                  >
                    <Calendar size={16} /> Guide TV
                  </button>
                </div>
              </div>
            </div>
          ) : heroType === 'movie' && spotlightMovie ? (
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#070707] min-h-[300px] shadow-2xl flex items-center">
              {/* Dynamic decorative backdrop */}
              <div 
                className="absolute inset-x-0 top-0 bottom-0 right-0 w-full md:w-2/3 bg-cover bg-center opacity-30 md:opacity-45 transition-all duration-1000 scale-100 pointer-events-none"
                style={{ 
                  backgroundImage: `url(${spotlightMovie.banner || spotlightMovie.poster})`,
                  maskImage: 'linear-gradient(to left, black 30%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%, black 10%, transparent 100%)'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070707] via-[#070707]/90 to-transparent pointer-events-none" />
              
              <div className="relative w-full z-10 p-5 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-3 max-w-2xl">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500">
                    <Star size={10} className="fill-current text-amber-500" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">{spotlightMovie.ratingImdb || '8.8'} Score IMDb</span>
                  </div>
                  
                  {/* Title block */}
                  <div className="space-y-0.5">
                    <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter leading-none uppercase">{spotlightMovie.title}</h2>
                    {spotlightMovie.originalTitle && (
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Titre original : {spotlightMovie.originalTitle}</p>
                    )}
                  </div>

                  {/* Summary */}
                  <p className="text-white/60 text-xs line-clamp-2 leading-relaxed max-w-xl font-medium">
                    {spotlightMovie.summary || "Découvrez notre sélection spéciale VOD. Lancez la lecture instantanée en haute définition (4K / UHD) ou visionnez la bande annonce complète."}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-black text-white/40 uppercase tracking-wider">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-extrabold">{spotlightMovie.quality}</span>
                    <span>•</span>
                    <span>{spotlightMovie.year}</span>
                    <span>•</span>
                    <span>{spotlightMovie.duration}</span>
                    <span>•</span>
                    <span className="text-red-500 font-extrabold">{spotlightMovie.genres ? spotlightMovie.genres.slice(0, 2).join(', ') : 'Cinéma'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => onChannelSelect(spotlightMovie)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_30px_rgba(79,70,229,0.2)] border border-indigo-500/10 group"
                  >
                    <Play size={16} fill="currentColor" className="group-hover:scale-125 transition-transform" /> Regarder
                  </button>
                  <button 
                    onClick={() => setSelectedDetailMovie(spotlightMovie)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white/5 hover:bg-white/10 active:scale-95 text-white/85 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-white/5"
                  >
                    <Info size={16} /> Détails
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {searchQuery.trim() !== '' ? (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between px-2">
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
                  className="group relative bg-[#111] rounded-[32px] p-5 border border-white/5 cursor-pointer"
                >
                   <div className="aspect-video bg-black/40 rounded-[24px] flex items-center justify-center p-6 mb-4 border border-white/5">
                      <img src={channel.logo || undefined} alt="" className="max-h-full max-w-full object-contain" />
                   </div>
                   <span className="text-white text-xs font-black uppercase truncate block tracking-tight">{channel.name}</span>
                   <span className="text-indigo-500 text-[9px] font-black uppercase truncate block mt-1.5 opacity-60 tracking-widest">{getDynamicProgram(channel).title}</span>
                </ChannelCardWrapper>
              ))}
           </div>
        </section>
      ) : (
        <>
          {/* REPRENDRE LA LECTURE SECTION */}
          {Object.keys(continueWatching).length > 0 && (
            <section className="space-y-4 px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-lg shadow-indigo-500/5">
                  <Play size={14} fill="currentColor" className="ml-0.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans leading-none">REPRENDRE LA LECTURE</h3>
                  <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] mt-1">Vos films en cours</p>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-6 pt-1 snap-x scrollbar-hide">
                {Object.entries(continueWatching).map(([id, mins]) => {
                  const movie = movies.find(m => m.id === id);
                  if (!movie) return null;
                  
                  return (
                    <motion.div
                      key={`cw-${id}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onChannelSelect(movie)}
                      className={cn(
                        "snap-start shrink-0 group relative cursor-pointer flex flex-col rounded-[16px] overflow-hidden transition-all duration-300",
                        isMobile ? "w-[140px]" : "w-[220px]"
                      )}
                    >
                      <div className={cn(
                        "bg-[#111]/80 relative overflow-hidden flex items-center justify-center shadow-lg border border-white/10 rounded-[16px]",
                        isMobile ? "h-24" : "h-32"
                      )}>
                        <img 
                          src={movie.banner || movie.poster} 
                          alt="" 
                          className="h-full w-full object-cover filter brightness-75 group-hover:scale-110 transition-all duration-700" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-red-650 group-hover:border-red-650 transition-all">
                            <Play size={18} className="text-white fill-current ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                          <div className="bg-red-650 h-full w-[40%] transition-all duration-500 shadow-lg" />
                        </div>
                      </div>
                      <div className="pt-3 px-1 space-y-0.5">
                        <span className="text-white font-black uppercase truncate tracking-tight text-[11px] md:text-[13px] block group-hover:text-red-500 transition-colors">
                          {movie.title}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-60">
                           <Clock size={9} className="text-red-500" />
                           <span className="text-white text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-none">
                             En cours de visionnage
                           </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* RÈCENTS CAROUSEL S'IL SONT DISPONIBLES */}
          {recentlyWatched.length > 0 && (
            <section className="space-y-4 px-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/5">
                    <History size={14} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans leading-none">HISTORIQUE</h3>
                    <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] mt-1">Vos dernières sessions</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-6 pt-1 snap-x scrollbar-hide">
                {recentlyWatched.slice(0, 15).map((item, idx) => {
                  const isMovie = 'videoUrl' in item;
                  const channel = !isMovie ? (item as Channel) : null;
                  const movie = isMovie ? (item as Movie) : null;
                  const prog = channel ? getDynamicProgram(channel) : null;
                  
                  return (
                    <motion.div
                      key={`recent-${item.id}-${idx}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onChannelSelect(item)}
                      className={cn(
                        "snap-start shrink-0 group relative cursor-pointer flex flex-col rounded-[16px] overflow-hidden transition-all duration-300",
                        isMobile ? "w-[140px]" : "w-[220px]"
                      )}
                    >
                       <div className={cn(
                        "bg-[#111]/80 relative overflow-hidden flex items-center justify-center p-5 shadow-lg border border-white/10 rounded-[16px]",
                        isMobile ? "h-24" : "h-32"
                      )}>
                        <img 
                          src={isMovie ? movie?.poster : channel?.logo || undefined} 
                          alt="" 
                          className={cn("h-full w-full filter group-hover:scale-110 transition-all duration-700 drop-shadow-2xl", isMovie ? "object-cover" : "object-contain")} 
                          referrerPolicy="no-referrer" 
                        />
                        {!isMovie && (
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5">
                            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${prog?.progressPercent}%` }} />
                          </div>
                        )}
                        {isMovie && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play size={24} className="text-white fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="pt-3 px-1 space-y-0.5">
                        <span className="text-white font-black uppercase truncate tracking-tight text-[11px] md:text-[13px] block group-hover:text-purple-400 transition-colors">
                          {isMovie ? movie?.title : channel?.name}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-60">
                           <div className={cn("w-1.5 h-1.5 rounded-full", isMovie ? "bg-red-500" : "bg-purple-500")} />
                           <span className="text-white text-[8px] md:text-[9px] font-black uppercase truncate tracking-widest leading-none">
                             {isMovie ? "CINÉMA / VOD" : prog?.title}
                           </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* CHAÎNES EN DIRECT SECTION COHÉRENTE */}
          <section className="space-y-4 md:space-y-6">
             <div className="flex items-center justify-between px-1 md:px-3">
                <div className="flex items-center gap-3 md:gap-5">
                   <div className="w-10 h-10 md:w-12 md:h-12 bg-red-650/10 border border-red-650/20 rounded-xl md:rounded-[18px] flex items-center justify-center text-red-650 shadow-lg shadow-red-600/5"><Pulse size={isMobile ? 20 : 24} /></div>
                   <div>
                     <h3 className="text-lg md:text-xl font-black text-white tracking-tight uppercase font-sans">TV EN DIRECT</h3>
                     {!isMobile && <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">Vos flux nationaux & internationaux</p>}
                   </div>
                </div>

                {/* ANIMATED MODE TOGGLE SWITCH (Categories vs Grid) */}
                <div className="flex items-center gap-4">
                  <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/5 font-black text-[9px] md:text-[10px] uppercase tracking-wider shadow-inner shrink-0">
                    <button 
                      onClick={() => setViewMode('categories')}
                      className={cn("px-3 py-1.5 rounded-lg transition-all", viewMode === 'categories' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 font-black" : "text-white/40 hover:text-white")}
                    >
                      Catégories
                    </button>
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn("px-3 py-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 font-black" : "text-white/40 hover:text-white")}
                    >
                      Grille
                    </button>
                  </div>
                  
                  <button 
                     onClick={() => onNavigateToSection('channels')} 
                     className={cn("bg-white/[0.03] hover:bg-white/[0.08] text-[9px] md:text-[10px] text-white/50 hover:text-white flex items-center gap-2 font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5 py-2 px-3 md:py-2.5 md:px-4", isMobile ? "hidden" : "flex")}
                  >
                     Toutes <ChevronRight size={14} />
                  </button>
                </div>
             </div>

             {viewMode === 'categories' ? (
                /* CATEGORIZED ROW VIEW (Netflix / AppleTV Style) */
                <div className="space-y-8">
                  {sortedCategories.map(categoryName => {
                    const categoryChannels = categoriesMap[categoryName] || [];
                    if (categoryChannels.length === 0) return null;
                    const IconComp = getCategoryIcon(categoryName);
                    
                    return (
                      <div key={categoryName} className="space-y-3 px-1">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-indigo-500 shrink-0">
                            <IconComp size={14} />
                          </div>
                          <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            {categoryName}
                            <span className="text-[10px] font-mono text-white/20">({categoryChannels.length})</span></h4>
                        </div>

                {/* Swipe Container */}
                        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {categoryChannels.slice(0, 24).map((channel, idx) => {
                            const prog = getDynamicProgram(channel);
                            return (
                              <ChannelCardWrapper
                                key={`cat-card-${categoryName}-${channel.id}-${idx}`}
                                channel={channel}
                                onClick={onChannelSelect}
                                onLongPress={onChannelLongPress}
                                className={cn(
                                  "snap-start shrink-0 group relative cursor-pointer flex flex-col rounded-[16px] overflow-hidden transition-all duration-300",
                                  isMobile ? "w-[140px]" : "w-[220px]"
                                )}
                              >
                                <div className={cn(
                                  "bg-[#111]/80 relative overflow-hidden flex items-center justify-center p-5 shadow-lg border border-white/10 rounded-[16px]",
                                  isMobile ? "h-24" : "h-32"
                                )}>
                                  <img 
                                    src={channel.logo || undefined} 
                                    alt="" 
                                    className="h-full w-full object-contain filter group-hover:scale-110 transition-all duration-700" 
                                    referrerPolicy="no-referrer" 
                                  />
                                  
                                  <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />
                                  
                                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5">
                                    <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${prog.progressPercent}%` }} />
                                  </div>
                                  {!isMobile && (
                                    <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                                      <div className="bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest shadow-lg">
                                        LIVE
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="pt-3 px-1 space-y-0.5">
                                  <h5 className="text-white font-black uppercase truncate tracking-tight text-[11px] md:text-[13px] block transition-colors leading-none group-hover:text-indigo-500">
                                    {channel.name}
                                  </h5>
                                  <p className="text-white/50 text-[9px] font-bold truncate block leading-tight pt-0.5 group-hover:text-white/70 transition-colors">
                                    {prog.title}
                                  </p>
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
                <div className={cn("grid gap-4 md:gap-6", isMobile ? "grid-cols-2 px-1" : "grid-cols-3 lg:grid-cols-5 xl:grid-cols-6")}>
                   {sortedChannels.slice(0, 24).map((channel, i) => {
                      const prog = getDynamicProgram(channel);
                      return (
                        <ChannelCardWrapper 
                           key={`live-main-${channel.id}-${i}`} 
                           channel={channel} 
                           onClick={onChannelSelect} 
                           onLongPress={onChannelLongPress}
                           className={cn("group relative cursor-pointer flex flex-col rounded-[16px] overflow-hidden transition-all duration-300")}
                        >
                           <div className={cn("aspect-video bg-[#111]/80 border border-white/10 relative overflow-hidden flex items-center justify-center p-3 sm:p-5 shadow-lg", isMobile ? "rounded-[16px]" : "rounded-[16px]")}>
                              <img src={channel.logo || undefined} alt="" className="h-full w-full object-contain filter group-hover:scale-110 transition-all duration-500" referrerPolicy="no-referrer" />
                              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5"><div className="bg-red-650 h-full" style={{ width: `${prog.progressPercent}%` }} /></div>
                           </div>
                           <div className="pt-2.5 px-1 space-y-0.5 mt-auto">
                              <span className={cn("text-white font-black uppercase truncate tracking-tight transition-colors group-hover:text-red-500 block leading-none", isMobile ? "text-[10px]" : "text-[12px]")}>{channel.name}</span>
                              <span className="text-white/50 text-[9px] font-bold uppercase truncate block leading-tight pt-0.5">{prog.title}</span>
                           </div>
                        </ChannelCardWrapper>
                      );
                   })}
                 </div>
             )}
          </section>

          {/* MOVIES / CINÉMA VOD SECTION */}
          {movies && movies.length > 0 && (
            <section className="space-y-6 pt-6">
              <div className="flex items-center justify-between px-1 md:px-3">
                <div className="flex items-center gap-3 md:gap-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl md:rounded-[18px] flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
                    <Film size={isMobile ? 20 : 24} />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase font-sans">FILMS & CINÉMA (VOD)</h3>
                    {!isMobile && <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">Vos blockbusters en ultra haute définition</p>}
                  </div>
                </div>

                <button 
                  onClick={() => onNavigateToSection('movies')} 
                  className="bg-white/[0.03] hover:bg-white/[0.08] text-[9px] md:text-[10px] text-white/50 hover:text-white flex items-center gap-2 font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5 py-2 px-3 md:py-2.5 md:px-4"
                >
                  Tout le Catalogue <ChevronRight size={14} />
                </button>
              </div>

              {/* Movies Swiper Carousel */}
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {movies.slice(0, 15).map((movie, idx) => (
                  <motion.div
                    key={`home-movie-${movie.id}-${idx}`}
                    onClick={() => setSelectedDetailMovie(movie)}
                    whileHover={{ y: -6, scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className={cn(
                      "snap-start shrink-0 relative rounded-[18px] overflow-hidden cursor-pointer shadow-2xl border border-white/5 bg-neutral-900 group",
                      isMobile ? "w-[110px] aspect-[2/3]" : "w-[165px] aspect-[2/3]"
                    )}
                  >
                    <img 
                      src={movie.poster} 
                      alt={movie.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      referrerPolicy="no-referrer" 
                    />
                    
                    {/* Dark gradient overlap */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-2.5 flex flex-col justify-end">
                      <div className="flex items-center justify-between gap-1 text-[7px] mb-1 opacity-90 font-black">
                        <span className="bg-indigo-600 text-white px-1 py-0.5 rounded uppercase tracking-wider text-[6px]">{movie.quality}</span>
                        <span className="text-white/40">{movie.year}</span>
                      </div>
                      <h4 className="text-white font-black text-[10px] sm:text-[11px] line-clamp-1 group-hover:text-indigo-500 transition-colors uppercase tracking-tight leading-none mb-1">{movie.title}</h4>
                      
                      <div className="flex items-center justify-between mt-0.5 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-0.5">
                          <Star size={8} className="text-amber-500 fill-current" />
                          <span className="text-[8px] font-black text-white/70">{movie.ratingImdb || '8.2'}</span>
                        </div>
                        {movie.duration && (
                          <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">{movie.duration}</span>
                        )}
                      </div>
                    </div>
                    {movie.isNew && (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border border-indigo-500/20 shadow-lg">
                        NEW
                      </div>
                    )}
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
              {/* Backdrop poster banner style */}
              <div className="relative h-[240px] sm:h-[365px] w-full">
                <img 
                  src={selectedDetailMovie.banner || selectedDetailMovie.poster} 
                  alt={selectedDetailMovie.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/50 to-black/20" />
                
                {/* Close Button */}
                <button 
                  onClick={() => setSelectedDetailMovie(null)}
                  className="absolute top-6 right-6 p-2 bg-black/60 hover:bg-red-650 text-white rounded-full transition-all border border-white/10 hover:border-transparent active:scale-95"
                >
                  <X size={20} />
                </button>

                {/* Overlaid Title and Quick Scores */}
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
                  {selectedDetailMovie.originalTitle && (
                    <p className="text-white/40 text-xs sm:text-sm font-bold uppercase tracking-wider mt-1">Titre original : {selectedDetailMovie.originalTitle}</p>
                  )}
                </div>
              </div>

              {/* Technical block and plot summary */}
              <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase text-red-500 tracking-[0.2em] flex items-center gap-1.5 font-sans">
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
                      <span className="text-white/30 font-black block uppercase mb-1">Pays d'origine</span>
                      <span className="font-extrabold text-white/80">{selectedDetailMovie.country || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Langue VOD</span>
                      <span className="font-extrabold text-white/80 flex items-center gap-1">
                        <Globe size={11} className="text-white/40" />
                        {selectedDetailMovie.language || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Type de média</span>
                      <span className="font-black text-red-500/90 uppercase tracking-widest">CINÉMA VOD</span>
                    </div>
                  </div>

                  {selectedDetailMovie.actors && selectedDetailMovie.actors.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase text-white/40 tracking-[0.2em] flex items-center gap-1.5 font-sans">
                        <Users size={12} /> Distribution / Casting
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedDetailMovie.actors.map((actor, idx) => (
                          <span key={idx} className="bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/80 select-none transition-all">
                            {actor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Play & Trailer links */}
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        onChannelSelect(selectedDetailMovie);
                        setSelectedDetailMovie(null);
                      }}
                      className="w-full py-4 bg-red-650 hover:bg-red-700 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-600/25 text-xs uppercase tracking-widest flex items-center justify-center gap-2 group"
                    >
                      <Play size={14} fill="currentColor" className="group-hover:scale-120 transition-transform" /> Jouer le film
                    </button>

                    {selectedDetailMovie.trailerUrl && (
                      <button 
                        onClick={() => {
                          try {
                            window.open(selectedDetailMovie.trailerUrl, '_blank');
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Film size={14} /> Voir le Trailer
                      </button>
                    )}
                  </div>

                  {/* Associated genres list */}
                  {selectedDetailMovie.genres && selectedDetailMovie.genres.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                      <h4 className="text-[9px] uppercase font-black tracking-[0.2em] text-white/20">Genres et Catégories</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDetailMovie.genres.map((genre) => (
                          <span key={genre} className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
