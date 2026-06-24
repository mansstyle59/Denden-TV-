import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Maximize2,
  MonitorPlay,
  Star,
  Volume2,
  VolumeX,
  History,
  Search,
  Calendar,
  FileUp,
  Link,
  Trash2,
  ArrowRight,
  Activity,
  Trophy,
  Tv,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Check,
  Clock,
  Wifi,
  User,
  Zap,
  Info,
  ZapOff,
  Activity as Pulse,
  Heart,
  Film,
  BookOpen,
  Users,
  Globe,
  X,
} from "lucide-react";
import { Channel, Movie } from "../types";
import { cn, normalizeCategory } from "../lib/utils";
import DendenLogo from "./DendenLogo";
import VideoPlayer from "./VideoPlayer";
import axios from "axios";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import useLongPress from "../hooks/useLongPress";
import ChannelCardWrapper from "./ChannelCardWrapper";
import { ErrorBoundary } from "./ErrorBoundary";

interface HomePremiumProps {
  channels: Channel[];
  movies?: Movie[];
  onChannelSelect: (content: any) => void;
  onChannelLongPress?: (channel: Channel) => void;
  deviceType: "mobile" | "tablet" | "desktop" | "tv";
  onNavigateToSection: (section: string) => void;
  liveEpg?: {
    [channelId: string]: { current: any; next: any; programmeTv?: any };
  };
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
  continueWatching = {},
}: HomePremiumProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentlyWatched, setRecentlyWatched] = useState<(Channel | Movie)[]>(
    [],
  );
  const [heroChannel, setHeroChannel] = useState<Channel | null>(null);
  const [viewMode, setViewMode] = useState<"categories" | "grid">("categories");
  const [heroType, setHeroType] = useState<"channel" | "movie">("channel");
  const [selectedDetailMovie, setSelectedDetailMovie] = useState<Movie | null>(
    null,
  );
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // M3U Import Form States
  const [m3uUrl, setM3uUrl] = useState("");
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
      const stored = localStorage.getItem("denden_recent_history");
      if (stored) {
        try {
          const history = JSON.parse(stored) as {
            id: string;
            type: "channel" | "movie";
          }[];
          const matching = history
            .map((item) => {
              if (item.type === "channel")
                return channels.find((c) => c.id === item.id);
              if (item.type === "movie")
                return movies.find((m) => m.id === item.id);
              return null;
            })
            .filter((item): item is Channel | Movie => !!item);
          setRecentlyWatched(matching);
        } catch (err) {
          console.error("Error parsing recent history:", err);
        }
      }
    } catch (e) {}
  }, [channels, movies]);

  // Set hero channel (last watched channel)
  useEffect(() => {
    if (channels.length > 0) {
      if (recentlyWatched.length > 0) {
        // Find first channel in history for hero
        const firstChannel = recentlyWatched.find(
          (item) => !("videoUrl" in item),
        ) as Channel | undefined;
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
    const lines = text.split("\n");
    const parsed: Partial<Channel>[] = [];
    let current: Partial<Channel> | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("#EXTINF:")) {
        const logoMatch =
          line.match(/tvg-logo="([^"]+)"/) || line.match(/logo="([^"]+)"/);
        const groupMatch =
          line.match(/group-title="([^"]+)"/) ||
          line.match(/category="([^"]+)"/);
        const commaIndex = line.lastIndexOf(",");
        const name =
          commaIndex !== -1
            ? line.substring(commaIndex + 1).trim()
            : "Chaîne sans nom";
        current = {
          name: name || "Chaîne en direct",
          logo: logoMatch
            ? logoMatch[1]
            : "https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120",
          category: groupMatch ? groupMatch[1] : "Généraliste",
        };
      } else if (line && !line.startsWith("#") && current) {
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
        toast.error("Playlist invalide.");
        return;
      }
      const response = await axios.post("/api/channels/bulk", channelsParsed);
      setImportCount(response.data.count);
      setTimeout(() => setImportCount(null), 5000);
    } catch (err) {
      console.error(err);
      toast.error("Erreur importation.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
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
      setM3uUrl("");
    } catch (err) {
      console.error(err);
      toast.error("Erreur URL.");
    } finally {
      setIsImporting(false);
    }
  };

  const getPremiumFallbackProgram = (channelName: string) => {
    const name = (channelName || "").toLowerCase();
    if (name.includes("tf1")) {
      return {
        title: "Star Academy",
        image:
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&h=800",
        progress: 65,
        time: "21:10",
      };
    }
    if (name.includes("france 2")) {
      return {
        title: "Envoyé Spécial",
        image:
          "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=600&h=800",
        progress: 42,
        time: "21:05",
      };
    }
    if (name.includes("france 3")) {
      return {
        title: "Cassandre",
        image:
          "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=600&h=800",
        progress: 78,
        time: "21:10",
      };
    }
    if (name.includes("m6")) {
      return {
        title: "Le Meilleur Pâtissier",
        image:
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&h=800",
        progress: 30,
        time: "21:15",
      };
    }
    if (name.includes("w9")) {
      return {
        title: "Kaamelott",
        image:
          "https://images.unsplash.com/photo-1559650656-5d1d361ad10e?auto=format&fit=crop&w=600&h=800",
        progress: 85,
        time: "20:50",
      };
    }
    if (name.includes("arte")) {
      return {
        title: "Polar Park",
        image:
          "https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?auto=format&fit=crop&w=600&h=800",
        progress: 15,
        time: "20:55",
      };
    }
    if (name.includes("tmc")) {
      return {
        title: "Quotidien",
        image:
          "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&h=800",
        progress: 55,
        time: "19:25",
      };
    }
    return null;
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
        description: "",
      };
    }

    const prem = getPremiumFallbackProgram(channel.name);
    if (prem && !epgData?.current) {
      return {
        title: prem.title,
        type: channel.category || "Divertissement",
        progressPercent: prem.progress,
        startTimeLabel: prem.time,
        endTimeLabel: "",
        nextShow: "Nouveau programme",
        isScraped: true,
        image: prem.image,
        description:
          "Votre émission préférée en direct sur " + channel.name + ".",
      };
    }

    const realEpg = epgData?.current;
    if (realEpg) {
      const start = new Date(realEpg.startTime);
      const end = new Date(realEpg.endTime);
      const nowMs = Date.now();
      const duration = (end.getTime() - start.getTime()) / 60000;
      const elapsed = Math.max(0, (nowMs - start.getTime()) / 60000);
      const progressPercent =
        duration > 0
          ? Math.min(100, Math.max(0, (elapsed / duration) * 100))
          : 50;
      return {
        title: realEpg.title,
        type: realEpg.category || "Généraliste",
        progressPercent,
        startTimeLabel: format(start, "HH:mm"),
        endTimeLabel: format(end, "HH:mm"),
        nextShow: epgData?.next?.title || "Film / Émission",
        isScraped: false,
        image: realEpg.icon || null,
        description: realEpg.description || "",
      };
    }

    const hour = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    let title = "Streaming Direct";
    let type = "Généraliste";
    if ((channel.category || "").toLowerCase().includes("sport")) {
      title = "Compétition Live";
      type = "Sport";
    } else if ((channel.category || "").toLowerCase().includes("ciné")) {
      title = "Film du moment";
      type = "Cinéma";
    }
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
      description: "",
    };
  };

  const fuzzyMatch = (str: string | undefined, query: string) => {
    const s = (str || "").toLowerCase();
    const q = query.toLowerCase();
    let i = 0,
      j = 0;
    while (i < s.length && j < q.length) {
      if (s[i] === q[j]) j++;
      i++;
    }
    return j === q.length;
  };

  const sortedChannels = useMemo(() => {
    return [...channels].sort(
      (a, b) => (a.channelNumber || 9999) - (b.channelNumber || 9999),
    );
  }, [channels]);

  const searchChannels = useMemo(() => {
    if (searchQuery.trim() === "") return [];
    const q = searchQuery.toLowerCase();
    return sortedChannels
      .filter((channel) => {
        if ((channel.name || "").toLowerCase().includes(q)) return true;
        if ((channel.category || "").toLowerCase().includes(q)) return true;
        const prog = getDynamicProgram(channel);
        if ((prog.title || "").toLowerCase().includes(q)) return true;
        return fuzzyMatch(channel.name, q);
      })
      .slice(0, 12);
  }, [searchQuery, sortedChannels]);

  const searchMovies = useMemo(() => {
    if (searchQuery.trim() === "") return [];
    const q = searchQuery.toLowerCase();
    return movies
      .filter((movie) => {
        if ((movie.title || "").toLowerCase().includes(q)) return true;
        if (movie.genres?.some((g) => g.toLowerCase().includes(q))) return true;
        if ((movie.director || "").toLowerCase().includes(q)) return true;
        return fuzzyMatch(movie.title, q);
      })
      .slice(0, 12);
  }, [searchQuery, movies]);

  const isMobile = deviceType === "mobile" || deviceType === "tablet";

  const spotlightMovie = useMemo(() => {
    if (!movies || movies.length === 0) return null;
    const withVisual = movies.filter((m) => m.banner || m.poster);
    const pool = withVisual.length > 0 ? withVisual : movies;
    return [...pool].sort((a, b) => {
      const bScore = b.ratingImdb || 0;
      const aScore = a.ratingImdb || 0;
      return bScore - aScore;
    })[0];
  }, [movies]);

  const spotlightSlides = useMemo(() => {
    const slides: (
      | { type: "channel"; data: Channel }
      | { type: "movie"; data: Movie }
    )[] = [];

    // Slide 1: Primary live channel (last watched or specific TF1/France 2)
    if (channels.length > 0) {
      const firstChannel = recentlyWatched.find(
        (item) => !("videoUrl" in item),
      ) as Channel | undefined;
      
      const famousChannels = ['TF1', 'France 2', 'M6', 'France 3', 'C8'];
      const topChannel = channels.find(c => famousChannels.some(fc => c.name.toLowerCase().includes(fc.toLowerCase())));
      
      slides.push({ type: "channel", data: firstChannel || topChannel || channels[0] });
    }

    // Slide 2: Blockbuster movie
    if (spotlightMovie) {
      slides.push({ type: "movie", data: spotlightMovie });
    }

    // Slide 3: Second popular channel (e.g. France 2 or another channel in the list)
    if (channels.length > 1) {
      const famousChannels = ['France 2', 'M6', 'TF1', 'Arte', 'W9'];
      let secondChannel = channels.find(c => c.id !== slides[0]?.data?.id && famousChannels.some(fc => c.name.toLowerCase().includes(fc.toLowerCase())));
      if (!secondChannel) {
          secondChannel = channels.find((c) => c.id !== slides[0]?.data?.id);
      }
      if (secondChannel) {
        slides.push({ type: "channel", data: secondChannel });
      }
    }

    // Slide 4: Another movie if available
    if (movies.length > 1) {
      const secondMovie = movies.filter((m) => m.id !== spotlightMovie?.id)[0];
      if (secondMovie) {
        slides.push({ type: "movie", data: secondMovie });
      }
    }

    return slides;
  }, [channels, movies, recentlyWatched, spotlightMovie]);

  useEffect(() => {
    if (spotlightSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlideIdx((prev) => (prev + 1) % spotlightSlides.length);
    }, 8000); // 8 seconds per slide
    return () => clearInterval(interval);
  }, [spotlightSlides]);

  if (channels.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full bg-[#0c0c0e] rounded-[32px] border border-white/5 shadow-2xl p-10"
        >
          <div className="flex justify-center mb-10">
            <DendenLogo variant="splash" size={120} animate />
          </div>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-medium text-white tracking-tight">
              Bienvenue sur Denden TV
            </h2>
            <p className="text-white/40 text-sm mt-3">
              Importez vos chaînes pour commencer l'expérience.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center p-8 rounded-[24px] border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group h-64",
                dragActive && "border-white bg-white/10",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".m3u,.m3u8"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileUp
                size={32}
                className="text-white/40 mb-4 group-hover:text-white transition-colors"
              />
              <h3 className="text-white font-medium text-sm">Fichier M3U</h3>
              <p className="text-white/40 text-xs mt-2 text-center">
                Glisser-déposer ou cliquer
              </p>
            </div>
            <div className="flex flex-col justify-center p-8 rounded-[24px] border border-white/5 bg-white/[0.02] h-64">
              <Link size={32} className="text-white/40 mb-4 mx-auto" />
              <form onSubmit={handleUrlImport} className="space-y-4">
                <input
                  type="url"
                  placeholder="Lien M3U..."
                  value={m3uUrl}
                  onChange={(e) => setM3uUrl(e.target.value)}
                  className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-transparent focus:border-white/20 rounded-xl py-3 px-4 text-sm text-white placeholder:text-white/40 focus:outline-none transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full bg-white hover:bg-neutral-200 text-black py-3 rounded-xl font-medium text-sm transition-colors"
                >
                  {isImporting ? (
                    <RefreshCw className="animate-spin mx-auto" size={16} />
                  ) : (
                    "Importer URL"
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const categoriesMap = sortedChannels.reduce(
    (acc, channel) => {
      const rawCat = channel.category || "Généralistes";
      const cat = normalizeCategory(rawCat);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(channel);
      return acc;
    },
    {} as { [key: string]: Channel[] },
  );

  const getCategoryPriority = (name: string) => {
    const n = (name || "").toLowerCase();
    if (n.includes("général")) return 1;
    if (n.includes("ciné") || n.includes("série")) return 2;
    if (n.includes("sport")) return 3;
    if (n.includes("doc")) return 4;
    if (n.includes("jeunesse")) return 5;
    if (n.includes("info")) return 6;
    if (n.includes("divertissement")) return 7;
    if (n.includes("musique")) return 8;
    return 10;
  };

  const getCategoryIcon = (name: string) => {
    const n = (name || "").toLowerCase();
    if (n.includes("général")) return Tv;
    if (n.includes("ciné") || n.includes("série")) return MonitorPlay;
    if (n.includes("sport")) return Trophy;
    if (n.includes("doc")) return Info;
    if (n.includes("jeunesse")) return Sparkles;
    if (n.includes("info")) return Activity;
    if (n.includes("divertissement")) return MonitorPlay;
    if (n.includes("musique")) return Trophy; // Adjust later or add Music icon
    return Heart;
  };

  const sortedCategories = Object.keys(categoriesMap).sort((a, b) => {
    return getCategoryPriority(a) - getCategoryPriority(b);
  });

  const heroProgDetails = heroChannel ? getDynamicProgram(heroChannel) : null;

  return (
    <ErrorBoundary>
      <div
        id="home-container"
        tabIndex={0}
        className={cn(
          "relative space-y-8 pb-32 focus:outline-none",
          isMobile && "pb-36",
        )}
      >
        <header className="flex items-center justify-between bg-transparent py-6 px-4 lg:px-8 gap-6 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-6">
            <DendenLogo variant="compact" size={40} />
          </div>
          {/* INTEGRATED SEARCH BAR */}
          <div className="flex-1 max-w-xl mx-auto hidden md:block">
            <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/40 group-focus-within:text-white transition-colors">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Rechercher une chaîne, un film, une catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-transparent focus:border-white/20 rounded-full py-3.5 pl-14 pr-6 text-sm text-white placeholder:text-white/40 focus:outline-none transition-all"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-5 flex items-center text-white/40 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {deviceType !== "mobile" && !isMobile && (
              <div className="flex items-center gap-4 px-5 py-2.5 bg-white/5 rounded-full text-xs font-medium text-white/60">
                <div className="flex items-center gap-2 text-white">
                  <Tv size={16} className="text-white/50" />
                  <span className="hidden lg:inline">
                    {channels.length} Chaînes
                  </span>
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <div className="flex items-center gap-2 text-white">
                  <Film size={16} className="text-white/50" />
                  <span className="hidden lg:inline">
                    {movies.length} Films
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-full">
              <Clock size={16} className="text-white/50 shrink-0" />
              <span className="text-white font-medium text-sm tracking-tight">
                {format(currentTime, "HH:mm")}
              </span>
            </div>
          </div>
        </header>
        {/* MOBILE SEARCH BAR */}
        <div className="px-4 md:hidden">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/40">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-transparent focus:border-white/20 rounded-full py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none transition-all"
            />
          </div>
        </div>
        {/* PREMIUM CAROUSEL HERO SHOWCASE */}
        {searchQuery.trim() === "" && spotlightSlides.length > 0 && (
          <section className="px-4 lg:px-8">
            <div className="relative overflow-hidden rounded-[32px] bg-[#0c0c0e] min-h-[400px] md:min-h-[500px] flex items-center transition-all duration-700 shadow-2xl border border-white/5">
              {/* Slide content rendering based on activeSlideIdx */}
              {(() => {
                const slide = spotlightSlides[activeSlideIdx];
                if (!slide) return null;

                if (slide.type === "channel") {
                  const channel = slide.data;
                  const prog = getDynamicProgram(channel);
                  return (
                    <div
                      key={`slide-ch-${channel.id}`}
                      className="relative w-full h-full min-h-[400px] md:min-h-[500px] flex flex-col justify-end p-8 md:p-12 lg:p-16 animate-in fade-in duration-700"
                    >
                      {prog.image ? (
                        <>
                          <div className="absolute inset-0 bg-black/60 z-0" />
                          <img
                            src={prog.image}
                            className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity transition-all duration-1000 scale-105"
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/80 to-transparent z-0" />
                          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0e] via-[#0c0c0e]/50 to-transparent z-0" />
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#0c0c0e] z-0" />
                          <div
                            className="absolute inset-0 opacity-20 z-0"
                            style={{
                              backgroundImage:
                                "radial-gradient(circle at 70% 30%, #4a4a8a 0%, transparent 40%)",
                            }}
                          />
                        </>
                      )}

                      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="max-w-3xl space-y-6 flex-1">
                          {/* Pill indicator */}
                          <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-white text-[10px] font-medium tracking-widest uppercase shadow-lg border border-white/5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                              En Direct
                            </div>
                          </div>

                          {/* Main program description block */}
                          <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[1.1] drop-shadow-2xl">
                              {prog.title}
                            </h2>
                            {prog.description && (
                              <p className="text-white/70 text-base md:text-lg line-clamp-2 max-w-2xl leading-relaxed font-medium">
                                {prog.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-white/60 text-sm font-semibold tracking-wide uppercase">
                              <span className="flex items-center gap-1.5">
                                <Clock size={16} className="text-[#00A8E1]" />{" "}
                                {prog.startTimeLabel} —{" "}
                                {prog.endTimeLabel || "Direct"}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-white/30" />
                              <span className="text-[#00A8E1]">
                                {channel.name}
                              </span>
                            </div>

                            <div className="h-1.5 max-w-md bg-white/10 rounded-full overflow-hidden mt-6 shadow-inner">
                              <div
                                className="bg-gradient-to-r from-[#00A8E1] to-blue-400 h-full transition-all duration-500 relative"
                                style={{ width: `${prog.progressPercent}%` }}
                              >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                              </div>
                            </div>
                          </div>

                          {/* Buttons */}
                          <div className="flex gap-4 pt-6">
                            <button
                              onClick={() => onChannelSelect(channel)}
                              className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-bold text-sm rounded-full hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                            >
                              <Play size={20} fill="currentColor" /> Regarder
                            </button>
                            <button
                              onClick={() => onNavigateToSection("guide")}
                              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-bold text-sm rounded-full hover:bg-white/20 backdrop-blur-md transition-all border border-white/10 hover:border-white/20"
                            >
                              <Calendar size={20} /> Guide TV
                            </button>
                          </div>
                        </div>

                        {channel.logo && (
                          <div className="hidden md:block w-48 h-48 rounded-3xl bg-black/40 backdrop-blur-xl p-8 border border-white/10 shadow-2xl shrink-0 flex items-center justify-center transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                            <img
                              src={channel.logo}
                              alt={channel.name}
                              className="w-full h-full object-contain filter drop-shadow-lg"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  const movie = slide.data;
                  return (
                    <div
                      key={`slide-mv-${movie.id}`}
                      className="relative w-full h-full min-h-[400px] md:min-h-[500px] flex flex-col justify-end p-8 md:p-12 lg:p-16 animate-in fade-in duration-700"
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-50 transition-all duration-1000 scale-100 pointer-events-none z-0"
                        style={{
                          backgroundImage: `url(${movie.banner || movie.poster})`,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/80 to-transparent z-0" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0e] via-[#0c0c0e]/50 to-transparent z-0" />

                      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="max-w-3xl space-y-6 flex-1">
                          {/* Pill indicator */}
                          <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-white text-[10px] font-medium tracking-widest uppercase shadow-lg border border-white/5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                              À la demande
                            </div>
                          </div>

                          {/* Movie details */}
                          <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[1.1] drop-shadow-2xl">
                              {movie.title}
                            </h2>
                            <p className="text-white/70 text-base md:text-lg line-clamp-3 max-w-2xl leading-relaxed font-medium">
                              {movie.summary ||
                                "Découvrez notre sélection spéciale VOD. Lancez la lecture instantanée en haute définition (4K / UHD) ou visionnez la bande annonce complète."}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-white/60 tracking-wide uppercase">
                            {movie.ratingImdb && (
                              <span className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                                <Star size={14} fill="currentColor" />{" "}
                                {movie.ratingImdb}
                              </span>
                            )}
                            <span className="px-2.5 py-1 rounded bg-white/10 text-white border border-white/10 shadow-sm">
                              {movie.quality || "4K"}
                            </span>
                            <span>{movie.year}</span>
                            <span className="w-1 h-1 rounded-full bg-white/30" />
                            <span>{movie.duration}</span>
                            <span className="w-1 h-1 rounded-full bg-white/30" />
                            <span className="text-blue-400">
                              {movie.genres
                                ? movie.genres.slice(0, 3).join(", ")
                                : "Cinéma"}
                            </span>
                          </div>

                          {/* Buttons */}
                          <div className="flex gap-4 pt-6">
                            <button
                              onClick={() => onChannelSelect(movie)}
                              className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-bold text-sm rounded-full hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                            >
                              <Play size={20} fill="currentColor" /> Regarder
                            </button>
                            <button
                              onClick={() => setSelectedDetailMovie(movie)}
                              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-bold text-sm rounded-full hover:bg-white/20 backdrop-blur-md transition-all border border-white/10 hover:border-white/20"
                            >
                              <Info size={20} /> Détails
                            </button>
                          </div>
                        </div>

                        {movie.poster && (
                          <div className="hidden md:block w-48 h-72 rounded-xl bg-black/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] shrink-0 overflow-hidden border border-white/10 transform rotate-[2deg] hover:rotate-0 transition-transform duration-500">
                            <img
                              src={movie.poster}
                              alt={movie.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Pagination Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {spotlightSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlideIdx(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    activeSlideIdx === idx
                      ? "bg-white w-8"
                      : "bg-white/20 hover:bg-white/40 w-1.5",
                  )}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </section>
        )}

        {searchQuery.trim() !== "" ? (
          <section className="space-y-10 px-4 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl md:text-3xl font-medium text-white tracking-tight">
                Résultats de la recherche
              </h3>
              <button
                onClick={() => setSearchQuery("")}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium text-sm transition-colors backdrop-blur-md"
              >
                Fermer
              </button>
            </div>

            {searchChannels.length === 0 && searchMovies.length === 0 && (
              <div className="text-center py-20 text-white/50">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p>Aucun résultat pour "{searchQuery}"</p>
              </div>
            )}

            {searchChannels.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white/80">
                  Chaînes et TV en Direct
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {searchChannels.map((channel, i) => (
                    <ChannelCardWrapper
                      key={`${channel.id}-${i}`}
                      channel={channel}
                      onClick={onChannelSelect}
                      onLongPress={onChannelLongPress}
                      className="group relative cursor-pointer flex flex-col rounded-[16px] overflow-hidden transition-all duration-300"
                    >
                      <div
                        className={cn(
                          "aspect-video bg-[#0c0c0e] relative overflow-hidden flex flex-col p-0 shadow-lg",
                          isMobile ? "rounded-[16px]" : "rounded-[20px]",
                        )}
                      >
                        {getDynamicProgram(channel).image ? (
                          <>
                            <img
                              src={getDynamicProgram(channel).image}
                              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.8] group-hover:brightness-100 group-hover:scale-105 transition-all duration-700"
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/40 to-transparent pointer-events-none" />
                            {channel.logo && (
                              <div className="absolute left-3 bottom-3 md:left-4 md:bottom-4 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center z-20 bg-white/10 backdrop-blur-xl rounded-xl p-1.5 shadow-[inset_0_1px_3px_rgba(255,255,255,0.2)]">
                                <img
                                  src={channel.logo}
                                  alt=""
                                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 flex items-center justify-center p-2.5 md:p-3.5 bg-white/5">
                              {channel.logo ? (
                                <img
                                  src={channel.logo}
                                  alt=""
                                  className="w-[60%] h-[60%] object-contain filter group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center opacity-50 group-hover:opacity-80 transition-opacity duration-500">
                                  <Tv size={32} className="text-white/30" />
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 z-20">
                          <div
                            className="bg-white h-full transition-all duration-500"
                            style={{
                              width: `${getDynamicProgram(channel).progressPercent}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="pt-3 px-1 space-y-0.5">
                        <span
                          className={cn(
                            "text-white font-medium truncate tracking-tight transition-colors block",
                            isMobile ? "text-sm" : "text-base",
                          )}
                        >
                          {channel.name}
                        </span>
                        <span className="text-white/50 text-xs truncate block">
                          {getDynamicProgram(channel).title}
                        </span>
                      </div>
                    </ChannelCardWrapper>
                  ))}
                </div>
              </div>
            )}

            {searchMovies.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white/80">
                  Films (VOD)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {searchMovies.map((movie, idx) => (
                    <motion.div
                      key={`search-movie-${movie.id}-${idx}`}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDetailMovie(movie)}
                      className="relative rounded-[16px] overflow-hidden cursor-pointer shadow-xl bg-[#0c0c0e] group aspect-[2/3]"
                    >
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-100 brightness-[0.8]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/40 to-transparent pointer-events-none" />

                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {movie.isNew && (
                          <span className="bg-white text-black text-[10px] font-medium px-2 py-0.5 rounded shadow-lg uppercase tracking-widest">
                            Nouveau
                          </span>
                        )}
                        <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-lg uppercase tracking-widest w-fit border border-white/10">
                          {movie.quality}
                        </span>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <h4 className="text-white font-medium text-sm line-clamp-1 group-hover:text-white/80 transition-colors tracking-tight leading-none">
                          {movie.title}
                        </h4>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-white/50">
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star size={10} className="fill-current" />
                            <span className="text-xs font-medium text-white">
                              {movie.ratingImdb || "8.2"}
                            </span>
                          </div>
                          <span className="text-xs font-medium">
                            {movie.year}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* REPRENDRE LA LECTURE SECTION */}
            {Object.keys(continueWatching).length > 0 && (
              <section className="space-y-6 px-4 lg:px-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <Play size={14} fill="currentColor" className="ml-0.5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight leading-none">
                      Reprendre la lecture
                    </h3>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide scroll-smooth">
                  {Object.entries(continueWatching).map(
                    ([id, progressPercent]) => {
                      const movie = movies.find((m) => m.id === id);
                      if (!movie) return null;

                      // Calculate mock duration or use real metadata
                      const durationMins = movie.duration
                        ? parseInt(movie.duration) || 120
                        : 120;
                      const elapsedMins = Math.round(
                        (progressPercent / 100) * durationMins,
                      );
                      const remainingMins = Math.max(
                        1,
                        durationMins - elapsedMins,
                      );

                      return (
                        <motion.div
                          key={`cw-${id}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onChannelSelect(movie)}
                          className="snap-start shrink-0 group relative cursor-pointer flex flex-col w-[240px] md:w-[280px] transition-all duration-300"
                        >
                          <div className="bg-[#111] relative overflow-hidden flex items-center justify-center aspect-video rounded-[16px]">
                            <img
                              src={
                                movie.banner ||
                                movie.poster ||
                                "https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?auto=format&fit=crop&w=300&h=170"
                              }
                              alt=""
                              className="h-full w-full object-cover filter brightness-[0.8] group-hover:brightness-100 transition-all duration-700"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                            <div className="absolute left-3 bottom-3 text-xs font-medium text-white/90 drop-shadow-md">
                              Reste {remainingMins} min
                            </div>

                            {/* Play button overlay on hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                <Play
                                  size={20}
                                  fill="currentColor"
                                  className="ml-0.5"
                                />
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                              <div
                                className="bg-white h-full"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Movie Title */}
                          <div className="pt-3 px-1 space-y-0.5">
                            <span className="text-white font-medium truncate text-sm block group-hover:text-white/80 transition-colors">
                              {movie.title}
                            </span>
                            <span className="text-white/50 text-xs block">
                              {movie.genres
                                ? movie.genres.slice(0, 2).join(", ")
                                : "VOD"}
                            </span>
                          </div>
                        </motion.div>
                      );
                    },
                  )}
                </div>
              </section>
            )}

            {/* HISTORIQUE SECTION */}
            {recentlyWatched.length > 0 && (
              <section className="space-y-6 px-4 lg:px-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <History size={14} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight leading-none">
                      Vus récemment
                    </h3>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide scroll-smooth">
                  {recentlyWatched.slice(0, 15).map((item, idx) => {
                    const isMovie = "videoUrl" in item;
                    const channel = !isMovie ? (item as Channel) : null;
                    const movie = isMovie ? (item as Movie) : null;
                    const prog = channel ? getDynamicProgram(channel) : null;

                    return (
                      <ChannelCardWrapper
                        key={`recent-${item.id}-${idx}`}
                        channel={channel || ({} as any)}
                        onClick={() => onChannelSelect(item)}
                        className={cn(
                          "snap-start shrink-0 group relative cursor-pointer flex flex-col transition-all duration-300",
                          isMobile ? "w-[150px]" : "w-[200px]",
                        )}
                      >
                        <div
                          className={cn(
                            "bg-[#111] relative overflow-hidden flex items-center justify-center rounded-[16px]",
                            isMobile ? "h-24 md:h-28" : "aspect-video",
                          )}
                        >
                          {isMovie ? (
                            <img
                              src={movie?.banner || movie?.poster}
                              alt=""
                              className="h-full w-full object-cover filter brightness-[0.8] group-hover:brightness-100 transition-all duration-700"
                              referrerPolicy="no-referrer"
                            />
                          ) : prog?.image ? (
                            <>
                              <img
                                src={prog.image}
                                className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] group-hover:brightness-[0.8] transition-all duration-700"
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                              {channel?.logo && (
                                <div className="absolute left-3 bottom-3 w-10 h-10 bg-black/60 backdrop-blur-md rounded-lg p-1.5">
                                  <img
                                    src={channel.logo}
                                    alt=""
                                    className="w-full h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-3">
                              {channel?.logo ? (
                                <img
                                  src={channel.logo}
                                  alt=""
                                  className="h-16 w-16 object-contain opacity-80 group-hover:opacity-100 transition-all duration-500"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Tv size={24} className="text-white/20" />
                              )}
                            </div>
                          )}
                          {!isMovie && (
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${prog?.progressPercent}%` }}
                                className="bg-white h-full transition-all duration-700"
                              />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                              <Play
                                size={16}
                                className="text-white fill-white ml-0.5"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="pt-3 px-1">
                          <span className="text-white font-medium truncate text-sm block group-hover:text-white/80 transition-colors">
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
            <section className="space-y-6 pt-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4 lg:px-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                    <Activity size={14} />
                  </div>
                  <h3 className="text-lg font-medium text-white tracking-tight leading-none">
                    En Direct
                  </h3>
                </div>

                {/* ANIMATED MODE TOGGLE SWITCH (Categories vs Grid) */}
                <div className="flex items-center gap-4">
                  <div className="flex bg-white/5 p-1 rounded-full text-xs font-medium">
                    <button
                      onClick={() => setViewMode("categories")}
                      className={cn(
                        "px-4 py-1.5 rounded-full transition-colors",
                        viewMode === "categories"
                          ? "bg-white text-black"
                          : "text-white/60 hover:text-white",
                      )}
                    >
                      Catégories
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "px-4 py-1.5 rounded-full transition-colors",
                        viewMode === "grid"
                          ? "bg-white text-black"
                          : "text-white/60 hover:text-white",
                      )}
                    >
                      Grille
                    </button>
                  </div>

                  <button
                    onClick={() => onNavigateToSection("channels")}
                    className={cn(
                      "bg-white/5 hover:bg-white/10 text-sm text-white flex items-center gap-2 font-medium rounded-full transition-colors py-1.5 px-4",
                      isMobile ? "hidden" : "flex",
                    )}
                  >
                    Toutes <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {viewMode === "categories" ? (
                  /* CATEGORIZED ROW VIEW */
                  <motion.div
                    key="categories-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-10 lg:space-y-12"
                  >
                    {sortedCategories.map((categoryName) => {
                      const categoryChannels =
                        categoriesMap[categoryName] || [];
                      if (categoryChannels.length === 0) return null;
                      const IconComp = getCategoryIcon(categoryName);

                      return (
                        <div
                          key={categoryName}
                          className="space-y-4 px-4 lg:px-8"
                        >
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-medium text-white flex items-center gap-2">
                              {categoryName}
                              <span className="text-xs text-white/40">
                                {categoryChannels.length}
                              </span>
                            </h4>
                          </div>

                          {/* Swipe Container */}
                          <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-6 pt-1 snap-x scrollbar-hide scroll-smooth">
                            {categoryChannels
                              .slice(0, 24)
                              .map((channel, idx) => {
                                const prog = getDynamicProgram(channel);
                                return (
                                  <ChannelCardWrapper
                                    key={`cat-card-${categoryName}-${channel.id}-${idx}`}
                                    channel={channel}
                                    onClick={onChannelSelect}
                                    onLongPress={onChannelLongPress}
                                    className={cn(
                                      "snap-start shrink-0 group relative cursor-pointer flex flex-col transition-all duration-300",
                                      isMobile ? "w-[140px]" : "w-[200px]",
                                    )}
                                  >
                                    <div className="bg-[#0c0c0e] relative overflow-hidden flex items-center justify-center aspect-[4/5] rounded-[16px] w-full">
                                      {prog.image ? (
                                        <>
                                          <img
                                            src={prog.image}
                                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.8] group-hover:brightness-[0.95] group-hover:scale-105 transition-all duration-700"
                                            alt=""
                                            referrerPolicy="no-referrer"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/40 to-transparent pointer-events-none" />
                                        </>
                                      ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 bg-white/5">
                                          {channel.logo ? (
                                            <img
                                              src={channel.logo}
                                              alt=""
                                              className="max-h-[50%] max-w-[75%] object-contain filter group-hover:scale-110 opacity-80 group-hover:opacity-100 transition-all duration-500"
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <Tv
                                              size={32}
                                              className="text-white/20"
                                            />
                                          )}
                                        </div>
                                      )}

                                      {/* Channel Logo overlay at the bottom right */}
                                      {channel.logo && (
                                        <div className="absolute right-3 bottom-3 w-10 h-10 flex items-center justify-center z-20 bg-white/10 backdrop-blur-xl rounded-xl p-1.5 shadow-[inset_0_1px_3px_rgba(255,255,255,0.2)]">
                                          <img
                                            src={channel.logo}
                                            alt=""
                                            className="max-h-full max-w-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                      )}

                                      {/* Red live EPG badge on top left */}
                                      <div className="absolute left-3 top-3 bg-red-500 text-[10px] font-medium px-2 py-0.5 rounded text-white shadow-sm">
                                        Direct
                                      </div>

                                      {/* Hover Play icon overlay */}
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 pointer-events-none">
                                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                          <Play
                                            size={18}
                                            fill="currentColor"
                                            className="ml-0.5"
                                          />
                                        </div>
                                      </div>

                                      {/* EPG Progress Bar overlayed at the absolute bottom of the vertical card */}
                                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 z-20 overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{
                                            width: `${prog.progressPercent}%`,
                                          }}
                                          className="bg-red-500 h-full transition-all duration-700"
                                        />
                                      </div>
                                    </div>

                                    {/* Text information under the poster */}
                                    <div className="pt-3 px-1 space-y-0.5">
                                      <h5 className="text-white font-medium truncate text-sm block transition-colors">
                                        {channel.name}
                                      </h5>
                                      <p className="text-white/50 text-xs truncate">
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
                  </motion.div>
                ) : (
                  /* RAW FLAT GRID VIEW */
                  <motion.div
                    key="grid-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      "grid gap-6 px-4 lg:px-8",
                      isMobile
                        ? "grid-cols-2"
                        : "grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
                    )}
                  >
                    {sortedChannels.slice(0, 24).map((channel, i) => {
                      const prog = getDynamicProgram(channel);
                      return (
                        <ChannelCardWrapper
                          key={`live-main-${channel.id}-${i}`}
                          channel={channel}
                          onClick={onChannelSelect}
                          onLongPress={onChannelLongPress}
                          className={cn(
                            "group relative cursor-pointer flex flex-col transition-all duration-300",
                          )}
                        >
                          <div
                            className={cn(
                              "aspect-video bg-[#0c0c0e] relative overflow-hidden flex flex-col p-0 rounded-[16px]",
                            )}
                          >
                            {prog.image ? (
                              <>
                                <img
                                  src={prog.image}
                                  className="absolute inset-0 w-full h-full object-cover filter brightness-[0.8] group-hover:brightness-100 group-hover:scale-105 transition-all duration-700"
                                  alt=""
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e]/80 via-[#0c0c0e]/20 to-transparent pointer-events-none" />
                                {channel.logo && (
                                  <div className="absolute left-3 bottom-3 w-10 h-10 flex items-center justify-center z-20 bg-white/10 backdrop-blur-xl rounded-xl p-1.5 shadow-[inset_0_1px_3px_rgba(255,255,255,0.2)]">
                                    <img
                                      src={channel.logo}
                                      alt=""
                                      className="max-h-full max-w-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center p-3 bg-white/5">
                                {channel.logo ? (
                                  <img
                                    src={channel.logo}
                                    alt=""
                                    className="max-h-[70%] max-w-[70%] object-contain filter group-hover:scale-110 transition-all duration-500 opacity-80 group-hover:opacity-100"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <Tv size={32} className="text-white/20" />
                                )}
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 pointer-events-none">
                              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                <Play
                                  size={20}
                                  fill="currentColor"
                                  className="ml-0.5"
                                />
                              </div>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 z-20 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${prog.progressPercent}%` }}
                                className="bg-white h-full transition-all duration-700"
                              />
                            </div>
                          </div>
                          <div className="pt-3 px-1 space-y-1">
                            <span
                              className={cn(
                                "text-white font-medium truncate tracking-tight transition-colors block leading-none",
                                isMobile ? "text-sm" : "text-base",
                              )}
                            >
                              {channel.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                              <p className="text-white/50 text-xs truncate leading-none">
                                {prog.title}
                              </p>
                            </div>
                          </div>
                        </ChannelCardWrapper>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* MOVIES / CINÉMA VOD SECTION */}
            {movies && movies.length > 0 && (
              <section className="space-y-6 pt-6 mb-12">
                <div className="flex items-center justify-between px-4 lg:px-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500">
                      <Film size={14} />
                    </div>
                    <h3 className="text-lg font-medium text-white tracking-tight leading-none">
                      Cinéma (VOD)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateToSection("movies")}
                      className="bg-white/5 hover:bg-white/10 text-sm text-white flex items-center gap-2 font-medium rounded-full transition-colors py-1.5 px-4"
                    >
                      Catalogue <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Movies Swiper Carousel */}
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide scroll-smooth px-4 lg:px-8">
                  {movies.slice(0, 15).map((movie, idx) => (
                    <motion.div
                      key={`home-movie-${movie.id}-${idx}`}
                      onClick={() => setSelectedDetailMovie(movie)}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "snap-start shrink-0 relative rounded-[16px] overflow-hidden cursor-pointer shadow-xl border border-white/5 bg-[#0c0c0e] group",
                        isMobile ? "w-[150px]" : "w-[200px]",
                      )}
                    >
                      <div className="relative aspect-[2/3] overflow-hidden">
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-100 brightness-[0.8]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/20 to-transparent pointer-events-none" />

                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {movie.isNew && (
                            <span className="bg-white text-black text-[10px] font-medium px-2 py-0.5 rounded shadow-lg uppercase tracking-widest">
                              Nouveau
                            </span>
                          )}
                          <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-lg uppercase tracking-widest w-fit border border-white/10">
                            {movie.quality}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 px-3 pb-3">
                        <h4 className="text-white font-medium text-sm line-clamp-1 group-hover:text-white/80 transition-colors tracking-tight leading-none">
                          {movie.title}
                        </h4>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-white/50">
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star size={10} className="fill-current" />
                            <span className="text-xs font-medium text-white">
                              {movie.ratingImdb || "8.2"}
                            </span>
                          </div>
                          <span className="text-xs font-medium">
                            {movie.year}
                          </span>
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
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-4xl bg-[#0c0c0e] rounded-[24px] overflow-hidden shadow-2xl z-20 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden"
              >
                <div className="relative h-[300px] sm:h-[400px] w-full">
                  <img
                    src={
                      selectedDetailMovie.banner || selectedDetailMovie.poster
                    }
                    alt={selectedDetailMovie.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/60 to-transparent" />

                  <button
                    onClick={() => setSelectedDetailMovie(null)}
                    className="absolute top-6 right-6 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors backdrop-blur-md"
                  >
                    <X size={20} />
                  </button>

                  <div className="absolute bottom-0 left-0 p-8 sm:p-12 w-full">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-white/70 mb-4">
                      <span className="text-yellow-500 flex items-center gap-1.5">
                        <Star size={14} className="fill-current" />{" "}
                        {selectedDetailMovie.ratingImdb || "N/A"} IMDb
                      </span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>{selectedDetailMovie.year}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>{selectedDetailMovie.duration || "N/A"}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white">
                        {selectedDetailMovie.quality}
                      </span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium text-white tracking-tight leading-tight drop-shadow-lg">
                      {selectedDetailMovie.title}
                    </h2>
                  </div>
                </div>

                <div className="p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <BookOpen size={18} className="text-white/40" />{" "}
                        Synopsis
                      </h3>
                      <p className="text-white/60 text-base leading-relaxed">
                        {selectedDetailMovie.summary ||
                          "Aucun synopsis disponible."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-white/5 rounded-2xl p-6 text-sm">
                      <div>
                        <span className="text-white/40 block mb-1 text-xs">
                          Réalisateur
                        </span>
                        <span className="font-medium text-white">
                          {selectedDetailMovie.director || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block mb-1 text-xs">
                          Pays
                        </span>
                        <span className="font-medium text-white">
                          {selectedDetailMovie.country || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block mb-1 text-xs">
                          Langue
                        </span>
                        <span className="font-medium text-white flex items-center gap-1.5">
                          <Globe size={14} className="text-white/40" />
                          {selectedDetailMovie.language || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block mb-1 text-xs">
                          Genre
                        </span>
                        <span className="font-medium text-white">
                          {selectedDetailMovie.genres
                            ? selectedDetailMovie.genres[0]
                            : "VOD"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <button
                        onClick={() => {
                          onChannelSelect(selectedDetailMovie);
                          setSelectedDetailMovie(null);
                        }}
                        className="w-full py-4 bg-white hover:bg-neutral-200 text-black font-medium rounded-full transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Play size={18} fill="currentColor" /> Regarder le film
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
