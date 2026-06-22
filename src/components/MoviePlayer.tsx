import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Maximize, MonitorPlay as Pip, Info, Settings,
  Volume2, VolumeX, X, SkipBack, SkipForward, Star, 
  Clock, Activity, ChevronRight, Sliders, Layout, RefreshCw, AlertTriangle, Loader2, Film,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Movie } from '../types';
import { useDeviceType } from '../hooks/useDeviceType';

interface MoviePlayerProps {
  movie: Movie | null;
  onClose?: () => void;
  fullScreen?: boolean;
  onProgressUpdate?: (movieId: string, minutes: number) => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export default function MoviePlayer({ 
  movie, 
  onClose, 
  fullScreen = true,
  onProgressUpdate,
  onMinimize,
  onMaximize
}: MoviePlayerProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile' || deviceType === 'tablet';
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Player control states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [playError, setPlayError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timeline states
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timelinePercent, setTimelinePercent] = useState(0);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);

  // Advanced settings states
  const [playbackRate, setPlaybackRate] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<'fit' | 'fill' | 'stretch' | 'zoom'>('fit');
  const [quality, setQuality] = useState('Auto');
  const [hlsLevels, setHlsLevels] = useState<{ id: number, height: number, bitrate: number }[]>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1); // -1 for Auto
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);

  // Seek visual feedback (e.g. +10s / -10s)
  const [seekFeedback, setSeekFeedback] = useState<string | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const seekFeedbackTimeout = useRef<NodeJS.Timeout | null>(null);

  // Picture in Picture
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);

  useEffect(() => {
    setIsPipSupported(
      typeof document !== 'undefined' && 
      'pictureInPictureEnabled' in document && 
      document.pictureInPictureEnabled
    );
  }, []);

  const fullScreenRef = useRef(fullScreen);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    fullScreenRef.current = fullScreen;
    onCloseRef.current = onClose;
  }, [fullScreen, onClose]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPip = () => setIsPipActive(true);
    const handleLeavePip = () => {
      setIsPipActive(false);
      // If PiP closes while we are minified/not fullscreen, handle it
      if (!fullScreenRef.current) {
        if (video.paused && onCloseRef.current) {
          onCloseRef.current();
        } else if (!video.paused && onMaximize) {
          onMaximize();
        }
      }
    };

    video.addEventListener('enterpictureinpicture', handleEnterPip);
    video.addEventListener('leavepictureinpicture', handleLeavePip);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPip);
      video.removeEventListener('leavepictureinpicture', handleLeavePip);
    };
  }, [onMaximize]);

  // Format time (HH:MM:SS)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (num: number) => String(num).padStart(2, "0");

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const getPlayableUrl = useCallback((url: string) => {
    if (!url) return '';
    if (url.startsWith('blob:')) return url;
    const isExternal = url.startsWith('http') && !url.includes(window.location.host);
    if (isExternal) {
      if (url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('m3u8')) {
        return `/api/proxy/stream?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(new URL(url).origin + '/')}`;
      }
      return `/api/proxy/video?url=${encodeURIComponent(url)}`;
    }
    return url;
  }, []);

  // Initialize stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movie) return;

    setIsLoading(true);
    setShowSkeleton(true);
    setPlayError(null);
    setIsPlaying(true);
    setCurrentTime(0);
    setTimelinePercent(0);

    const activeUrl = movie.videoUrl;
    const playableUrl = getPlayableUrl(activeUrl);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (activeUrl.includes('.m3u8') || activeUrl.includes('m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxMaxBufferLength: 15,
          enableWorker: true,
          lowLatencyMode: true
        });
        hlsRef.current = hls;
        hls.loadSource(playableUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          setHlsLevels(data.levels.map((l, idx) => ({ id: idx, height: l.height, bitrate: l.bitrate })));
          video.play().catch(() => setIsPlaying(false));
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          setCurrentQualityIndex(hls.autoLevelEnabled ? -1 : data.level);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.error('Fatal HLS error playing movie:', data.type);
            setPlayError("La lecture du flux vidéo (m3u8) a échoué. Le lien est peut-être expiré ou restreint.");
            setIsLoading(false);
            setShowSkeleton(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = playableUrl;
        video.play().catch(() => setIsPlaying(false));
      }
    } else {
      video.src = playableUrl;
      video.load();
      video.play().catch(() => setIsPlaying(false));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [movie, getPlayableUrl]);

  // Keep screen loaded handles
  const handleVideoReady = () => {
    setIsLoading(false);
    setPlayError(null);
    setTimeout(() => {
      setShowSkeleton(false);
      setTimeout(() => setShowControls(true), 200);
    }, 450);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isDraggingTimeline) return;
    setCurrentTime(video.currentTime);
    if (video.duration) {
      setDuration(video.duration);
      setTimelinePercent((video.currentTime / video.duration) * 100);
      
      // Every minute, update parent with progress
      if (movie && onProgressUpdate && Math.floor(video.currentTime) % 60 === 0 && Math.floor(video.currentTime) > 0) {
        onProgressUpdate(movie.id, Math.floor(video.currentTime / 60));
      }
    }
  };

  const handleDurationChange = () => {
    if (videoRef.current?.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimelineChange = (pct: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    setTimelinePercent(pct);
    setCurrentTime((pct / 100) * duration);
  };

  const handleTimelineSeekEnd = (pct: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = (pct / 100) * duration;
    setIsDraggingTimeline(false);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is writing in inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          triggerControlVisibility();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          jump(-10);
          triggerControlVisibility();
          break;
        case 'ArrowRight':
          e.preventDefault();
          jump(10);
          triggerControlVisibility();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => {
            const v = Math.min(1, prev + 0.1);
            if (videoRef.current) videoRef.current.volume = v;
            return v;
          });
          triggerControlVisibility();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => {
            const v = Math.max(0, prev - 0.1);
            if (videoRef.current) videoRef.current.volume = v;
            return v;
          });
          triggerControlVisibility();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullScreen();
          break;
        case 'Escape':
          if (showSettingsMenu) {
            setShowSettingsMenu(false);
          } else if (showInfoOverlay) {
            setShowInfoOverlay(false);
          } else if (onClose) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, showSettingsMenu, showInfoOverlay]);

  // Mouse move handles controls visibility timeout
  const handleMouseMove = () => {
    triggerControlVisibility();
  };

  const triggerControlVisibility = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu && !showInfoOverlay && !isDraggingTimeline) {
        setShowControls(false);
      }
    }, 4000);
  };

  useEffect(() => {
    triggerControlVisibility();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showSettingsMenu, showInfoOverlay, isDraggingTimeline]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const jump = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    
    if (seekFeedbackTimeout.current) clearTimeout(seekFeedbackTimeout.current);
    setSeekFeedback(seconds > 0 ? `+${seconds}s ⟩⟩` : `⟨⟨ ${seconds}s`);
    seekFeedbackTimeout.current = setTimeout(() => {
      setSeekFeedback(null);
    }, 850);
  };

  const toggleFullScreen = async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).mozFullScreenElement && !(document as any).msFullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).mozRequestFullScreen) {
          (containerRef.current as any).mozRequestFullScreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          (containerRef.current as any).msRequestFullscreen();
        } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
        else if ((document as any).mozCancelFullScreen) (document as any).mozCancelFullScreen();
        else if ((document as any).msExitFullscreen) (document as any).msExitFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen toggle failed", e);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMute = !isMuted;
    video.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleVolumeChange = (val: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    if (val > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    } else if (val === 0 && !isMuted) {
      video.muted = true;
      setIsMuted(true);
    }
  };

  // Double tap for jump on mobile devices
  const lastTapRef = useRef<{time: number; side: 'left' | 'right' | null}>({time: 0, side: null});
  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    const touch = e.touches[0];
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = touch.clientX - rect.left;
    const isRightSide = clickX > rect.width / 2;
    const side = isRightSide ? 'right' : 'left';

    const GAP = 300;
    if (now - lastTapRef.current.time < GAP && lastTapRef.current.side === side) {
      // Double tap detected
      e.preventDefault();
      if (side === 'right') {
        jump(10);
      } else {
        jump(-10);
      }
      lastTapRef.current = { time: 0, side: null }; // reset
    } else {
      lastTapRef.current = { time: now, side };
    }
  };

  const togglePipMode = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        // The event listener will handle the rest
      } else {
        await video.requestPictureInPicture();
        if (onMinimize) {
          onMinimize();
        }
      }
    } catch (err) {
      console.error('PiP toggling error', err);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const changeQuality = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQualityIndex(index);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden font-sans select-none"
    >
      {/* 1. Real Cinematic HTML5 Video Element */}
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        className={cn(
          "max-w-full transition-all duration-300 pointer-events-none rounded-none aspect-video bg-black",
          aspectRatio === 'fit' && "object-contain w-full h-full",
          aspectRatio === 'fill' && "object-cover w-full h-full",
          aspectRatio === 'stretch' && "object-fill w-full h-full",
          aspectRatio === 'zoom' && "scale-125 object-cover w-full h-full"
        )}
        onWaiting={() => setIsLoading(true)}
        onPlaying={handleVideoReady}
        onLoadedData={handleVideoReady}
        onCanPlay={handleVideoReady}
        onPlay={() => { setIsPlaying(true); handleVideoReady(); }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onError={(e) => { 
          console.error("Movie HTML5 Video Error"); 
          setIsLoading(false); 
          setShowSkeleton(false); 
          setPlayError("Le fichier vidéo est introuvable ou son hébergement temporaire a expiré (Code 403 / CORS de l'hébergeur). L'administrateur de l'application doit mettre à jour le lien de lecture."); 
        }}
        playsInline
        muted={isMuted}
      />

      {/* 2. Ambient background blur glowing reflecting the movie colors */}
      <div className="absolute inset-0 bg-[#0c0c0ced]/30 pointer-events-none" />

      {/* Click layer to play/pause */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={togglePlay}
      />

      {/* 3. High Fidelity Loader / Spinner overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-none z-30 backdrop-blur-md select-none"
          >
            {/* Soft Ambient Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-[#00A8E1]/5 blur-[125px] animate-pulse" />
            </div>

            <div className="relative flex flex-col items-center justify-center p-6 max-w-sm text-center z-10">
              <div className="relative w-28 h-28 flex items-center justify-center mb-5">
                
                {/* Rotating Outer Ring (Cyan Glow) */}
                <svg className="absolute w-full h-full animate-[spin_5s_linear_infinite]" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="46" 
                    stroke="url(#movieCyanGlow)" 
                    strokeWidth="2.5" 
                    fill="transparent" 
                    strokeDasharray="180 80" 
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="movieCyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00A8E1" stopOpacity="1" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Rotating Inner Ring */}
                <svg className="absolute w-[80%] h-[80%] animate-[spin_2s_linear_infinite_reverse]" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    stroke="url(#movieRoseGlow)" 
                    strokeWidth="1.5" 
                    fill="transparent" 
                    strokeDasharray="120 100" 
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="movieRoseGlow" x1="100%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Film Icon Centerpiece */}
                <div className="absolute inset-4 rounded-full bg-[#0d1525]/90 border border-white/10 flex items-center justify-center p-3 shadow-2xl backdrop-blur-md">
                  <Film size={24} className="text-[#00A8E1] animate-pulse" />
                </div>
              </div>

              {/* Status Info */}
              <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-1">
                MEMOIRE TAMPON EN COURS
              </h4>
              
              {movie && (
                <div className="flex items-center gap-2 justify-center max-w-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A8E1] animate-ping shrink-0" />
                  <span className="text-xs font-mono font-black text-[#00A8E1] uppercase tracking-wider truncate">
                    {movie.title}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-1.5 mt-4 text-[10px] text-white/50 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <Loader2 size={10} className="animate-spin text-[#00A8E1]" />
                <span className="font-mono">Initialisation audio et vidéo...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Instant Skip Duration overlay */}
      <div 
        className="absolute inset-0 z-20 flex"
        onClick={(e) => {
          const now = Date.now();
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const isLeft = x < rect.width / 3;
          const isRight = x > (rect.width * 2) / 3;

          if (now - lastTapTime < 300) {
            if (isLeft) {
              jump(-10);
            } else if (isRight) {
              jump(10);
            }
          } else {
            setShowControls(!showControls);
          }
          setLastTapTime(now);
        }}
      />
      
      <AnimatePresence>
        {seekFeedback && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-transparent z-[60] pointer-events-none"
          >
            <div className="bg-red-650/90 backdrop-blur-xl px-10 py-6 rounded-[34px] border border-white/20 shadow-[0_0_50px_rgba(229,9,20,0.5)]">
              <span className="font-mono text-xl sm:text-3xl font-black text-white tracking-widest">
                {seekFeedback}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Skeleton Fadein placeholder */}
      {showSkeleton && movie && (
        <div className="absolute inset-0 bg-[#080808] flex items-center justify-center z-40">
          <div className="w-full h-full relative">
            <img src={movie.banner || movie.poster} className="w-full h-full object-cover blur-2xl opacity-30" alt="" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center max-w-lg mx-auto text-center p-6 space-y-4">
              <span className="text-[10px] font-black tracking-widest text-red-500 bg-red-950/40 border border-red-600/30 px-3.5 py-1 rounded-full uppercase">
                Projecteur Denden TV
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">{movie.title}</h2>
              <p className="text-white/40 text-xs line-clamp-3 leading-relaxed font-semibold">{movie.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Play Error Overlay */}
      {playError && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center z-[55]">
          <div className="max-w-md space-y-4 bg-white/5 border border-white/10 p-8 rounded-[30px] shadow-2xl backdrop-blur-md">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Erreur de lecture</h3>
            <p className="text-sm text-white/60 leading-relaxed font-medium">
              {playError}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button 
                onClick={() => {
                  setPlayError(null);
                  setIsLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/5 cursor-pointer"
              >
                Réessayer
              </button>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Quitter
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Clean Glass-Cinema Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between p-4 sm:p-8 z-50 bg-gradient-to-t from-black/95 via-black/30 to-black/85 pointer-events-none"
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-3">
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black/40 hover:bg-red-650 rounded-xl md:rounded-2xl text-white transition-all duration-300 border border-white/10 shadow-lg backdrop-blur-xl group/back"
                    title="Retour"
                  >
                    <ChevronLeft size={isMobile ? 20 : 24} className="group-hover/back:-translate-x-1 transition-transform" />
                  </button>
                )}
                
                <div className="flex items-center bg-black/40 px-4 md:px-5 py-2 md:py-2.5 rounded-[18px] md:rounded-[22px] border border-white/10 backdrop-blur-xl shadow-2xl">
                   <div className="flex flex-col">
                      <h3 className="text-[11px] md:text-sm font-black text-white uppercase tracking-tighter truncate max-w-[150px] md:max-w-md leading-none">
                        {movie?.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 md:mt-1.5">
                        <span className="text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-widest">{movie?.year}</span>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[7px] md:text-[9px] font-black text-red-500 uppercase tracking-widest">{movie?.quality || '4K ULTRA HD'}</span>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-widest">{formatTime(duration)}</span>
                      </div>
                   </div>
                </div>
              </div>
                
              <div className="flex items-center gap-2 md:gap-3">
                 <button 
                  onClick={() => setShowInfoOverlay(!showInfoOverlay)}
                  className={cn(
                    "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl transition-all duration-300 border backdrop-blur-xl",
                    showInfoOverlay ? "bg-white text-black border-white" : "bg-black/40 text-white/40 border-white/10 hover:bg-white/10 hover:text-white"
                  )}
                 >
                   <Info size={isMobile ? 18 : 20} />
                 </button>
                 <button 
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className={cn(
                    "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl transition-all duration-300 border backdrop-blur-xl",
                    showSettingsMenu ? "bg-red-650 text-white border-red-650" : "bg-black/40 text-white/40 border-white/10 hover:bg-white/10 hover:text-white"
                  )}
                 >
                   <Settings size={isMobile ? 18 : 20} />
                 </button>
              </div>
            </div>

            {/* Middle Big Play button on controls */}
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
              <AnimatePresence>
                {!isPlaying && (
                  <motion.button 
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    onClick={togglePlay}
                    className="pointer-events-auto p-8 rounded-full bg-white text-black flex items-center justify-center shadow-3xl shadow-white/10 active:scale-95 transition-all"
                  >
                    <Play size={40} fill="currentColor" className="ml-1" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Dashboard Area */}
            <div className="pt-6 pointer-events-auto bg-black/60 backdrop-blur-2xl p-6 rounded-t-[32px] border-t border-white/5">
              
              {/* Timeline scrubber slider */}
              <div className="flex items-center gap-4 mb-4">
                <span className="font-mono text-[11px] font-black text-white/60">{formatTime(currentTime)}</span>
                
                <div className="flex-1 relative group h-6 flex items-center">
                  <input 
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={timelinePercent}
                    onMouseDown={() => setIsDraggingTimeline(true)}
                    onTouchStart={() => setIsDraggingTimeline(true)}
                    onChange={(e) => handleTimelineChange(parseFloat(e.target.value))}
                    onInput={(e) => handleTimelineChange(parseFloat(e.target.value))}
                    onMouseUp={(e) => handleTimelineSeekEnd(parseFloat((e.target as HTMLInputElement).value))}
                    onTouchEnd={(e) => handleTimelineSeekEnd(parseFloat((e.target as HTMLInputElement).value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div className="absolute inset-x-0 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-red-650 rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)] transition-all duration-100"
                      style={{ width: `${timelinePercent}%` }}
                    />
                  </div>
                  <div 
                    className="absolute w-3 h-3 bg-white rounded-full border-2 border-red-650 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30"
                    style={{ left: `${timelinePercent}%`, transform: 'translateX(-50%)' }}
                  />
                </div>

                <span className="font-mono text-[11px] font-black text-white/60">{formatTime(duration)}</span>
              </div>

              {/* General Controls Strip */}
              <div className="flex items-center justify-between">
                
                {/* Play / back 10s / forward 10s / Audio slider */}
                <div className="flex items-center gap-6">
                  <button 
                    onClick={togglePlay} 
                    className="text-white hover:text-red-500 transition-all"
                    title={isPlaying ? "Suspendre" : "Reprendre"}
                  >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                  </button>



                  {/* Volume block controller */}
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 group/vol transition-all hover:bg-white/10">
                    <button onClick={toggleMute} className="text-white/60 hover:text-white transition-all">
                      {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <div className="w-24 h-1 bg-white/10 rounded-full relative group">
                      <div 
                        className="absolute inset-y-0 left-0 bg-red-650 rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"
                        style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                      />
                      <input 
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                      />
                      <div 
                        className="absolute w-3 h-3 bg-white rounded-full border-2 border-red-650 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ left: `${(isMuted ? 0 : volume) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right controls: Screen triggers */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="text-white/80 hover:text-white transition-all"
                    title="Réglages"
                  >
                    <Settings size={20} />
                  </button>
                  <button 
                    onClick={toggleFullScreen}
                    className="text-white hover:text-red-500 transition-all"
                    title="Plein écran (F)"
                  >
                    <Maximize size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Settings Dropdown panel over screen (Speed selection, Format adjustments) */}
      <AnimatePresence>
        {showSettingsMenu && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute top-24 right-4 sm:right-8 w-80 bg-neutral-950/95 border border-white/10 rounded-[28px] p-6 z-[80] shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-6 text-left pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h4 className="text-xs font-black uppercase tracking-widest text-red-650 flex items-center gap-2">
                <Sliders size={14} /> Paramètres Cinéma
              </h4>
              <button 
                onClick={() => setShowSettingsMenu(false)}
                className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>

            {/* Aspect Ratio choice */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block">Format d'affichage :</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['fit', 'fill', 'stretch', 'zoom'] as const).map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "py-2 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all",
                      aspectRatio === ratio
                        ? "bg-white text-black border-transparent font-extrabold"
                        : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    {ratio === 'fit' && "Contenir"}
                    {ratio === 'fill' && "Remplir"}
                    {ratio === 'stretch' && "Étirer"}
                    {ratio === 'zoom' && "Zoomer"}
                  </button>
                ))}
              </div>
            </div>

            {/* Playback speed choice */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block">Vitesse de lecture :</span>
              <div className="grid grid-cols-4 gap-1">
                {([0.5, 0.75, 1, 1.25, 1.5, 2] as const).map(rate => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRateChange(rate)}
                    className={cn(
                      "py-1.5 text-[9px] font-mono font-black rounded-md border transition-all",
                      playbackRate === rate
                        ? "bg-white text-black border-transparent"
                        : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                    )}
                  >
                    {rate === 1 ? "Normal" : `${rate}x`}
                  </button>
                ))}
              </div>
            </div>

            {/* Stream quality source */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block">Qualité d'encodage :</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => changeQuality(-1)}
                  className={cn(
                    "py-2 text-[9px] font-black uppercase rounded-lg border transition-all",
                    currentQualityIndex === -1
                      ? "bg-emerald-600 border-none text-white font-extrabold"
                      : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                  )}
                >
                  Auto
                </button>
                {hlsLevels.length > 0 && hlsLevels.map((lvl) => (
                  <button
                    key={`lvl-${lvl.id}`}
                    onClick={() => changeQuality(lvl.id)}
                    className={cn(
                      "py-2 text-[9px] font-black uppercase rounded-lg border transition-all",
                      currentQualityIndex === lvl.id
                        ? "bg-emerald-600 border-none text-white font-extrabold"
                        : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                    )}
                  >
                    {lvl.height}P
                  </button>
                )).reverse()}
                {hlsLevels.length === 0 && ['HD', 'SD'].map(q => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={cn(
                      "py-2 text-[9px] font-black uppercase rounded-lg border transition-all",
                      quality === q
                        ? "bg-emerald-600 border-none text-white font-extrabold"
                        : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom info footer tips */}
            <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg text-[10px] text-white/30 flex items-start gap-1.5">
               <RefreshCw size={12} className="text-red-650 shrink-0 mt-0.5" />
               <p className="leading-relaxed font-semibold">Le lecteur optimise l'encodage dynamiquement pour éviter les micro-coupures.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. Synopsis / Info overlay on the side (luxurious detail card) */}
      <AnimatePresence>
        {showInfoOverlay && movie && (
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="absolute top-24 left-4 sm:left-8 w-full max-w-md bg-neutral-950/95 border border-white/10 rounded-[28px] p-6 lg:p-8 z-[80] shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl space-y-6 text-left pointer-events-auto max-h-[75vh] overflow-y-auto scrollbar-hide"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h4 className="text-xs font-black uppercase tracking-widest text-red-650 flex items-center gap-2">
                <Info size={14} /> Fiche technique de l'œuvre
              </h4>
              <button 
                onClick={() => setShowInfoOverlay(false)}
                className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">Titre original</span>
                <h5 className="text-base font-black text-white mt-0.5">{movie.originalTitle || movie.title}</h5>
              </div>

              <div>
                <span className="text-[9px] font-black uppercase text-white/30 tracking-wider">Synopsis</span>
                <p className="text-xs text-white/70 mt-1 leading-relaxed font-semibold max-h-40 overflow-y-auto scrollbar-hide">
                  {movie.summary || "Renseignez un synopsispour ce film."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-wider block">Réalisateur</span>
                  <span className="text-[11px] font-bold text-white/90">{movie.director || "Inconnu"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-wider block">Durée</span>
                  <span className="text-[11px] font-bold text-white/90">{movie.duration || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-wider block">Pays d'origine</span>
                  <span className="text-[11px] font-bold text-white/90">{movie.country || "France"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-wider block">Langue</span>
                  <span className="text-[11px] font-bold text-emerald-400">{movie.language || "Français"}</span>
                </div>
              </div>

              {movie.actors && movie.actors.length > 0 && (
                <div className="pt-2">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-wider block mb-2">Acteurs principaux</span>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.actors.slice(0, 5).map((act, i) => (
                      <span key={i} className="text-[9px] font-bold text-white/80 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md">
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
