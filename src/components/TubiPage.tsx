import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useDeferredValue,
} from "react";
import Hls from "hls.js";
import { TUBI_CHANNELS } from "../tubiChannels";
import { Channel } from "../types";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Search,
  ArrowLeft,
  Tv,
  Loader2,
  Sliders,
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  onChannelSelect: (channel: Channel) => void;
  onBack: () => void;
  deviceType: "mobile" | "desktop" | "tablet";
}

export default function TubiPage({
  onChannelSelect,
  onBack,
  deviceType,
}: Props) {
  const [channels] = useState<Channel[]>(TUBI_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(
    TUBI_CHANNELS[0] || null,
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [itemsToShow, setItemsToShow] = useState(20);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.8);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setItemsToShow(20);
  }, [deferredSearchQuery, selectedCategory]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for the splash screen
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const getPlayableUrl = (url: string) => {
    if (!url) return "";
    return `/api/proxy/stream?url=${encodeURIComponent(url)}&referer=${encodeURIComponent("https://tubi.tv/")}`;
  };

  useEffect(() => {
    let isMounted = true;
    const video = videoRef.current;
    if (!video || !selectedChannel) return;

    const streamUrl = getPlayableUrl(selectedChannel.url);
    setIsVideoLoading(true);

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        manifestLoadingTimeOut: 15000,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 20000,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isMounted) setIsVideoLoading(false);
        if (isPlaying) {
          video.play().catch(() => {
            setIsMuted(true);
            video.muted = true;
            video.play().catch((err) => console.log("Autoplay failed:", err));
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
      return () => {
        isMounted = false;
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        if (isMounted) setIsVideoLoading(false);
        if (isPlaying) video.play().catch(() => {});
      });
    }
  }, [selectedChannel]);

  const categories = useMemo(() => {
    const cats = new Set(channels.map((c) => c.category || "Autres"));
    return ["Tous", ...Array.from(cats).sort()];
  }, [channels]);

  const allFilteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      const matchesCategory =
        selectedCategory === "Tous" ||
        (channel.category || "Autres").includes(selectedCategory);
      const matchesSearch = channel.name
        .toLowerCase()
        .includes(deferredSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [channels, selectedCategory, deferredSearchQuery]);

  const filteredChannels = useMemo(() => {
    return allFilteredChannels.slice(0, itemsToShow);
  }, [allFilteredChannels, itemsToShow]);

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col relative overflow-hidden font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[900px] h-[900px] bg-sky-600/10 rounded-full blur-[180px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#000] z-[99] flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-t-sky-500 border-r-blue-500 border-b-sky-300 border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-xl italic tracking-tighter text-white">T</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-widest italic">
                TUBI <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">TV</span>
              </h2>
              <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Chargement du catalogue...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 py-4 px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            onClick={onBack}
            className="group p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all active:scale-95"
          >
            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black tracking-[-0.05em] italic uppercase leading-none">
              TUBI <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 drop-shadow-md">TV</span>
            </h1>
            <div className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px] font-black tracking-widest text-sky-400 uppercase">
              Free Live TV
            </div>
          </div>
        </div>

        <div className="relative w-full sm:w-64 md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={16} />
          <input
            type="text"
            placeholder="Rechercher une chaîne..."
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
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest shrink-0 transition-all border cursor-pointer",
                  selectedCategory === cat 
                    ? "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/10" 
                    : "bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* LIST OF ITEMS */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
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
                  >
                    <div className="w-20 h-20 bg-black/40 rounded-2xl p-3 flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-105 transition-transform">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-full h-full object-contain"
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
            {allFilteredChannels.length > itemsToShow && (
              <div className="flex justify-center p-4 pt-8">
                <button
                  onClick={() => setItemsToShow((prev) => prev + 20)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Charger plus
                </button>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: PREVIEW PLAYER & INFO SHEET */}
        <section className="w-full lg:w-[450px] xl:w-[500px] shrink-0 bg-[#0c0c0c] border-b lg:border-b-0 border-white/5 flex flex-col overflow-y-auto order-first lg:order-last h-auto max-h-[45vh] lg:max-h-none lg:h-full">
          {selectedChannel && (
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
                      <span className="absolute text-[10px] font-black italic text-sky-400">T</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 animate-pulse">
                      Connexion au Flux...
                    </span>
                  </div>
                )}
                
                {/* Minimal controls overlay */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur z-20"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
              </div>

              {/* CHANNEL INFO PANEL */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-start">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 bg-[#111] border border-white/5 rounded-xl p-2 shrink-0 shadow-lg">
                    {selectedChannel.logo ? (
                      <img src={selectedChannel.logo} className="w-full h-full object-contain" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Tv className="text-white/20" /></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mb-2 inline-block">
                      {selectedChannel.category || 'Tubi TV'}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-2">
                      {selectedChannel.name}
                    </h2>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => onChannelSelect(selectedChannel)}
                    className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-sky-600/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                  >
                    <Maximize2 size={16} /> Lancer le Direct
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
