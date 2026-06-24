import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import Hls from 'hls.js';
import { PLUTO_TV_CHANNELS } from '../plutoChannels';
import { Channel, Movie } from '../types';
import ChannelCardWrapper from './ChannelCardWrapper';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Search, 
  ArrowLeft, 
  Tv, 
  Film, 
  Grid, 
  Sparkles, 
  History, 
  Calendar, 
  ChevronRight, 
  Loader2,
  Info,
  Sliders,
  Award
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onChannelSelect: (channel: Channel) => void;
  onBack: () => void;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  liveEpg?: any;
  movies?: Movie[];
  onMovieSelect?: (movie: Movie) => void;
}

export default function PlutoTVPage({ 
  onChannelSelect, 
  onBack, 
  deviceType, 
  liveEpg = {}, 
  movies = [], 
  onMovieSelect 
}: Props) {
  // State
  const [activeTab, setActiveTab] = useState<'live' | 'vod'>('live');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedVodMovie, setSelectedVodMovie] = useState<Movie | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  
  // Embedded player states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Default muted to allow autoplay
  const [volume, setVolume] = useState<number>(0.8);
  const [hlsLevels, setHlsLevels] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(-1); // Auto by default
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(true);
  
  // Refs for embedded player
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Helper to proxy stream requests and bypass CORS/referer limitations
  const getPlayableUrl = (url: string) => {
    if (!url) return '';
    const isExternal = url.startsWith('http') && !url.includes(window.location.host);
    const isM3u8 = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('m3u8');
    
    if (isExternal) {
      if (isM3u8) {
        let referer = 'https://pluto.tv/';
        try {
          referer = new URL(url).origin + '/';
        } catch (e) {}
        return `/api/proxy/stream?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`;
      } else {
        const isStandard = url.toLowerCase().split('?')[0].endsWith('.mp4') ||
          url.toLowerCase().split('?')[0].endsWith('.webm') ||
          url.toLowerCase().split('?')[0].endsWith('.ogg') ||
          url.toLowerCase().split('?')[0].endsWith('.mov') ||
          url.toLowerCase().split('?')[0].endsWith('.avi');
        if (isStandard) {
          return `/api/proxy/video?url=${encodeURIComponent(url)}`;
        }
      }
    }
    return url;
  };

  // 1. Fetch & Parse M3U8 for accurate channel information
  useEffect(() => {
    let isMounted = true;
    const fetchChannels = async () => {
      try {
        const response = await fetch('/plutotv_fr.m3u8');
        if (!response.ok) throw new Error('Failed to fetch M3U8');
        const text = await response.text();
        
        // Parse the M3U8 lines
        const parsed: Channel[] = [];
        const lines = text.split('\n');
        let currentItem: Partial<Channel> = {};

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXTINF:')) {
            currentItem = { isEnabled: true };
            
            // Extract tvg-id
            const idMatch = line.match(/tvg-id="([^"]*)"/);
            if (idMatch) currentItem.id = idMatch[1];

            // Extract tvg-logo
            const logoMatch = line.match(/tvg-logo="([^"]*)"/);
            if (logoMatch) currentItem.logo = logoMatch[1];

            // Extract group-title (category)
            const groupMatch = line.match(/group-title="([^"]*)"/);
            if (groupMatch) currentItem.category = groupMatch[1];

            // Name is everything after the last comma
            const commaIdx = line.lastIndexOf(',');
            if (commaIdx !== -1) {
              currentItem.name = line.substring(commaIdx + 1).trim();
            }
          } else if (line.startsWith('http') && currentItem.id) {
            currentItem.url = line;
            parsed.push(currentItem as Channel);
            currentItem = {};
          }
        }

        if (isMounted) {
          if (parsed.length > 0) {
            setChannels(parsed);
            setSelectedChannel(parsed[0]);
          } else {
            // Fallback to PLUTO_TV_CHANNELS if parsing got 0 results
            setChannels(PLUTO_TV_CHANNELS);
            setSelectedChannel(PLUTO_TV_CHANNELS[0]);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('M3U8 fetch error, falling back to static channels:', err);
        if (isMounted) {
          // Fallback to PLUTO_TV_CHANNELS
          const fallback = PLUTO_TV_CHANNELS.map(c => ({
            ...c,
            name: c.name || `Canal ${c.category || 'Pluto'}`
          }));
          setChannels(fallback);
          setSelectedChannel(fallback[0]);
          setLoading(false);
        }
      }
    };

    fetchChannels();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Control video tag properties (mute and volume)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  // 3. Embedded Video Player initialization with Hls.js
  useEffect(() => {
    if (activeTab !== 'live' || !selectedChannel || !videoRef.current) return;

    let isMounted = true;
    const video = videoRef.current;
    
    // Proxy the stream URL to circumvent CORS/Referer issues
    const streamUrl = getPlayableUrl(selectedChannel.url);
    setIsVideoLoading(true);

    // Reset controls state
    setHlsLevels([]);
    setSelectedLevel(-1);

    // Clean up old Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        enableWorker: true,
        lowLatencyMode: false, // Better stability for 24/7 public streams
        backBufferLength: 60,
        manifestLoadingTimeOut: 15000,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 20000,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        if (isMounted) {
          setHlsLevels(data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height,
            bitrate: lvl.bitrate
          })));
          setIsVideoLoading(false);
        }
        
        if (isPlaying) {
          video.play().catch(() => {
            // Auto-play might be blocked unless muted, so force muted on failure
            setIsMuted(true);
            video.muted = true;
            video.play().catch(err => console.log('Autoplay failed:', err));
          });
        }
      });

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari support
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsVideoLoading(false);
        if (isPlaying) video.play().catch(() => {});
      });
    }

    return () => {
      isMounted = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel, activeTab]);

  // Play / Pause toggler
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Mute / Unmute toggler
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  // Change streaming quality
  const handleQualityChange = (levelId: number) => {
    setSelectedLevel(levelId);
    setShowQualityMenu(false);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
  };

  // Launch Fullscreen Player
  const handleLaunchFullScreen = () => {
    if (selectedChannel) {
      onChannelSelect(selectedChannel);
    }
  };

  // 4. Stable dynamic fallback EPG generation
  const getFallbackEPG = (channel: Channel) => {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    
    // Create a stable seed based on channel ID
    const seed = channel.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const programs: Record<string, string[]> = {
      'TV Réalité': [
        'Catfish: Fausses Identités',
        'Ex on the Beach',
        'The Hills - Les Coulisses',
        'Teen Mom: Nouvelle Génération',
        'Jersey Shore Family Vacation',
        'Are You The One? Le Match Parfait'
      ],
      'Comédie': [
        'Ridiculousness Live',
        'Friends non-stop',
        'South Park - Intégrale',
        'La Famille Addams',
        'Mariés, deux enfants',
        'FailArmy: Le Pire d\'Internet'
      ],
      'Kids': [
        'Les Tortues Ninja: Chaos Mutagène',
        'Bob l\'Éponge',
        'iCarly: Le Retour',
        'Avatar: Le Dernier Maître de l\'Air',
        'Danny Fantôme',
        'Pluto TV Junior Show'
      ],
      'Cinéma': [
        'Ciné Thriller: L\'Asile de la Peur',
        'Le Silence des Agneaux',
        'Gladiator - Version Longue',
        'Inception: Voyage dans l\'esprit',
        'Pulp Fiction - Master Class',
        'Shutter Island'
      ],
      'Sports & Auto': [
        'WPT World Poker Tour',
        'Top Gear: Épreuves de force',
        'Ultimate Fighting Tournament',
        'Monster Jam Classics',
        'Supercars Championship',
        'Direct GP Grand Prix'
      ],
      'Divertissement': [
        'Hell\'s Kitchen: Chaud devant !',
        'Pawn Stars - Le juste prix',
        'Storage Wars: Enchères surprises',
        'Ghost Adventures - Les Experts du paranormal',
        'MythBusters: Les défis de la science',
        'Inside Pluto: L\'envers du décor'
      ],
      'À Binge-Watch': [
        'Séries Culte Non-Stop',
        'Inspecteur Barnaby: Meurtre au manoir',
        'Charmed: Le Livre des Ombres',
        'Le Prisonnier: Épisode culte',
        'The Sentinel - Enquête d\'élite',
        'Section 4: Enquêteurs Spéciaux'
      ]
    };

    const cat = channel.category || 'Autres';
    const list = programs[cat] || [
      'Émission Spéciale Pluto TV',
      'Reportage Découverte',
      'Série à Succès',
      'Documentaire Exclusif',
      'Le Meilleur de Pluto TV'
    ];

    const currentIdx = (hour + seed) % list.length;
    const nextIdx = (hour + 1 + seed) % list.length;
    
    const currentShow = list[currentIdx];
    const nextShow = list[nextIdx];
    
    const startHour = hour;
    const startMin = minute >= 30 ? 30 : 0;
    const endHour = minute >= 30 ? hour + 1 : hour;
    const endMin = minute >= 30 ? 0 : 30;
    
    const startTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    
    const progressPercent = minute >= 30 ? ((minute - 30) / 30) * 100 : (minute / 30) * 100;
    
    return {
      currentTitle: currentShow,
      nextTitle: nextShow,
      timeLabel: `${startTime} - ${endTime}`,
      progressPercent: Math.round(progressPercent),
      description: `Découvrez vos programmes favoris en direct 24h/24 sur ${channel.name || 'Pluto TV'}.`
    };
  };

  // 5. Get EPG metadata by merging real with fallbacks
  const getEPGInfo = (channel: Channel) => {
    const epgData = liveEpg?.[channel.id];
    if (!epgData) {
      return getFallbackEPG(channel);
    }

    if (epgData.programmeTv) {
      const ptv = epgData.programmeTv;
      return {
        currentTitle: ptv.title,
        nextTitle: epgData.next?.title || 'Prochain programme',
        timeLabel: ptv.time || 'En direct',
        progressPercent: ptv.progress || 50,
        description: ptv.description || `Retrouvez ${ptv.title} en direct sur ${channel.name || 'Pluto TV'}.`
      };
    }

    const realEpg = epgData.current;
    if (realEpg) {
      const start = new Date(realEpg.startTime);
      const end = new Date(realEpg.endTime);
      const nowMs = Date.now();
      const duration = (end.getTime() - start.getTime()) / 60000;
      const elapsed = Math.max(0, (nowMs - start.getTime()) / 60000);
      const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (elapsed / duration) * 100)) : 50;
      
      const formatTime = (d: Date) => {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };

      return {
        currentTitle: realEpg.title,
        nextTitle: epgData.next?.title || 'Prochain programme',
        timeLabel: `${formatTime(start)} - ${formatTime(end)}`,
        progressPercent: Math.round(progressPercent),
        description: realEpg.description || `Retrouvez ${realEpg.title} en direct sur ${channel.name || 'Pluto TV'}.`
      };
    }

    return getFallbackEPG(channel);
  };

  // 6. Dynamic Categories extraction
  const categories = useMemo(() => {
    if (channels.length === 0) return [];
    const cats = new Set(channels.map(c => c.category || 'Autres'));
    return ['Tous', ...Array.from(cats).sort()];
  }, [channels]);

  // VOD Genre compilation
  const vodGenres = useMemo(() => {
    if (movies.length === 0) return [];
    const genres = new Set<string>();
    movies.forEach(m => {
      if (m.genres) {
        m.genres.forEach(g => genres.add(g));
      }
    });
    return ['Tous', ...Array.from(genres).sort()];
  }, [movies]);

  // Set default VOD movie on mount / movies loaded
  useEffect(() => {
    if (movies.length > 0 && !selectedVodMovie) {
      setSelectedVodMovie(movies[0]);
    }
  }, [movies, selectedVodMovie]);

  // 7. Filtering logic for Live channels and VOD Movies
  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const matchesCategory = selectedCategory === 'Tous' || (channel.category || 'Autres') === selectedCategory;
      const matchesQuery = !deferredSearchQuery || 
        (channel.name || '').toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
        (channel.category || '').toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
        getEPGInfo(channel).currentTitle.toLowerCase().includes(deferredSearchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [channels, selectedCategory, deferredSearchQuery, liveEpg]);

  // Keyboard navigation for channel zapping (ArrowUp / ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'live' || filteredChannels.length === 0) return;
      
      // Ignore if typing inside input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = filteredChannels.findIndex(c => c.id === selectedChannel?.id);
        const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % filteredChannels.length : 0;
        setSelectedChannel(filteredChannels[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = filteredChannels.findIndex(c => c.id === selectedChannel?.id);
        const prevIndex = currentIndex !== -1 ? (currentIndex - 1 + filteredChannels.length) % filteredChannels.length : filteredChannels.length - 1;
        setSelectedChannel(filteredChannels[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, filteredChannels, selectedChannel]);

  const filteredMovies = useMemo(() => {
    return movies.filter(movie => {
      const matchesCategory = selectedCategory === 'Tous' || (movie.genres || []).includes(selectedCategory);
      const matchesQuery = !searchQuery || 
        (movie.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (movie.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (movie.director || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [movies, selectedCategory, searchQuery]);

  // Retrieve current active EPG info for preview panel
  const activeEpg = useMemo(() => {
    if (!selectedChannel) return null;
    return getEPGInfo(selectedChannel);
  }, [selectedChannel, liveEpg]);

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col relative overflow-hidden font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[900px] h-[900px] bg-sky-600/10 rounded-full blur-[180px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#000] z-[99] flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-t-sky-500 border-r-yellow-500 border-b-red-500 border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-xl italic tracking-tighter text-white">P</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-widest italic">
                PLUTO <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-yellow-400 to-red-500">TV</span>
              </h2>
              <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Synchronisation du guide...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 py-4 px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Branding & Back Navigation */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={onBack}
            className="group p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all active:scale-95"
            id="btn-pluto-back"
          >
            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black tracking-[-0.05em] italic uppercase leading-none">
              PLUTO <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-yellow-400 to-red-500 drop-shadow-md">TV</span>
            </h1>
            <div className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px] font-black tracking-widest text-sky-400 uppercase">
              Free Live TV
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab('live');
              setSelectedCategory('Tous');
            }}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'live' ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
            id="tab-pluto-live"
          >
            <Tv size={14} /> Télé en Direct
          </button>
          <button
            onClick={() => {
              setActiveTab('vod');
              setSelectedCategory('Tous');
            }}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'vod' ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
            )}
            id="tab-pluto-vod"
          >
            <Film size={14} /> À la Demande
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={16} />
          <input
            type="text"
            placeholder={activeTab === 'live' ? "Rechercher une chaîne ou émission..." : "Rechercher un film, genre..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/5 hover:bg-white/10 focus:bg-white/10 focus:border-white/20 rounded-full py-2.5 pl-11 pr-4 text-white text-xs md:text-sm outline-none transition-all placeholder:text-white/30"
          />
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        
        {/* LEFT COLUMN: Categories & Scrollable Grid list */}
        <section className="flex-1 flex flex-col lg:border-r lg:border-white/5 overflow-y-auto lg:overflow-hidden">
          
          {/* HORIZONTAL CATEGORIES CAROUSEL */}
          <div className="bg-[#0b0b0b] border-b border-white/5 px-4 md:px-8 py-3 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {(activeTab === 'live' ? categories : vodGenres).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest shrink-0 transition-all border cursor-pointer",
                  selectedCategory === cat 
                    ? "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/10" 
                    : "bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10"
                )}
                id={`cat-btn-${cat}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* LIST OF ITEMS: CHANNELS OR MOVIES */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
            {activeTab === 'live' ? (
              // LIVE CHANNELS EPG ROW LIST
              filteredChannels.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-4">
                  {filteredChannels.map((channel) => {
                    const isSelected = selectedChannel?.id === channel.id;

                    return (
                      <div 
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        className={cn(
                          "group relative flex flex-col items-center gap-3 bg-[#111] hover:bg-white/[0.05] p-4 rounded-2xl border transition-all cursor-pointer text-center",
                          isSelected 
                            ? "border-sky-500/50 bg-sky-950/10 shadow-[0_8px_30px_rgb(14,165,233,0.15)]" 
                            : "border-white/5 hover:border-white/10"
                        )}
                        id={`channel-card-${channel.id}`}
                      >
                        <div className="w-20 h-20 bg-black/40 rounded-2xl p-3 flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-105 transition-transform">
                          {channel.logo ? (
                            <img
                              src={channel.logo}
                              alt={channel.name}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          ) : (
                            <Tv className="text-white/20" size={32} />
                          )}
                        </div>
                        <h3 className="text-xs font-black text-white truncate w-full">
                          {channel.name}
                        </h3>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-24 text-center">
                  <Tv className="mx-auto text-white/10 mb-4" size={48} />
                  <p className="text-white/40 text-sm">Aucune chaîne Pluto correspondante.</p>
                </div>
              )
            ) : (
              // VOD MOVIES GRID LIST
              filteredMovies.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-4">
                  {filteredMovies.map((movie) => {
                    const isSelected = selectedVodMovie?.id === movie.id;
                    return (
                      <div
                        key={movie.id}
                        onClick={() => setSelectedVodMovie(movie)}
                        className={cn(
                          "group relative bg-[#0e0e0e] border rounded-2xl overflow-hidden cursor-pointer transition-all",
                          isSelected 
                            ? "border-yellow-500/50 shadow-[0_8px_30px_rgb(234,179,8,0.1)] scale-98" 
                            : "border-white/5 hover:border-white/10"
                        )}
                        id={`vod-card-${movie.id}`}
                      >
                        {/* Poster Aspect Ratio 2:3 */}
                        <div className="aspect-[2/3] relative overflow-hidden bg-black/40">
                          {movie.poster ? (
                            <img
                              src={movie.poster}
                              alt={movie.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Film className="text-white/10" size={32} />
                            </div>
                          )}
                          
                          {/* Quality badge overlay */}
                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur border border-white/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-yellow-400">
                            {movie.quality}
                          </div>

                          {/* Hover Play icon overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg transition-transform scale-75 group-hover:scale-100">
                              <Play size={18} className="text-black fill-current ml-1" />
                            </div>
                          </div>
                        </div>

                        {/* Title details */}
                        <div className="p-3 space-y-1">
                          <h4 className="text-xs font-black text-white truncate group-hover:text-yellow-400 transition-colors">
                            {movie.title}
                          </h4>
                          <div className="flex items-center justify-between text-[10px] text-white/40">
                            <span>{movie.year}</span>
                            <span>{movie.duration}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-24 text-center">
                  <Film className="mx-auto text-white/10 mb-4" size={48} />
                  <p className="text-white/40 text-sm">Aucun film à la demande disponible.</p>
                </div>
              )
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: PREVIEW PLAYER & INFO SHEET */}
        <section className="w-full lg:w-[450px] xl:w-[500px] shrink-0 bg-[#0c0c0c] border-b lg:border-b-0 border-white/5 flex flex-col overflow-y-auto order-first lg:order-last h-auto max-h-[45vh] lg:max-h-none lg:h-full">
          {activeTab === 'live' ? (
            // LIVE PREVIEW SIDEBAR PANEL
            selectedChannel ? (
              <div className="flex-1 flex flex-col">
                {/* VIDEO CONTAINER */}
                <div className="relative aspect-video w-full bg-black border-b border-white/5 group overflow-hidden">
                  <video
                    ref={videoRef}
                    playsInline
                    className="w-full h-full object-contain bg-black"
                    onWaiting={() => setIsVideoLoading(true)}
                    onPlaying={() => setIsVideoLoading(false)}
                    onLoadStart={() => setIsVideoLoading(true)}
                    onLoadedData={() => setIsVideoLoading(false)}
                  />

                  {isVideoLoading && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-10 pointer-events-none">
                      <div className="relative flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
                        <span className="absolute text-[10px] font-black italic text-sky-400">P</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 animate-pulse">
                        Connexion au Flux...
                      </span>
                    </div>
                  )}
                  
                  {/* Video overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 z-20">
                    
                    {/* Top status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-red-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest text-white animate-pulse">
                        DIRECT
                      </div>
                      
                      <button 
                        onClick={handleLaunchFullScreen}
                        className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-all hover:scale-105"
                        title="Plein écran"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>

                    {/* Custom Player Controls */}
                    <div className="flex items-center justify-between gap-4">
                      {/* Left side actions: Play / Volume */}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handlePlayPause}
                          className="p-1.5 bg-white text-black hover:scale-110 rounded-full transition-transform"
                        >
                          {isPlaying ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current ml-0.5" />}
                        </button>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleMuteToggle}
                            className="text-white/80 hover:text-white transition-colors"
                          >
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                          
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setVolume(val);
                              setIsMuted(val === 0);
                            }}
                            className="w-16 accent-sky-500 h-1 rounded-lg bg-white/20 outline-none cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Right actions: Stream Quality */}
                      {hlsLevels.length > 0 && (
                        <div className="relative">
                          <button 
                            onClick={() => setShowQualityMenu(!showQualityMenu)}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-black/40 hover:bg-black/60 border border-white/10 px-2 py-1 rounded-lg text-white"
                          >
                            <Sliders size={10} /> {selectedLevel === -1 ? 'Auto' : `${hlsLevels[selectedLevel]?.height}p`}
                          </button>

                          {/* Quality Menu Dropdown */}
                          <AnimatePresence>
                            {showQualityMenu && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-xl p-1 shadow-2xl z-50 min-w-[90px] space-y-0.5"
                              >
                                <button
                                  onClick={() => handleQualityChange(-1)}
                                  className={cn(
                                    "w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-colors",
                                    selectedLevel === -1 ? "bg-sky-500 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                                  )}
                                >
                                  Auto
                                </button>
                                {hlsLevels.map((lvl) => (
                                  <button
                                    key={lvl.id}
                                    onClick={() => handleQualityChange(lvl.id)}
                                    className={cn(
                                      "w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-colors",
                                      selectedLevel === lvl.id ? "bg-sky-500 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                                    )}
                                  >
                                    {lvl.height}p
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Audio Status overlay warning if muted */}
                  {isMuted && isPlaying && (
                    <div 
                      onClick={() => setIsMuted(false)}
                      className="absolute bottom-4 left-4 z-10 bg-black/75 hover:bg-black border border-white/10 text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <VolumeX size={10} /> Cliquez pour réactiver le son
                    </div>
                  )}
                </div>

                {/* INFO PANEL */}
                <div className="flex-1 p-4 lg:p-8 space-y-4 lg:space-y-6 flex flex-col justify-between">
                  
                  <div className="space-y-4 lg:space-y-6">
                    {/* Header Logo & Title */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black tracking-[0.2em] text-sky-400 uppercase">
                          {selectedChannel.category || 'Autres'}
                        </span>
                        <h2 className="text-base lg:text-xl font-black text-white italic uppercase tracking-tight leading-tight">
                          {selectedChannel.name || activeEpg?.currentTitle}
                        </h2>
                      </div>

                      {selectedChannel.logo && (
                        <div className="w-16 h-12 bg-white/5 rounded-xl p-2 flex items-center justify-center shrink-0 border border-white/10">
                          <img
                            src={selectedChannel.logo}
                            alt={selectedChannel.name}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Active EPG Description */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 lg:p-4 space-y-3 lg:space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                        <Award size={12} /> En Direct En Ce Moment
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-black text-white leading-snug">
                          {activeEpg?.currentTitle}
                        </h3>
                        <p className="text-xs text-white/60 leading-relaxed">
                          {activeEpg?.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-white/40 pt-2 border-t border-white/5">
                        <span className="text-sky-400">{activeEpg?.timeLabel}</span>
                        <span>{activeEpg?.progressPercent}% écoulé</span>
                      </div>

                      {/* Running timeline bar */}
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-sky-500 rounded-full transition-all duration-1000"
                          style={{ width: `${activeEpg?.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Up Next info */}
                    <div className="flex items-start gap-3 text-xs bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                      <Info size={14} className="text-white/40 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-extrabold text-[9px] uppercase tracking-wider text-white/30 block mb-0.5">Programme suivant:</span>
                        <span className="font-bold text-white/80">{activeEpg?.nextTitle}</span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION: PLEIN ÉCRAN */}
                  <button
                    onClick={handleLaunchFullScreen}
                    className="w-full mt-6 py-4 bg-gradient-to-r from-sky-600 via-sky-500 to-sky-400 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:shadow-xl hover:shadow-sky-600/20 active:scale-98 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    id="btn-pluto-fullscreen"
                  >
                    <Maximize2 size={14} /> Regarder en Plein Écran
                  </button>

                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-white/20">
                <Tv size={36} className="mb-2 block mx-auto animate-pulse" />
                Sélectionnez une chaîne pour démarrer le direct
              </div>
            )
          ) : (
            // VOD PREVIEW SIDEBAR PANEL
            selectedVodMovie ? (
              <div className="flex-1 flex flex-col justify-between p-4 lg:p-8">
                
                <div className="space-y-4 lg:space-y-6">
                  {/* Big Hero Banner Backdrop */}
                  <div className="aspect-[16/10] w-full rounded-2xl bg-[#111] overflow-hidden relative border border-white/5">
                    {selectedVodMovie.banner || selectedVodMovie.poster ? (
                      <img
                        src={selectedVodMovie.banner || selectedVodMovie.poster}
                        alt={selectedVodMovie.title}
                        className="w-full h-full object-cover filter brightness-75"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film className="text-white/5 animate-pulse" size={48} />
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    
                    {/* Floating stats */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 bg-yellow-500 text-black px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider w-fit">
                          ★ VOD POPULAIRE
                        </div>
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight leading-none text-white shadow-sm truncate">
                          {selectedVodMovie.title}
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* Movie Technical specifications */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-white/60">
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded">{selectedVodMovie.year}</span>
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded">{selectedVodMovie.duration}</span>
                    <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">★ {selectedVodMovie.ratingImdb || '7.5'} IMDb</span>
                    <span className="bg-red-600/10 border border-red-600/25 text-red-500 px-2 py-0.5 rounded uppercase font-black tracking-widest">{selectedVodMovie.quality}</span>
                  </div>

                  {/* Summary */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/30">Synopsis</h3>
                    <p className="text-xs leading-relaxed text-white/70 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                      {selectedVodMovie.summary || 'Aucun synopsis disponible pour ce titre Pluto TV.'}
                    </p>
                  </div>

                  {/* Additional Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-xs border-t border-white/5 pt-4">
                    <div>
                      <span className="text-white/30 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Réalisateur</span>
                      <span className="font-black text-white/80">{selectedVodMovie.director || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/30 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Origine</span>
                      <span className="font-black text-white/80">{selectedVodMovie.country || 'France'}</span>
                    </div>
                  </div>

                  {/* Genres badges */}
                  {selectedVodMovie.genres && selectedVodMovie.genres.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-white/30 font-bold block text-[10px] uppercase tracking-wider">Genres</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedVodMovie.genres.map((g) => (
                          <span 
                            key={g}
                            className="text-[9px] font-black uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5 text-white/60"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* PLAY ACTION BUTTON */}
                <button
                  onClick={() => onMovieSelect?.(selectedVodMovie)}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-yellow-500 via-yellow-400 to-amber-500 text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:shadow-xl hover:shadow-yellow-500/20 active:scale-98 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  id="btn-pluto-play-vod"
                >
                  <Play size={14} className="fill-current" /> Lancer le Film
                </button>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-white/20">
                <Film size={36} className="mb-2 block mx-auto animate-pulse" />
                Sélectionnez un film pour voir les détails
              </div>
            )
          )}
        </section>

      </main>

      {/* FOOTER METRICS BAR */}
      <footer className="shrink-0 bg-black/95 border-t border-white/5 py-4 px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-white/30 font-black uppercase tracking-[0.25em]">
        <div className="flex flex-wrap items-center gap-6 justify-center">
          <div className="flex items-center gap-2 text-sky-500/80">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
            <span>M3U8 Parser Actif</span>
          </div>
          <div className="flex items-center gap-2 text-yellow-500/80">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            <span>{channels.length} Chaînes Sync</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-500/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{movies.length} Films VOD Connectés</span>
          </div>
        </div>
        
        <div className="hover:text-white/50 transition-colors cursor-default">
          Pluto TV Redesign © Denden Media Player
        </div>
      </footer>

    </div>
  );
}
