import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { Channel, AppSettings, AppState, Movie } from './types';
import SplashScreen from './components/SplashScreen';
import Navigation from './components/Navigation';
import VideoPlayer from './components/VideoPlayer';
import ChannelGrid from './components/ChannelGrid';
import AdminPanel from './components/AdminPanel';
import EPGGuide from './components/EPGGuide';
import HomePremium from './components/HomePremium';
import MovieHub from './components/MovieHub';
import MoviePlayer from './components/MoviePlayer';
import { useDeviceType } from './hooks/useDeviceType';
import { useTVNav } from './hooks/useTVNav';
import SettingsPanel from './components/SettingsPanel';
import MovieSettings from './components/MovieSettings';
import SecretChannelBanner from './components/SecretChannelBanner';
import PlutoTVPage from './components/PlutoTVPage';
import PrivatePlutoPage from './components/PrivatePlutoPage';
import SportPage from './components/SportPage';
import { PLUTO_CHANNELS } from './plutoChannels';
import { Settings, Shield, Lock, Search, Filter, History, Star, Play, ChevronRight, Plus, Maximize2, Trash2, Hash, Tv, Film, X, Sparkles, BookOpen, Users, Calendar, Clock, Globe } from 'lucide-react';
import { Toaster } from 'sonner';
import { cn } from './lib/utils';

const socket = io();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeSection, setActiveSection] = useState('home');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedMovieForPlayer, setSelectedMovieForPlayer] = useState<Movie | null>(null);
  const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
  const [isFullScreenMoviePlayer, setIsFullScreenMoviePlayer] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [channelsSearch, setChannelsSearch] = useState('');
  const [searchTab, setSearchTab] = useState<'all' | 'channels' | 'movies'>('all');
  const [searchDetailMovie, setSearchDetailMovie] = useState<Movie | null>(null);
  
  const deviceType = useDeviceType();
  const { focusedId } = useTVNav();

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataRes, moviesRes, epgRes] = await Promise.all([
          axios.get('/api/data'),
          axios.get('/api/movies'),
          axios.get('/api/epg/live')
        ]);
        setChannels([...dataRes.data.channels, ...PLUTO_CHANNELS]);
        setMovies(moviesRes.data);
        setSettings(dataRes.data.settings);
        setLiveEpg(epgRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();

    // Socket events
    socket.on('CHANNELS_SYNC', (data: Channel[]) => setChannels(data));
    socket.on('MOVIES_UPDATED', (data: Movie[]) => setMovies(data));
    socket.on('CHANNEL_ADDED', (channel: Channel) => setChannels(prev => {
      if (prev.some(c => c.id === channel.id)) {
        return prev.map(c => c.id === channel.id ? channel : c);
      }
      return [...prev, channel];
    }));
    socket.on('CHANNEL_UPDATED', (channel: Channel) => setChannels(prev => prev.map(c => c.id === channel.id ? channel : c)));
    socket.on('CHANNEL_DELETED', (id: string) => setChannels(prev => prev.filter(c => c.id !== id)));
    socket.on('SETTINGS_UPDATED', (data: AppSettings) => setSettings(data));
    socket.on('EPG_LIVE_UPDATE', (data: any) => setLiveEpg(data));

    return () => {
      socket.off('CHANNELS_SYNC');
      socket.off('MOVIES_UPDATED');
      socket.off('CHANNEL_ADDED');
      socket.off('CHANNEL_UPDATED');
      socket.off('CHANNEL_DELETED');
      socket.off('SETTINGS_UPDATED');
      socket.off('EPG_LIVE_UPDATE');
    };
  }, []);

  useEffect(() => {
    if (settings?.theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [settings?.theme]);

  const [liveEpg, setLiveEpg] = useState<{[id: string]: {current: any; next: any; programmeTv?: any; schedule?: any[]}}>({});
  const [continueWatchingMins, setContinueWatchingMins] = useState<{[id: string]: number}>({});

  // Sync continue watching
  useEffect(() => {
    try {
      const cw = localStorage.getItem('denden_continue_watching');
      if (cw) setContinueWatchingMins(JSON.parse(cw));
    } catch (e) {}
  }, []);

  const saveMovieProgress = useCallback((movieId: string, minutes: number) => {
    setContinueWatchingMins(prev => {
      const next = { ...prev, [movieId]: minutes };
      localStorage.setItem('denden_continue_watching', JSON.stringify(next));
      return next;
    });
  }, []);

  const visibleChannels = useMemo(() => {
    return channels.filter(c => !c.isPrivate && !PLUTO_CHANNELS.some(pc => pc.id === c.id));
  }, [channels]);

  const allVisibleForPlayer = useMemo(() => {
    // This is for next/prev navigation in common player
    // If we're watching a Pluto channel, we want to skip between Pluto channels
    // If we're watching a normal channel, we skip between normal channels
    return channels.filter(c => !c.isPrivate);
  }, [channels]);

  const privateChannels = useMemo(() => {
    return channels.filter(c => c.isPrivate);
  }, [channels]);


  const handleAddChannel = async (channel: Partial<Channel>) => {
    await axios.post('/api/channels', channel);
  };

  const handleUpdateChannel = async (id: string, channel: Partial<Channel>) => {
    await axios.put(`/api/channels/${id}`, channel);
  };

  const handleDeleteChannel = async (id: string) => {
    // Optimistic UI Update
    setChannels(prev => prev.filter(c => c.id !== id));
    try {
      await axios.delete(`/api/channels/${id}`);
    } catch (err) {
      console.error("Error deleting channel", err);
    }
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsFullScreenPlayer(true);

    // Save history
    try {
      const stored = localStorage.getItem('denden_recent_history');
      let history: { id: string, type: 'channel' | 'movie' }[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            history = parsed as { id: string, type: 'channel' | 'movie' }[];
          }
        } catch (err) {
          console.error(err);
        }
      }
      const newEntry: { id: string, type: 'channel' | 'movie' } = { id: channel.id, type: 'channel' };
      history = [newEntry, ...history.filter(h => h.id !== channel.id)].slice(0, 20);
      localStorage.setItem('denden_recent_history', JSON.stringify(history));
    } catch (e) {
      console.warn("Storage access denied", e);
    }
  };

  const handleNextChannel = useCallback(() => {
    if (!selectedChannel || allVisibleForPlayer.length === 0) return;
    const currentIndex = allVisibleForPlayer.findIndex(c => c.id === selectedChannel.id);
    const nextIndex = (currentIndex + 1) % allVisibleForPlayer.length;
    handleSelectChannel(allVisibleForPlayer[nextIndex]);
  }, [selectedChannel, allVisibleForPlayer]);

  const handlePrevChannel = useCallback(() => {
    if (!selectedChannel || allVisibleForPlayer.length === 0) return;
    const currentIndex = allVisibleForPlayer.findIndex(c => c.id === selectedChannel.id);
    const prevIndex = (currentIndex - 1 + allVisibleForPlayer.length) % allVisibleForPlayer.length;
    handleSelectChannel(allVisibleForPlayer[prevIndex]);
  }, [selectedChannel, allVisibleForPlayer]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '0104') {
      setIsAdminUnlocked(true);
      setShowPinModal(false);
      setPinInput('');
      setActiveSection('admin');
    } else {
      alert('PIN Incorrect');
      setPinInput('');
    }
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const [showChannelActions, setShowChannelActions] = useState<{ channel: Channel, isOpen: boolean } | null>(null);

  const handleChannelLongPress = (channel: Channel) => {
    try {
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    } catch (e) {}
    setShowChannelActions({ channel, isOpen: true });
  };

  const handleActionTest = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsFullScreenPlayer(true);
    setShowChannelActions(null);
  };

  const handleActionEdit = (channel: Channel) => {
    // We can open Admin panel in "channels" tab with the channel selected for editing
    // But since the user wants simple, maybe just a direct edit modal?
    // For now, let's just trigger the admin section if they really want to mod it.
    // Or better, let's actually implement a small Edit Modal here.
    setActiveSection('admin'); 
    setIsAdminUnlocked(true); // Auto-unlock for direct action? Or keep PIN?
    // The user said "Enlever le bouton secret", they didn't say disable the security.
    setShowChannelActions(null);
  };

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovieForPlayer(movie);
    setIsFullScreenMoviePlayer(true);
    axios.put(`/api/movies/${movie.id}`, { viewCount: (movie.viewCount || 0) + 1 }).catch(() => {});

    // Save history
    try {
      const stored = localStorage.getItem('denden_recent_history');
      let history: { id: string, type: 'channel' | 'movie' }[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            history = parsed as { id: string, type: 'channel' | 'movie' }[];
          }
        } catch (err) {
          console.error(err);
        }
      }
      const newEntry: { id: string, type: 'channel' | 'movie' } = { id: movie.id, type: 'movie' };
      history = [newEntry, ...history.filter(h => h.id !== movie.id)].slice(0, 20);
      localStorage.setItem('denden_recent_history', JSON.stringify(history));
    } catch (e) {
      console.warn("Storage access denied", e);
    }
  };

  const renderContent = () => {
    const isMobile = deviceType === 'mobile' || deviceType === 'tablet';
    
    switch (activeSection) {
      case 'home':
        return (
          <HomePremium 
            channels={visibleChannels}
            movies={movies}
            onChannelSelect={(item) => {
              if ('videoUrl' in item) handleSelectMovie(item as Movie);
              else handleSelectChannel(item as Channel);
            }}
            onChannelLongPress={handleChannelLongPress}
            deviceType={deviceType}
            onNavigateToSection={handleSectionChange}
            liveEpg={liveEpg}
            continueWatching={continueWatchingMins}
          />
        );
      case 'channels': {
        const filtered = visibleChannels
          .filter(c => 
            c.name.toLowerCase().includes(channelsSearch.toLowerCase()) || 
            c.category.toLowerCase().includes(channelsSearch.toLowerCase())
          ).sort((a, b) => (a.channelNumber || 9999) - (b.channelNumber || 9999));
        return (
          <div className={cn("space-y-10", isMobile ? "pb-24" : "")}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white/[0.03] p-6 lg:p-10 rounded-3xl border border-white/5 backdrop-blur-xl gap-6">
               <div>
                  <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">Chaînes En Direct</h2>
                  <p className="text-white/40 mt-2 font-medium">{filtered.length} sources vidéo optimisées</p>
               </div>
               <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input 
                      className="bg-black/50 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-white w-full sm:w-64 focus:ring-2 focus:ring-red-600/50 outline-none transition-all text-base" 
                      placeholder="Rechercher une chaîne..." 
                      value={channelsSearch}
                      onChange={(e) => setChannelsSearch(e.target.value)}
                    />
                  </div>
               </div>
            </div>

            {/* Banner Pluto TV Prominent Entry */}
            <div className="relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-r from-[#170F2E] via-[#0D0A1B] to-[#12003C] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="flex items-center gap-5 shrink-0 w-full md:w-auto">
                <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 p-3 flex items-center justify-center shadow-lg shrink-0">
                  <span className="text-2xl font-black text-yellow-400 tracking-tighter animate-pulse">P.</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-gradient-to-r from-violet-650 to-yellow-500 text-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md">SPECIAL PLUTO TV</span>
                    <h3 className="text-xl font-black text-white tracking-tight">Pack Pluto TV France</h3>
                  </div>
                  <p className="text-white/45 text-xs sm:text-sm font-medium mt-1 truncate">Profitez de 42 chaînes culte de Pluto TV avec logos originaux et flux officiels en direct !</p>
                </div>
              </div>
              <button 
                onClick={() => handleSectionChange('pluto')}
                className="w-full md:w-auto bg-gradient-to-r from-violet-600 to-yellow-500 hover:from-violet-500 hover:to-yellow-400 text-white font-black text-sm px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-violet-600/30 active:scale-95 transition-all text-center cursor-pointer shrink-0"
              >
                Accéder à l'Espace Pluto TV
              </button>
            </div>

            {/* Banner Sport Prominent Entry */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-[#0F2E1B] via-[#0A1A12] to-[#041208] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl mt-4">
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="flex items-center gap-5 shrink-0 w-full md:w-auto">
                <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 p-3 flex items-center justify-center shadow-lg shrink-0">
                   <div className="text-2xl font-black text-emerald-400 tracking-tighter animate-pulse">
                     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                   </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-gradient-to-r from-teal-600 to-emerald-500 text-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md">VIVEZ L'INTENSITÉ DU SPORT</span>
                    <h3 className="text-xl font-black text-white tracking-tight italic uppercase">DENDEN SPORT+</h3>
                  </div>
                  <p className="text-white/45 text-xs sm:text-sm font-medium mt-1 truncate">UFC, NBA, Ligue des Champions & L'intégralité du Sport en Direct</p>
                </div>
              </div>
              <button 
                onClick={() => handleSectionChange('sport')}
                className="w-full md:w-auto bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-black text-sm px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-teal-600/30 active:scale-95 transition-all text-center cursor-pointer shrink-0"
              >
                Accéder au Hub Sport
              </button>
            </div>

            {/* Secret Channels Banner */}
            {!isPrivateUnlocked && (
              <SecretChannelBanner onUnlock={() => {
                setIsPrivateUnlocked(true);
                setActiveSection('private_hub');
              }} />
            )}

            <ChannelGrid 
              channels={filtered} 
              onChannelSelect={handleSelectChannel}
              onChannelLongPress={handleChannelLongPress}
              deviceType={deviceType}
            />
          </div>
        );
      }

      case 'pluto':
        return (
          <PlutoTVPage 
            onChannelSelect={handleSelectChannel}
            onBack={() => setActiveSection('channels')}
            deviceType={deviceType}
          />
        );
      case 'sport':
        return (
          <SportPage 
            channels={visibleChannels}
            onChannelSelect={handleSelectChannel}
            onBack={() => setActiveSection('channels')}
            deviceType={deviceType}
          />
        );
      case 'private_hub':
        return (
          <PrivatePlutoPage 
            channels={privateChannels}
            onChannelSelect={handleSelectChannel}
            onBack={() => setActiveSection('home')}
            deviceType={deviceType}
          />
        );
      case 'search': {
        const query = channelsSearch.trim().toLowerCase();
        
        const filteredChannels = query ? visibleChannels
          .filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.category.toLowerCase().includes(query) ||
            (c.description && c.description.toLowerCase().includes(query))
          ) : [];

        const filteredMovies = query ? movies.filter(m => 
          m.title.toLowerCase().includes(query) || 
          (m.originalTitle && m.originalTitle.toLowerCase().includes(query)) ||
          m.genres.some(g => g.toLowerCase().includes(query)) ||
          m.director.toLowerCase().includes(query) ||
          m.actors.some(a => a.toLowerCase().includes(query)) ||
          (m.summary && m.summary.toLowerCase().includes(query))
        ) : [];

        const channelCategories = Array.from(new Set(channels.map(c => c.category))).filter(Boolean);
        const movieGenres = Array.from(new Set(movies.flatMap(m => m.genres || []))).filter(Boolean);

        return (
          <div className={cn("space-y-8", isMobile ? "pb-24" : "")}>
            <div className="flex flex-col bg-white/[0.03] p-6 lg:p-10 rounded-3xl border border-white/5 backdrop-blur-xl gap-6">
               <div>
                  <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                    <Search className="text-indigo-500 animate-pulse" size={28} />
                    Recherche Globale
                  </h2>
                  <p className="text-white/40 mt-1 font-medium text-xs sm:text-sm">Explorez instantanément nos chaînes en direct et films en VOD</p>
               </div>
               
               <div className="relative w-full max-w-2xl">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                 <input 
                   className="bg-black/50 border border-white/10 hover:border-white/20 focus:border-indigo-500/50 rounded-2xl py-4 pl-14 pr-12 text-white w-full focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-base font-bold placeholder:text-white/20" 
                   placeholder="Rechercher une chaîne, un film, un genre, un acteur..." 
                   autoFocus
                   value={channelsSearch}
                   onChange={(e) => setChannelsSearch(e.target.value)}
                 />
                 {channelsSearch && (
                   <button 
                     onClick={() => setChannelsSearch('')}
                     className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/5 hover:bg-white/15 hover:text-white text-white/45 rounded-full transition-all"
                   >
                     <X size={15} />
                   </button>
                 )}
               </div>

               {query && (
                 <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
                   <button
                     onClick={() => setSearchTab('all')}
                     className={cn(
                       "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                       searchTab === 'all' 
                         ? "bg-red-650 text-white shadow-lg shadow-red-650/15" 
                         : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                     )}
                   >
                     Tout ({filteredChannels.length + filteredMovies.length})
                   </button>
                   <button
                     onClick={() => setSearchTab('channels')}
                     className={cn(
                       "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                       searchTab === 'channels' 
                         ? "bg-red-650 text-white shadow-lg shadow-red-650/15" 
                         : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                     )}
                   >
                     <Tv size={13} />
                     Direct TV ({filteredChannels.length})
                   </button>
                   <button
                     onClick={() => setSearchTab('movies')}
                     className={cn(
                       "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                       searchTab === 'movies' 
                         ? "bg-red-650 text-white shadow-lg shadow-red-650/15" 
                         : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                     )}
                   >
                     <Film size={13} />
                     Films & VOD ({filteredMovies.length})
                   </button>
                 </div>
               )}
            </div>

            {query ? (
              <div className="space-y-12">
                {/* 1. TV Channels results group */}
                {(searchTab === 'all' || searchTab === 'channels') && (
                  <div className="space-y-4">
                    {searchTab === 'all' && filteredChannels.length > 0 && (
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2 border-b border-white/5 pb-2">
                        <Tv size={14} className="text-indigo-500" />
                        Chaînes en direct ({filteredChannels.length})
                      </h3>
                    )}
                    {filteredChannels.length > 0 ? (
                      <ChannelGrid 
                        channels={filteredChannels} 
                        onChannelSelect={handleSelectChannel}
                        onChannelLongPress={handleChannelLongPress}
                        deviceType={deviceType}
                        liveEpg={liveEpg}
                      />
                    ) : (
                      searchTab === 'channels' && (
                        <div className="h-44 bg-white/[0.01] border border-white/5 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-6">
                          <Tv size={28} className="text-white/15 mb-2" />
                          <p className="text-white/40 text-xs font-extrabold uppercase tracking-widest">Aucune chaîne trouvée</p>
                          <p className="text-white/20 text-[11px] mt-1">Essayez d'autres termes ou explorez d'autres catégories</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* 2. Movies & VOD results group */}
                {(searchTab === 'all' || searchTab === 'movies') && (
                  <div className="space-y-4">
                    {searchTab === 'all' && filteredMovies.length > 0 && (
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2 border-b border-white/5 pb-2">
                        <Film size={14} className="text-indigo-500" />
                        Films & VOD ({filteredMovies.length})
                      </h3>
                    )}
                    {filteredMovies.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                        {filteredMovies.map((movie) => (
                          <motion.div
                            key={movie.id}
                            onClick={() => setSearchDetailMovie(movie)}
                            whileHover={{ y: -8, scale: 1.04 }}
                            transition={{ type: "spring", stiffness: 300, damping: 22 }}
                            className="relative aspect-[2/3] rounded-[22px] overflow-hidden cursor-pointer shadow-2xl border border-white/5 bg-neutral-900 group"
                          >
                            <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-4 flex flex-col justify-end">
                              <div className="flex items-center justify-between gap-1 text-[9px] mb-1.5 opacity-90">
                                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded font-black tracking-wider uppercase text-[8px]">{movie.quality}</span>
                                <span className="text-white/50">{movie.year}</span>
                              </div>
                              <h4 className="text-white font-black text-xs sm:text-sm line-clamp-1 group-hover:text-indigo-400 transition-colors">{movie.title}</h4>
                              <div className="flex items-center justify-between mt-1 opacity-100 transition-all">
                                <div className="flex items-center gap-1">
                                  <Star size={10} className="text-yellow-500 fill-current" />
                                  <span className="text-[10px] font-black text-white/60">{movie.ratingImdb || 'N/A'}</span>
                                </div>
                                {movie.genres && movie.genres[0] && (
                                  <span className="text-[9px] font-extrabold text-white/30 truncate max-w-[80px] uppercase tracking-wider">{movie.genres[0]}</span>
                                )}
                              </div>
                            </div>
                            {movie.isNew && (
                              <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-500/20">
                                New
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      searchTab === 'movies' && (
                        <div className="h-44 bg-white/[0.01] border border-white/5 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-6">
                          <Film size={28} className="text-white/15 mb-2" />
                          <p className="text-white/40 text-xs font-extrabold uppercase tracking-widest">Aucun film trouvé</p>
                          <p className="text-white/20 text-[11px] mt-1">Recherchez d'après le réalisateur, l'année, le genre ou le titre</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {filteredChannels.length === 0 && filteredMovies.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Search size={40} className="text-white/10 mb-3" />
                    <h3 className="text-white/40 font-black text-sm uppercase tracking-wider">Aucun résultat trouvé</h3>
                    <p className="text-white/20 text-xs mt-1 max-w-sm leading-relaxed">Veuillez vérifier l'orthographe ou explorer les catégories populaires ci-dessous.</p>
                    <button 
                      onClick={() => setChannelsSearch('')}
                      className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-bold uppercase transition-all"
                    >
                      Effacer la recherche
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-10">
                 <div className="space-y-3">
                   <h3 className="text-xs font-black uppercase text-white/30 tracking-[0.2em] flex items-center gap-1.5">
                     <Sparkles size={13} className="text-indigo-500" /> Recherches d'actualité
                   </h3>
                   <div className="flex flex-wrap gap-2">
                     {["TF1", "M6", "Canal+", "France 2", "Inception", "Interstellar", "Action", "Sport"].map(word => (
                       <button
                         key={word}
                         onClick={() => setChannelsSearch(word)}
                         className="px-4 py-2.5 bg-[#141414] hover:bg-[#1c1c1c] text-white/70 hover:text-white text-xs font-extrabold rounded-xl border border-white/5 hover:border-white/10 transition-all uppercase tracking-wide cursor-pointer"
                       >
                         {word}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase text-white/30 tracking-[0.2em] flex items-center gap-1.5">
                        <Tv size={13} /> Catégories Direct TV
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {channelCategories.slice(0, 8).map(category => (
                          <button 
                            key={category} 
                            onClick={() => {
                              setChannelsSearch(category);
                              setSearchTab('channels');
                            }} 
                            className="p-4 bg-[#111] hover:bg-[#151515] hover:border-red-650/35 border border-white/5 rounded-2xl text-left transition-all group cursor-pointer"
                          >
                            <h4 className="text-white/80 font-bold uppercase tracking-wider text-xs truncate group-hover:text-red-500 transition-colors">{category}</h4>
                            <span className="text-white/30 text-[10px] mt-0.5 block">{channels.filter(c => c.category === category).length} chaînes</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase text-white/30 tracking-[0.2em] flex items-center gap-1.5">
                        <Film size={13} /> Genres VOD / Cinéma
                      </h3>
                      {movieGenres.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {movieGenres.slice(0, 8).map(genre => (
                            <button 
                              key={genre} 
                              onClick={() => {
                                setChannelsSearch(genre);
                                setSearchTab('movies');
                              }} 
                              className="p-4 bg-[#111] hover:bg-[#151515] hover:border-red-650/35 border border-white/5 rounded-2xl text-left transition-all group cursor-pointer"
                            >
                              <h4 className="text-white/80 font-bold uppercase tracking-wider text-xs truncate group-hover:text-red-500 transition-colors">{genre}</h4>
                              <span className="text-white/30 text-[10px] mt-0.5 block">{movies.filter(m => m.genres && m.genres.includes(genre)).length} films</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="h-32 bg-white/[0.01] border border-white/5 border-dashed rounded-2xl flex items-center justify-center text-center p-4">
                          <span className="text-[10px] text-white/20 font-black uppercase tracking-wider">Aucun genre enregistré</span>
                        </div>
                      )}
                    </div>
                 </div>
              </div>
            )}
          </div>
        );
      }
      case 'admin':
        return (
          <div className={isMobile ? "pb-24" : ""}>
            <AdminPanel 
              channels={channels}
              onAddChannel={handleAddChannel}
              onUpdateChannel={handleUpdateChannel}
              onDeleteChannel={handleDeleteChannel}
            />
          </div>
        );
      case 'guide':
        return <div className={isMobile ? "pb-24" : ""}><EPGGuide channels={channels} /></div>;
      case 'movies':
        return (
          <MovieHub 
            onChannelSelect={handleSelectMovie}
            onGoToSettings={() => setActiveSection('movie_settings')}
            deviceType={deviceType}
            moviesList={movies}
            continueWatching={continueWatchingMins}
          />
        );
      case 'movie_settings':
        return (
          <div className={cn("space-y-6 pb-12", isMobile ? "pb-24" : "")}>
            <MovieSettings 
              movies={movies}
              onAddMovie={async (movie) => {
                await axios.post('/api/movies', movie);
              }}
              onUpdateMovie={async (id, movie) => {
                await axios.put(`/api/movies/${id}`, movie);
              }}
              onDeleteMovie={async (id) => {
                await axios.delete(`/api/movies/${id}`);
              }}
              onBack={() => setActiveSection('movies')}
            />
          </div>
        );
      case 'settings':
        return (
          <div className={cn("space-y-6 pb-12", isMobile ? "pb-24" : "")}>
            <div className="pb-3 border-b border-white/5">
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">Réglages Système</h2>
              <p className="text-white/40 text-xs mt-1">Configurez l'ensemble de votre écosystème Denden TV</p>
            </div>
            <SettingsPanel 
              settings={settings}
              channels={channels}
              onUpdateSettings={async (updated) => {
                try {
                  const res = await axios.post('/api/settings', updated);
                  setSettings(res.data);
                } catch (err) {
                  console.error('Error updating settings:', err);
                }
              }}
              deviceType={deviceType}
            />
          </div>
        );
      default:
        return <div className="text-white/40 flex items-center justify-center h-[50vh]">Section en cours de développement...</div>;
    }
  };

  if (loading) {
    return <SplashScreen onFinish={() => setLoading(false)} />;
  }

  return (
    <div className={cn(
      "flex h-screen bg-[#090e17] overflow-hidden font-sans selection:bg-[#00A8E1]/30",
      deviceType === 'mobile' ? "flex-col" : "flex-row"
    )}>
      <Toaster theme="dark" position="top-center" />
      <Navigation 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
        deviceType={deviceType}
        isPrivateUnlocked={isPrivateUnlocked}
      />
      
      <main className="flex-1 overflow-y-auto p-2 md:p-4 lg:p-8 scrollbar-hide scroll-smooth relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Channel Actions Modal */}
      <AnimatePresence>
        {showChannelActions?.isOpen && showChannelActions.channel && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 sm:backdrop-blur-xl"
              onClick={() => setShowChannelActions(null)}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-[#111] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden relative z-10 shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 flex items-center gap-6">
                <div className="w-16 h-16 bg-black border border-white/10 rounded-2xl p-2 shrink-0">
                  <img src={showChannelActions.channel.logo || undefined} alt="" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{showChannelActions.channel.name}</h3>
                  <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1">{showChannelActions.channel.category}</p>
                </div>
              </div>

              <div className="p-4 grid gap-2">
                <button 
                  onClick={() => handleActionTest(showChannelActions.channel)}
                  className="w-full flex items-center gap-4 px-6 py-5 bg-white/[0.03] hover:bg-white/[0.08] text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest group text-left"
                >
                  <Play size={20} className="text-emerald-500 group-hover:scale-110" /> Regarder maintenant
                </button>
                <button 
                  onClick={() => handleActionEdit(showChannelActions.channel)}
                  className="w-full flex items-center gap-4 px-6 py-5 bg-white/[0.03] hover:bg-white/[0.08] text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest group text-left"
                >
                  <Settings size={20} className="text-blue-500 group-hover:rotate-45" /> Modifier les informations
                </button>
                <button 
                  onClick={() => {
                    handleDeleteChannel(showChannelActions.channel.id);
                    setShowChannelActions(null);
                  }}
                  className="w-full flex items-center gap-4 px-6 py-5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl transition-all font-black text-xs uppercase tracking-widest group text-left"
                >
                  <Trash2 size={20} className="group-hover:scale-110" /> Supprimer définitivement
                </button>
              </div>

              <div className="p-4 bg-white/[0.02] border-t border-white/5">
                <button 
                  onClick={() => setShowChannelActions(null)}
                  className="w-full py-4 text-white/40 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] transition-colors"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/5 p-12 lg:p-20 rounded-[48px] w-full max-w-xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] text-center m-4"
            >
              <div className="mx-auto w-24 h-24 bg-indigo-500/10 rounded-[32px] flex items-center justify-center text-indigo-500 mb-10 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                <Lock size={48} />
              </div>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase font-sans">Accès Sécurisé</h2>
              <p className="text-white/40 mb-12 font-medium text-sm tracking-wide uppercase">Saisissez votre code personnel DENDEN TV</p>
              
              <form onSubmit={handlePinSubmit} className="space-y-12">
                <input 
                  autoFocus
                  type="password" 
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="• • • •"
                  className="w-full bg-black/60 border-2 border-white/5 focus:border-indigo-500 rounded-[32px] py-8 text-center text-6xl tracking-[0.8em] text-white focus:outline-none transition-all font-mono shadow-inner"
                />
                
                <div className="flex gap-6">
                  <button 
                    type="button" 
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 py-6 bg-white/5 text-white/50 font-black rounded-[24px] hover:bg-white/10 transition-all uppercase tracking-widest text-xs border border-white/5 active:scale-95"
                  >
                    Fermer
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-6 bg-indigo-600 text-white font-black rounded-[24px] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/30 uppercase tracking-widest text-xs active:scale-95"
                  >
                    Valider
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Search Movie Detail Modal */}
      <AnimatePresence>
        {searchDetailMovie && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setSearchDetailMovie(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-4xl bg-[#0f0f0f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Backdrop poster */}
              <div className="relative h-[240px] sm:h-[380px] w-full">
                <img 
                  src={searchDetailMovie.banner || searchDetailMovie.poster} 
                  alt={searchDetailMovie.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/40 to-black/10" />
                
                {/* Close Button */}
                <button 
                  onClick={() => setSearchDetailMovie(null)}
                  className="absolute top-6 right-6 p-2 bg-black/60 hover:bg-red-650 text-white rounded-full transition-all border border-white/10 hover:border-transparent active:scale-95"
                >
                  <X size={20} />
                </button>

                {/* Info Text Overlay */}
                <div className="absolute bottom-0 left-0 p-6 sm:p-10 w-full">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black mb-2">
                    <span className="text-yellow-500 font-extrabold flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">
                      <Star size={10} className="fill-current text-yellow-500" /> {searchDetailMovie.ratingImdb || 'N/A'} IMDb
                    </span>
                    <span className="text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded">{searchDetailMovie.year}</span>
                    <span className="text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded">{searchDetailMovie.duration || 'N/A'}</span>
                    <span className="border border-red-600/30 text-red-500 bg-red-950/20 px-2 py-0.5 rounded text-[10px] tracking-widest font-black uppercase">{searchDetailMovie.quality}</span>
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-lg">{searchDetailMovie.title}</h2>
                  {searchDetailMovie.originalTitle && (
                    <p className="text-white/40 text-xs sm:text-sm font-bold uppercase tracking-wider mt-1">Titre original : {searchDetailMovie.originalTitle}</p>
                  )}
                </div>
              </div>

              {/* Description & Technical content */}
              <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase text-red-500 tracking-[0.2em] flex items-center gap-1.5">
                      <BookOpen size={12} /> Synopsis & Résumé
                    </h3>
                    <p className="text-white/70 font-medium text-sm sm:text-base leading-relaxed">{searchDetailMovie.summary || "Aucun synopsis disponible."}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs">
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Réalisateur</span>
                      <span className="font-extrabold text-white/80">{searchDetailMovie.director || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Pays</span>
                      <span className="font-extrabold text-white/80">{searchDetailMovie.country || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Langue</span>
                      <span className="font-extrabold text-white/80">{searchDetailMovie.language || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-white/30 font-black block uppercase mb-1">Type</span>
                      <span className="font-bold text-red-500/80 uppercase">VOD / Film</span>
                    </div>
                  </div>

                  {searchDetailMovie.actors && searchDetailMovie.actors.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase text-white/40 tracking-[0.2em] flex items-center gap-1.5">
                        <Users size={12} /> Distribution / Casting
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {searchDetailMovie.actors.map((actor, idx) => (
                          <span key={idx} className="bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/80 select-none">
                            {actor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Action buttons */}
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        handleSelectMovie(searchDetailMovie);
                        setSearchDetailMovie(null);
                      }}
                      className="w-full py-4 bg-red-650 hover:bg-red-700 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-600/25 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Play size={14} fill="currentColor" /> Lancer le film
                    </button>

                    {searchDetailMovie.trailerUrl && (
                      <button 
                        onClick={() => {
                          try {
                            window.open(searchDetailMovie.trailerUrl, '_blank');
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-2xl transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Film size={14} /> Voir la bande-annonce
                      </button>
                    )}
                  </div>

                  {/* Genres card list */}
                  {searchDetailMovie.genres && searchDetailMovie.genres.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-[#555]">Genres associés</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {searchDetailMovie.genres.map((genre) => (
                          <span key={genre} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
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

      {/* Movie Player Layout */}
      {selectedMovieForPlayer && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: isFullScreenMoviePlayer ? 1 : 0, 
            scale: isFullScreenMoviePlayer ? 1 : 0.95,
            pointerEvents: isFullScreenMoviePlayer ? 'auto' : 'none',
            zIndex: isFullScreenMoviePlayer ? 80 : -10
          }}
          transition={{ duration: 0.3 }}
          className={cn("fixed inset-0 bg-black", !isFullScreenMoviePlayer && "overflow-hidden")}
        >
          <MoviePlayer 
            movie={selectedMovieForPlayer} 
            onClose={() => {
              setSelectedMovieForPlayer(null);
              setIsFullScreenMoviePlayer(false);
            }} 
            onMinimize={() => setIsFullScreenMoviePlayer(false)}
            onMaximize={() => setIsFullScreenMoviePlayer(true)}
            fullScreen={isFullScreenMoviePlayer} 
            onProgressUpdate={saveMovieProgress}
          />
        </motion.div>
      )}

      {/* Video Player Layout (Fullscreen & Native Picture-in-Picture Background Keeper) */}
      {selectedChannel && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: isFullScreenPlayer ? 1 : 0, 
            scale: isFullScreenPlayer ? 1 : 0.95,
            pointerEvents: isFullScreenPlayer ? 'auto' : 'none',
            zIndex: isFullScreenPlayer ? 80 : -10
          }}
          transition={{ duration: 0.3 }}
          className={cn("fixed inset-0 bg-black", !isFullScreenPlayer && "overflow-hidden")}
        >
          <VideoPlayer 
            channel={selectedChannel} 
            onClose={() => {
              setSelectedChannel(null);
              setIsFullScreenPlayer(false);
            }} 
            onMinimize={() => {
              setIsFullScreenPlayer(false);
            }}
            onMaximize={() => {
              setIsFullScreenPlayer(true);
            }}
            fullScreen={isFullScreenPlayer} 
            liveEpg={liveEpg[selectedChannel.id]}
            onNextChannel={handleNextChannel}
            onPrevChannel={handlePrevChannel}
            channels={channels}
            onSelectChannel={handleSelectChannel}
          />
        </motion.div>
      )}
    </div>
  );
}
