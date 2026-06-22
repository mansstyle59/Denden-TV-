import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Maximize, MonitorPlay, Info, Settings,
  Volume2, VolumeX, X, SkipBack, SkipForward, Star, Search, 
  Target, Wifi, Activity, Cpu, 
  LayoutList, ListFilter, History, ChevronRight, ChevronLeft, Zap, Loader2, Tv, Calendar,
  Flame, Disc, AlertTriangle, Lock, Timer, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Channel } from '../types';
import { useDeviceType } from '../hooks/useDeviceType';

interface VideoPlayerProps {
  channel: Channel | null;
  onClose?: () => void;
  fullScreen?: boolean;
  liveEpg?: { current: any; next: any; programmeTv?: any; schedule?: any[] };
  mini?: boolean;
  onMaximize?: () => void;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
  channels?: Channel[];
  onSelectChannel?: (channel: Channel) => void;
  onMinimize?: () => void;
}

export default function VideoPlayer({ 
  channel, 
  onClose, 
  fullScreen = false, 
  liveEpg, 
  mini = false, 
  onMaximize,
  onPrevChannel,
  onNextChannel,
  channels = [],
  onSelectChannel,
  onMinimize
}: VideoPlayerProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile' || deviceType === 'tablet';
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [attemptIndex, setAttemptIndex] = useState(0);

  // Live Sync & Interactive Control States
  const [isBehindLive, setIsBehindLive] = useState(false);
  const [liveDelay, setLiveDelay] = useState(0);
  const [timelinePercent, setTimelinePercent] = useState(100);
  const [quality, setQuality] = useState('1080p');
  const [hlsLevels, setHlsLevels] = useState<{ id: number, height: number, bitrate: number }[]>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1); // -1 for Auto
  const [hsSources, setHsSources] = useState<Record<string, number[]>>(() => {
    try {
      const stored = localStorage.getItem('denden_hs_sources');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toggleHS = (sourceIdx: number) => {
    if (!channel) return;
    const chId = channel.id;
    const current = hsSources[chId] || [];
    const updated = current.includes(sourceIdx)
      ? current.filter(i => i !== sourceIdx)
      : [...current, sourceIdx];
    
    const newHsSources = { ...hsSources, [chId]: updated };
    setHsSources(newHsSources);
    try {
      localStorage.setItem('denden_hs_sources', JSON.stringify(newHsSources));
    } catch (e) {}
  };

  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showMiniEpg, setShowMiniEpg] = useState(true);
  const [miniEpgIndex, setMiniEpgIndex] = useState(0);
  const [isSlowMode, setIsSlowMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isSlowMode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSlowMode = () => {
    const newValue = !isSlowMode;
    setIsSlowMode(newValue);
    try {
      localStorage.setItem('isSlowMode', String(newValue));
    } catch (e) {}
  };

  // Native Picture-in-Picture States
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
  }, []);

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
        if (onMinimize) {
          onMinimize();
        }
      }
    } catch (err) {
      console.error('Failed to toggle Picture-in-Picture:', err);
    }
  };
  
  const changeQuality = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQualityIndex(index);
    }
  };

  const changeSource = (index: number) => {
    setAttemptIndex(index);
    setIsLoading(true);
    setShowSkeleton(true);
  };
  
  // New UI Overlays
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'tech' | 'recents' | 'channels' | 'epg'>('none');
  const [lastTapTime, setLastTapTime] = useState(0);
  const [seekFeedback, setSeekFeedback] = useState<{type: 'forward' | 'rewind' | null, visible: boolean}>({ type: null, visible: false });
  
  useEffect(() => {
    if (isLoading) {
      setLoadingMessage(null);
      const timer5s = setTimeout(() => setLoadingMessage("Connexion au flux..."), 5000);
      const timer10s = setTimeout(() => setLoadingMessage("Le chargement prend plus de temps que prévu"), 10000);
      return () => {
        clearTimeout(timer5s);
        clearTimeout(timer10s);
      };
    }
  }, [isLoading]);

  const handleVideoReady = () => {
    setIsLoading(false);
    // Step 2: Wait 300ms after first image appears
    setTimeout(() => {
      // Step 3: Fade-out Skeleton (handled by exit motion)
      setShowSkeleton(false);
      // Step 4: Show controls
      setTimeout(() => setShowControls(true), 300);
    }, 300);
  };
  const [fluxStatus, setFluxStatus] = useState<'stable' | 'slow' | 'unstable'>('stable');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(sidebarSearch.toLowerCase()) || 
    c.category.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  const [techInfo, setTechInfo] = useState({
    resolution: '1920x1080',
    codec: 'H.264 / AAC',
    bitrate: '4.5 Mbps',
    latency: '1.2s',
    server: 'Denden Cloud Edge'
  });

  // EPG tracker states
  const [progress, setProgress] = useState(50);
  const [timeText, setTimeText] = useState("Direct");
  const [currentTitle, setCurrentTitle] = useState(channel ? `${channel.name} en Direct` : "Direct Vidéo");
  const [pStartText, setPStartText] = useState("");
  const [pEndText, setPEndText] = useState("");

  // Custom premium EPG list states
  const [channelEpg, setChannelEpg] = useState<any[]>([]);
  const [isEpgLoading, setIsEpgLoading] = useState(false);

  const streamsToTry = channel 
    ? [
        channel.url, 
        ...((channel as any).streams || []), 
        ...(channel.backupUrls || []), 
        (channel as any).videoUrl
      ].filter(u => !!u) 
    : [];
  
  const activeStreamUrl = streamsToTry[attemptIndex] || '';

  const handleResync = useCallback(() => {
    if (hlsRef.current && videoRef.current) {
      const video = videoRef.current;
      const hls = hlsRef.current;
      
      // Attempt to recover by seeking to the latest possible point
      if (video.duration && isFinite(video.duration)) {
        video.currentTime = video.duration - 0.1;
        hls.recoverMediaError();
      } else {
        // Fallback: Full reload of the source to flush all buffers
        hls.stopLoad();
        hls.loadSource(getPlayableUrl(activeStreamUrl));
        hls.startLoad();
      }
    } else if (videoRef.current) {
      const video = videoRef.current;
      const currentSrc = video.src;
      video.src = "";
      video.load();
      video.src = currentSrc;
      video.play().catch(() => {});
    }
  }, [activeStreamUrl]);

  const getPlayableUrl = useCallback((url: string) => {
    if (!url) return '';
    const isExternal = url.startsWith('http') && !url.includes(window.location.host);
    const isM3u8 = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('m3u8');
    
    if (isExternal) {
      if (isM3u8) {
        let referer = 'https://hoca8.com/';
        if (url.includes('shahid.net')) {
          referer = 'https://shahid.mbc.net/';
        } else if (url.includes('6play.fr') || url.includes('6cloud.fr')) {
          referer = 'https://www.6play.fr/';
        } else {
          try {
            referer = new URL(url).origin + '/';
          } catch (e) {}
        }
        return `/api/proxy/stream?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`;
      } else {
        const isStandard = channel?.isVOD ||
          url.toLowerCase().split('?')[0].endsWith('.mp4') ||
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
  }, [channel]);

  useEffect(() => {
    setAttemptIndex(0);
    setActiveOverlay('none');
    setIsLoading(true);
    setShowSkeleton(true);
    setShowControls(false);
    setIsPlaying(true); // Always try to play on new channel selection
  }, [channel]);

  // Handle potential stuck loading
  useEffect(() => {
    if (isLoading) {
      const fallback = setTimeout(() => {
        if (isLoading && showSkeleton) {
           console.warn("Loading fallback triggered");
           handleVideoReady();
        }
      }, 15000); // 15s absolute fallback
      return () => clearTimeout(fallback);
    }
  }, [isLoading, showSkeleton]);

  // Keyboard Zapping & Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullScreen) return;

      if (activeOverlay === 'channels') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex(prev => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex(prev => Math.min(filteredChannels.length - 1, prev + 1));
        } else if (e.key === 'Enter') {
          if (focusedIndex >= 0 && filteredChannels[focusedIndex]) {
            onSelectChannel?.(filteredChannels[focusedIndex]);
          }
        } else if (e.key === 'ArrowRight' || e.key === 'Escape' || e.key === 'Backspace') {
          setActiveOverlay('none');
        }
        return;
      }

      if (channel?.isVOD) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          jump(-15);
          handleMouseMove();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          jump(15);
          handleMouseMove();
          return;
        }
      }

      switch(e.key) {
        case 'ArrowLeft':
          setActiveOverlay('channels');
          setFocusedIndex(channels.findIndex(c => c.id === channel.id));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
        case 'F':
          toggleFullScreen();
          break;
        case 'Escape':
          if (activeOverlay !== 'none') {
            setActiveOverlay('none');
          } else if (onClose) {
            onClose();
          }
          break;
      }
      handleMouseMove();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullScreen, onNextChannel, onPrevChannel, onClose, activeOverlay]);

  useEffect(() => {
    if (!channel || channel.isVOD) return;
    
    const updateProgress = () => {
      const now = new Date();
      
      // Handle programme-tv.net scraped data first
      if (liveEpg?.programmeTv) {
        const ptv = liveEpg.programmeTv;
        setCurrentTitle(ptv.title);
        setProgress(ptv.progress || 0);
        setPStartText(ptv.time || "");
        setPEndText("");
        setTimeText("En direct (Scraped)");
        return;
      }

      if (liveEpg?.current) {
        const current = liveEpg.current;
        setCurrentTitle(current.title);
        
        const start = new Date(current.startTime);
        const end = new Date(current.endTime);
        
        setPStartText(format(start, 'HH:mm'));
        setPEndText(format(end, 'HH:mm'));

        const startMs = start.getTime();
        const endMs = end.getTime();
        const nowMs = now.getTime();

        if (endMs > startMs) {
          const pct = Math.min(100, Math.max(0, ((nowMs - startMs) / (endMs - startMs)) * 100));
          setProgress(pct);
          
          const totalMin = Math.round((endMs - startMs) / 60000);
          const elapsedMin = Math.round((nowMs - startMs) / 60000);
          const remainingMin = Math.max(0, totalMin - elapsedMin);
          setTimeText(`Direct • ${remainingMin}m restant`);
        } else {
          setProgress(50);
          setTimeText("En direct");
        }
      } else {
        setCurrentTitle(`${channel.name} en Direct`);
        setProgress(65);
        setTimeText("En direct");
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 10000);
    return () => clearInterval(interval);
  }, [liveEpg, channel]);

  // VOD Progress Tracker
  useEffect(() => {
    if (!channel?.isVOD) return;
    const video = videoRef.current;
    if (!video) return;

    const interval = setInterval(() => {
      if (video.duration) {
        const current = Math.floor(video.currentTime);
        const total = Math.floor(video.duration);
        const formatTime = (s: number) => {
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          const rs = s % 60;
          return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
        };
        setTimeText(`${formatTime(current)} / ${formatTime(total)}`);
        setCurrentTitle(channel.name);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [channel]);


  // Program accurate progress helper
  const getProgramProgress = () => {
    if (!liveEpg?.current?.startTime || !liveEpg?.current?.endTime) return 0;
    const start = new Date(liveEpg.current.startTime).getTime();
    const end = new Date(liveEpg.current.endTime).getTime();
    const now = new Date().getTime();
    if (end <= start) return 0;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  };

  // Program remaining duration textual rendering helper
  const getProgramRemainingText = () => {
    if (!liveEpg?.current?.startTime || !liveEpg?.current?.endTime) return '';
    const end = new Date(liveEpg.current.endTime).getTime();
    const now = new Date().getTime();
    const remainingMs = end - now;
    if (remainingMs <= 0) return '';
    const remainingMin = Math.round(remainingMs / 60000);
    return `${remainingMin} min restante${remainingMin > 1 ? 's' : ''}`;
  };

  useEffect(() => {
    if (!channel || !videoRef.current || !activeStreamUrl) return;

    const video = videoRef.current;
    
    // Improved detection: M3U8 is always HLS, otherwise if it's a movie URL or has standard extension, it's standard video
    const isHls = activeStreamUrl.toLowerCase().includes('.m3u8') || activeStreamUrl.includes('m3u8');
    const isStandardVideo = !isHls && (
      channel.isVOD || 
      activeStreamUrl.toLowerCase().split('?')[0].endsWith('.mp4') || 
      activeStreamUrl.toLowerCase().split('?')[0].endsWith('.webm') ||
      activeStreamUrl.toLowerCase().split('?')[0].endsWith('.ogg') ||
      activeStreamUrl.toLowerCase().split('?')[0].endsWith('.mov')
    );

    if (isStandardVideo) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      try {
        video.src = getPlayableUrl(activeStreamUrl);
        setIsLoading(true);
        video.load();
        if (isPlaying) {
          video.play().catch(() => {
            console.warn("Autoplay failed for standard video");
            setIsPlaying(false);
          });
        }
      } catch (e) {
        console.error("Standard video setup failed");
      }
      setTechInfo(prev => ({
        ...prev,
        resolution: 'Vidéo Standard',
        codec: 'Native Browser Codec'
      }));
      return;
    }

    const handleHlsError = (hlsInstance: Hls, data: any) => {
      if (data.fatal) {
        if (attemptIndex + 1 < streamsToTry.length) {
          setAttemptIndex(prev => prev + 1);
        } else {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setFluxStatus('unstable');
              hlsInstance.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance.recoverMediaError();
              break;
            default:
              hlsInstance.destroy();
              break;
          }
        }
      } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        setFluxStatus('slow');
      }
    };

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hlsOptions: any = {
        enableWorker: true,
        backBufferLength: 60,
        maxAudioFramesDrift: 1, // Minimize audio drift
        stretchShortVideoTrack: true, // Help when audio is longer than video
        forceKeyFrameOnDiscontinuity: true,
        nudgeMaxRetries: 10,
        nudgeOffset: 0.1,
      };

      if (isSlowMode) {
        hlsOptions.lowLatencyMode = false;
        hlsOptions.maxBufferLength = 60; 
        hlsOptions.maxMaxBufferLength = 120;
        hlsOptions.maxBufferSize = 60 * 1024 * 1024; // buffer up to 60MB
        hlsOptions.liveSyncDurationCount = 7; // Sync 7 segments behind live for max stability
        hlsOptions.liveMaxLatencyDurationCount = 12; // Allow drift to prioritize smooth stream
        hlsOptions.liveDurationInfinity = true;

        // Loader retries configuration to survive connection drops
        hlsOptions.manifestLoadingTimeOut = 20000;
        hlsOptions.manifestLoadingMaxRetry = 6;
        hlsOptions.manifestLoadingRetryDelay = 2000;
        hlsOptions.levelLoadingTimeOut = 20000;
        hlsOptions.levelLoadingMaxRetry = 6;
        hlsOptions.levelLoadingRetryDelay = 2000;
        hlsOptions.fragLoadingTimeOut = 30000;
        hlsOptions.fragLoadingMaxRetry = 8;
        hlsOptions.fragLoadingRetryDelay = 2000;
      } else {
        hlsOptions.lowLatencyMode = true;
      }

      const hls = new Hls(hlsOptions);
      hls.loadSource(getPlayableUrl(activeStreamUrl));
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setHlsLevels(data.levels.map((l, idx) => ({ id: idx, height: l.height, bitrate: l.bitrate })));
        setTechInfo(prev => ({
          ...prev,
          resolution: `${data.levels[hls.currentLevel]?.width || '1920'}x${data.levels[hls.currentLevel]?.height || '1080'}`,
        }));
        if (isPlaying) video.play().catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentQualityIndex(hls.autoLevelEnabled ? -1 : data.level);
        const level = hls.levels[data.level];
        if (level) {
          setTechInfo(prev => ({
            ...prev,
            resolution: `${level.width}x${level.height}`,
            bitrate: `${(level.bitrate / 1000000).toFixed(1)} Mbps`
          }));
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        handleHlsError(hls, data);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeStreamUrl;
      video.addEventListener('loadedmetadata', () => {
        if (isPlaying) video.play().catch(() => setIsPlaying(false));
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [channel, activeStreamUrl, attemptIndex, isSlowMode]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  const catchUpToLive = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.seekable && video.seekable.length > 0) {
        video.currentTime = video.seekable.end(0);
      }
      video.play().catch(() => {});
      setIsPlaying(true);
      setIsBehindLive(false);
    } catch (err) {}
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (channel?.isVOD) {
        if (video.duration) {
          setTimelinePercent((video.currentTime / video.duration) * 100);
        }
        return;
      }
      if (video.seekable && video.seekable.length > 0) {
        const start = video.seekable.start(0);
        const end = video.seekable.end(0);
        const range = end - start;
        if (range > 0) {
          const delay = end - video.currentTime;
          setIsBehindLive(delay > 3);
          setLiveDelay(Math.round(delay));
          setTimelinePercent(((video.currentTime - start) / range) * 100);
        }
      }
    } catch (err) {}
  };

  const handleTimelineSeek = (pctVal: number) => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (channel?.isVOD) {
        if (video.duration) {
          video.currentTime = (pctVal / 100) * video.duration;
        }
        return;
      }
      if (video.seekable && video.seekable.length > 0) {
        const start = video.seekable.start(0);
        const end = video.seekable.end(0);
        video.currentTime = start + (pctVal / 100) * (end - start);
      }
    } catch (err) {}
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        await videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn("Playback toggle failed", e);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && activeOverlay === 'none' && !showQualityMenu) setShowControls(false);
    }, 4000);
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

  const jump = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
      setSeekFeedback({ type: seconds > 0 ? 'forward' : 'rewind', visible: true });
      setTimeout(() => setSeekFeedback({ type: null, visible: false }), 600);
    } catch (e) {}
  };

  if (!channel) return null;

  if (!fullScreen && !isPipActive) {
    return null;
  }

  const currentProg = liveEpg?.current;
  const nextProg = liveEpg?.next;

  const showTitle = currentProg?.title || liveEpg?.programmeTv?.title || `${channel.name} en Direct`;
  const showCategory = currentProg?.category || liveEpg?.programmeTv?.time || 'Direct';
  const showDesc = currentProg?.description || "Aucune description disponible pour ce programme.";
  const nextShowTitle = nextProg?.title || "Programme suivant";
  const nextShowTime = nextProg?.startTime ? format(new Date(nextProg.startTime), 'HH:mm') : "Bientôt";

  const progPct = getProgramProgress();
  const remainingText = getProgramRemainingText();

  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Gestures disabled as per request
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Gestures disabled as per request
  };

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      className={cn(
        "relative bg-[#050505] group overflow-hidden transition-all duration-500 focus:outline-none focus:ring-4 focus:ring-red-650",
        (!fullScreen && isPipActive) ? "fixed top-0 left-0 w-0 h-0 pointer-events-none opacity-0 z-[-9999]" : (fullScreen ? "w-full h-full" : "aspect-video w-full rounded-2xl md:rounded-[40px] shadow-2xl border border-white/10")
      )}
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={(e) => {
        // Channel sidebar shortcuts
        if (e.key === 'l' || e.key === 'L') setActiveOverlay('channels');
      }}
    >
      <video 
        ref={videoRef} 
        crossOrigin="anonymous"
        className="w-full h-full object-contain bg-black" 
        playsInline 
        referrerPolicy="no-referrer"
        autoPlay={isPlaying} 
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => { setIsPlaying(true); handleVideoReady(); }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={handleVideoReady}
        onLoadedData={handleVideoReady}
        onCanPlay={handleVideoReady}
        onLoadStart={() => {
          setIsLoading(true);
        }}
        poster={channel.logo || undefined}
      />

      {/* Premium Connection & Loading Overlay */}
      <AnimatePresence>
        {(showSkeleton || isLoading) && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-50 bg-[#060a13]/95 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto select-none"
          >
            {/* Back button on Loading Overlay */}
            <button 
              onClick={onClose}
              className="absolute top-6 left-6 z-[60] flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-white/20 rounded-full text-white transition-all duration-300 border border-white/10 shadow-lg backdrop-blur-md"
              title="Fermer"
            >
              <X size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Fermer</span>
            </button>

            {/* Ambient Animated Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
              <div className="absolute -top-[10%] left-[20%] w-[60%] h-[50%] rounded-full bg-[#00A8E1]/10 blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
              <div className="absolute -bottom-[10%] right-[20%] w-[60%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
              
              <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-[#00A8E1]/2 to-transparent"
              />
            </div>

            {/* Glowing Ring Loader & Logo Centerpiece */}
            <div className="relative flex flex-col items-center justify-center p-6 max-w-sm text-center z-10">
              <div className="relative w-32 h-32 md:w-36 md:h-36 flex items-center justify-center mb-6">
                
                {/* Rotating Outer Ring (Cyan Glow) */}
                <svg className="absolute w-full h-full animate-[spin_4s_linear_infinite]" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="46" 
                    stroke="url(#cyanGlow)" 
                    strokeWidth="2" 
                    fill="transparent" 
                    strokeDasharray="220 60" 
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00A8E1" stopOpacity="1" />
                      <stop offset="50%" stopColor="#818CF8" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Rotating Inner Ring - Counter Clockwise */}
                <svg className="absolute w-[85%] h-[85%] animate-[spin_2s_linear_infinite_reverse]" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    stroke="url(#violetGlow)" 
                    strokeWidth="1.5" 
                    fill="transparent" 
                    strokeDasharray="140 80" 
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="violetGlow" x1="100%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#00A8E1" stopOpacity="0.8" />
                      <stop offset="60%" stopColor="#EC4899" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Pulsing Ripple Effect */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-[#00A8E1]/10 to-indigo-500/10 animate-ping opacity-60" style={{ animationDuration: '2.5s' }} />

                {/* Channel Logo Container */}
                <div className="absolute inset-4 rounded-full bg-[#0d1525]/95 border border-white/10 flex items-center justify-center p-4 shadow-2xl backdrop-blur-md overflow-hidden">
                  {channel?.logo ? (
                    <motion.img 
                      src={channel.logo} 
                      alt={channel.name} 
                      className="max-h-full max-w-full object-contain filter drop-shadow-lg"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.95, 1.05, 0.95] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : (
                    <Tv size={28} className="text-white/40" />
                  )}
                </div>
              </div>

              {/* Status Information */}
              <h4 className="font-display text-base md:text-lg font-bold text-white uppercase tracking-wider mb-1">
                {isLoading && !showSkeleton ? "Mise en mémoire..." : "Connexion au Flux"}
              </h4>
              
              <div className="flex items-center gap-1.5 mb-5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A8E1] animate-ping" />
                <span className="text-xs font-mono font-black text-[#00A8E1] uppercase tracking-widest">
                  {channel?.name || "Flux Direct"}
                </span>
              </div>

              {/* Advanced Real-time Connection Telemetry */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md w-full min-w-[260px]">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider mb-2.5">
                  <span>Statut</span>
                  <span className="text-[#00A8E1] animate-pulse">actif</span>
                </div>
                
                <div className="flex flex-col gap-2 text-left">
                  <div className="flex items-center gap-2 text-[10px] text-white/70">
                    <Loader2 size={12} className="animate-spin text-[#00A8E1] shrink-0" />
                    <span className="truncate">
                      {attemptIndex > 0 
                        ? `Source secours en cours (${attemptIndex + 1}/${streamsToTry.length})` 
                        : (loadingMessage || "Chargement du flux vidéo HLS...")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] font-mono text-white/40">
                    <Activity size={10} className="shrink-0 text-white/30" />
                    <span className="truncate">Détection des paramètres de codec H.264</span>
                  </div>

                  {isSlowMode && (
                    <div className="flex items-center gap-2 text-[9px] font-mono text-purple-400">
                      <Zap size={10} className="animate-pulse shrink-0 fill-purple-400/20 text-purple-400" />
                      <span className="text-purple-400">Mode anti-lag actif : mémoire tampon étendue</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Help tip when taking longer */}
              {attemptIndex > 0 && (
                <p className="mt-4 text-[9px] text-white/30 tracking-wider uppercase leading-relaxed font-semibold max-w-[220px]">
                  Bascule automatique sur les sources de secours disponible
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Vignette Overlay */}
      {/* <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-10" /> */}

      <div 
        className="absolute inset-0 z-20 flex"
        onClick={(e) => {
          // Detect single vs double click for seek
          const now = Date.now();
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const isLeft = x < rect.width / 3;
          const isRight = x > (rect.width * 2) / 3;

          if (now - lastTapTime < 300) {
            // Double tap detected
            if (isLeft) {
              jump(-10);
              setSeekFeedback({ type: 'rewind', visible: true });
            } else if (isRight) {
              jump(10);
              setSeekFeedback({ type: 'forward', visible: true });
            }
            setTimeout(() => setSeekFeedback({ type: null, visible: false }), 600);
          } else {
            // Single tap: toggle controls
            setShowControls(!showControls);
          }
          setLastTapTime(now);
        }}
      >
        {/* Interaction zones for visual feedback */}
        <div className="absolute inset-y-0 left-0 w-1/3 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-1/3 pointer-events-none" />
      </div>

      {/* Seek Feedback Animation */}
      <AnimatePresence>
        {seekFeedback.visible && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-[60] p-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 pointer-events-none",
              seekFeedback.type === 'rewind' ? "left-1/4" : "right-1/4"
            )}
          >
            <div className="flex flex-col items-center gap-1">
              {seekFeedback.type === 'rewind' ? (
                <>
                  <div className="flex gap-[-4px]">
                    <ChevronLeft size={24} className="animate-pulse" />
                    <ChevronLeft size={24} className="animate-pulse delay-75" />
                    <ChevronLeft size={24} className="animate-pulse delay-150" />
                  </div>
                  <span className="text-[10px] font-black font-mono">-10S</span>
                </>
              ) : (
                <>
                  <div className="flex gap-[-4px]">
                    <ChevronRight size={24} className="animate-pulse" />
                    <ChevronRight size={24} className="animate-pulse delay-75" />
                    <ChevronRight size={24} className="animate-pulse delay-150" />
                  </div>
                  <span className="text-[10px] font-black font-mono">+10S</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isPlaying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30 pointer-events-none">
            <button onClick={e => { e.stopPropagation(); togglePlay(); }} className="pointer-events-auto w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-all">
              <Play size={40} fill="currentColor" className="translate-x-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("absolute inset-0 flex flex-col justify-between z-40 transition-colors", showControls ? "bg-transparent" : "bg-transparent")}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />
            
            {/* Top Toolbar: NEW PROFESSIONAL HEADER */}
            <div className={cn("relative z-10 flex flex-row items-center justify-between pointer-events-auto w-full", isMobile ? "p-2 px-3 gap-2" : "p-8 lg:p-10 gap-4")}>
              
              {/* Left Group: Back & Channel Indicator */}
              <div className="flex items-center gap-1.5 md:gap-4 shrink w-[75%] sm:w-[80%] md:w-auto overflow-hidden">
                {onClose && (
                  <button 
                    onClick={onClose}
                    className={cn(
                      "flex items-center justify-center bg-black/50 hover:bg-white/10 rounded-full text-white transition-all duration-300 border border-white/10 shadow-2xl backdrop-blur-2xl group/close hover:scale-105 shrink-0",
                      isMobile ? "w-10 h-10" : "w-14 h-14"
                    )}
                    title="Fermer"
                  >
                    <ChevronLeft size={isMobile ? 20 : 28} className="group-hover/close:-translate-x-1 transition-transform duration-300" />
                  </button>
                )}

                <div className="flex items-center gap-3 shrink-0 ml-1">
                  <div className={cn(
                    "flex items-center justify-center shrink-0 transition-transform",
                    isMobile ? "h-10 w-16" : "h-14 w-20"
                  )}>
                    <img src={channel.logo || undefined} alt="" className="h-full w-full object-contain drop-shadow-2xl brightness-110" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h1 className={cn(
                      "font-black text-white uppercase tracking-tight truncate leading-none",
                      isMobile ? "text-[16px]" : "text-[22px]"
                    )}>
                      {channel.name}
                    </h1>
                    {channel.category && (
                      <span className={cn(
                        "text-white/50 font-bold uppercase tracking-[0.2em] leading-none mt-1 truncate",
                        isMobile ? "text-[10px]" : "text-[12px]"
                      )}>
                        {channel.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
                
              {/* Right Group: Tools */}
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full p-1 shadow-2xl shrink-0">
                  <button 
                   onClick={() => setActiveOverlay(activeOverlay === 'epg' ? 'none' : 'epg')}
                   className={cn(
                     "flex items-center justify-center rounded-full transition-all duration-300",
                     isMobile ? "w-11 h-11" : "w-12 h-12",
                     activeOverlay === 'epg' ? "bg-white text-black shadow-lg shadow-white/20" : "text-white/60 hover:bg-white/10 hover:text-white"
                   )}
                   title="Guide des programmes"
                  >
                    <Calendar size={isMobile ? 22 : 20} />
                  </button>
                 <button 
                  onClick={() => setActiveOverlay(activeOverlay === 'tech' ? 'none' : 'tech')}
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-300",
                    isMobile ? "w-11 h-11" : "w-12 h-12",
                    activeOverlay === 'tech' ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                 >
                   <Settings size={isMobile ? 22 : 20} />
                 </button>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className={cn(
              "relative z-10 flex flex-col pointer-events-auto w-full",
              isMobile ? "p-2 gap-2 pb-4" : "p-4 md:p-6 gap-4"
            )}>
              {/* PROFESSIONAL EPG HUD - Ultra Compact & Premium */}
              <div className={cn(
                "bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 hover:border-white/20 transition-all duration-500 rounded-[28px] md:rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.9)] relative overflow-hidden group/hud",
                isMobile ? "p-3 pb-2.5" : "p-4 md:p-6 mb-2"
              )}>
                {/* Background Accent Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] pointer-events-none group-hover/hud:bg-white/10 transition-colors duration-700" />
                
                <div className={cn("flex flex-col relative z-10", isMobile ? "gap-1.5" : "gap-4")}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className={cn("flex items-center gap-2", isMobile ? "mb-1" : "mb-2")}>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 font-black uppercase tracking-[0.2em] text-white/90 bg-white/10 border border-white/20 shadow-lg transition-all duration-500 group-hover/hud:border-white/40",
                          isMobile ? "text-[9px] px-2.5 py-0.5 rounded-md" : "text-[11px] px-3 py-1 rounded-xl"
                        )}>
                          <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" /> DIRECT
                        </span>
                        <h4 className={cn("text-white/30 font-black tracking-[0.3em] font-mono uppercase transition-colors group-hover/hud:text-white/50", isMobile ? "text-[11px]" : "text-[13px]")}>
                          {pStartText && pEndText ? `${pStartText} — ${pEndText}` : (liveEpg?.programmeTv?.time || 'PROG. LIVE')}
                        </h4>
                      </div>
                      
                      <h2 className={cn(
                        "font-black text-white uppercase tracking-tight line-clamp-1 leading-none transition-all duration-500 group-hover/hud:tracking-normal",
                        isMobile ? "text-lg mb-1.5" : "text-2xl md:text-4xl mb-3"
                      )}>
                        {showTitle}
                      </h2>

                      {isBehindLive ? (
                         <div className={cn("flex items-center", isMobile ? "gap-1.5" : "gap-3")}>
                           <button 
                            onClick={catchUpToLive}
                            className={cn(
                              "flex items-center gap-1.5 bg-white/10 text-white border border-white/20 rounded-lg font-black uppercase tracking-widest hover:scale-105 transition-all hover:bg-white/20 active:scale-95",
                              isMobile ? "px-2 py-1 text-[10px]" : "px-4 py-2 text-[11px]"
                            )}
                           >
                            <Zap size={isMobile ? 12 : 14} fill="currentColor" /> REVENIR AU DIRECT
                           </button>
                           <span className={cn(
                            "text-yellow-500 font-mono font-black tracking-widest uppercase bg-yellow-500/10 border border-yellow-500/20 rounded-lg",
                            isMobile ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[12px]"
                          )}>
                             {isMobile ? "DIFFÉRÉ" : `DIFFÉRÉ DE ${liveDelay} SECONDES`}
                           </span>
                         </div>
                      ) : (
                        <p className={cn(
                          "text-white/40 font-medium tracking-tight leading-relaxed line-clamp-1 max-w-4xl italic transition-colors group-hover/hud:text-white/60",
                          isMobile ? "text-[12px]" : "text-base md:text-lg"
                        )}>
                          {showDesc}
                        </p>
                      )}
                    </div>

                    {!isMobile && (
                      <div className="shrink-0 flex flex-col items-end gap-3 text-right">
                        <div className="flex items-center gap-2 bg-white/5 py-1 px-3 rounded-full border border-white/10">
                           <Wifi size={12} className="text-emerald-500" />
                           <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{quality}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-mono leading-none">Prochain</div>
                          <div className="text-white/40 font-black text-[11px] uppercase tracking-tight">{nextShowTitle}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar (Integrated) */}
                  <div className={cn("relative group/progress", isMobile ? "pt-1" : "pt-1.5")}>
                    <div className={cn("relative w-full bg-white/5 rounded-full overflow-hidden transition-all duration-500 group-hover/progress:h-2", isMobile ? "h-1" : "h-2")}>
                      <div 
                        className="absolute inset-y-0 left-0 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.3)] rounded-full z-10 transition-all duration-1000"
                        style={{ width: `${progPct}%` }}
                      />
                      <div 
                        className="absolute inset-y-0 left-0 bg-white/10 opacity-0 group-hover/pg:opacity-100 transition-opacity z-20"
                        style={{ width: `${timelinePercent}%` }}
                      />
                    </div>
                    <div className={cn("flex justify-between items-center text-white/20 uppercase tracking-[0.15em] font-mono font-black transition-colors group-hover/progress:text-white/40", isMobile ? "mt-1.5 text-[8px]" : "mt-2.5 text-[10px]")}>
                      <span>{pStartText}</span>
                      <span className="flex items-center gap-2 md:gap-4">
                        <span className="text-white/50">{progPct.toFixed(0)}%</span>
                        <span className="w-1 h-1 bg-white/10 rounded-full" />
                        <span className="text-white/40">{isMobile ? `${remainingText || "LIVE"}` : `${remainingText || "EN DIRECT"}`}</span>
                      </span>
                      <span>{pEndText}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION CONTROLS - Premium Glassmorphism */}
              <div className={cn(
                "flex items-center justify-between w-full bg-black/50 backdrop-blur-3xl border border-white/5 rounded-full px-3 py-2 md:px-6 md:py-3 shadow-2xl relative z-20 overflow-hidden"
              )}>
                 <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-transparent to-white/[0.02] pointer-events-none" />
                 
                 <div className="flex items-center gap-2.5 md:gap-6 relative z-10">
                    <button 
                      onClick={togglePlay} 
                      className={cn(
                        "bg-white text-black hover:bg-neutral-200 shadow-[0_0_40px_rgba(255,255,255,0.2)] rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-105",
                        isMobile ? "w-10 h-10" : "w-14 h-14"
                      )}
                    >
                      {isPlaying ? <Pause size={isMobile ? 20 : 28} fill="currentColor" /> : <Play size={isMobile ? 20 : 28} fill="currentColor" className="ml-1" />}
                    </button>


                    {!isMobile && (
                       <div className="flex items-center gap-2">
                          <button onClick={onPrevChannel} className="p-2.5 text-white/10 hover:text-white hover:bg-white/5 rounded-full transition-all" title="PRÉCÉDENT"><SkipBack size={18} /></button>
                          <button onClick={onNextChannel} className="p-2.5 text-white/10 hover:text-white hover:bg-white/5 rounded-full transition-all" title="SUIVANT"><SkipForward size={18} /></button>
                       </div>
                    )}
                 </div>

                 <div className="flex items-center gap-2 md:gap-4 relative z-10">
                    {!isMobile && (
                       <button 
                         onClick={toggleSlowMode}
                         className={cn(
                           "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all text-[9px] font-black uppercase tracking-widest border backdrop-blur-xl",
                           isSlowMode ? "bg-white/20 text-white border-white/30 shadow-lg" : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white"
                         )}
                       >
                         <Timer size={14} className={isSlowMode ? "animate-pulse" : ""} />
                         {isSlowMode ? "MODE LENT" : "FLUX NORMAL"}
                       </button>
                    )}
                    {!isMobile && (
                       <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 px-4 py-2.5 rounded-full group/vol-container hover:bg-white/[0.08] transition-all">
                          <button onClick={() => setIsMuted(!isMuted)} className={cn("transition-all", isMuted ? "text-amber-500" : "text-white/40 hover:text-white")}>
                            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                          </button>
                          <div className="w-24 group/vol relative h-1 bg-white/10 rounded-full flex items-center">
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.01" 
                              value={volume} 
                              onChange={(e) => setVolume(parseFloat(e.target.value))} 
                              className="absolute inset-0 w-full opacity-0 cursor-pointer z-20" 
                            />
                            <div 
                              className="h-full bg-white/70 rounded-full relative z-10 transition-all shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                              style={{ width: `${volume * 100}%` }}
                            >
                               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-white/50 scale-0 group-hover/vol-container:scale-100 transition-transform shadow-lg translate-x-1/2" />
                            </div>
                          </div>
                       </div>
                    )}

                    <div className="flex items-center gap-1.5 md:gap-2">
                       <button 
                        onClick={() => setActiveOverlay('channels')}
                        className={cn(
                          "flex items-center justify-center rounded-full transition-all border shadow-2xl relative active:scale-90 group/btn",
                          isMobile ? "w-10 h-10" : "w-14 h-14",
                          activeOverlay === 'channels' ? "bg-white/20 text-white border-white/50" : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20"
                        )}
                        title="LISTE DES CHAÎNES"
                       >
                         <LayoutList size={isMobile ? 20 : 24} />
                         <span className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full border-2 border-black shadow-lg" />
                       </button>
                       
                       {isPipSupported && (
                         <button 
                          onClick={togglePip}
                          className={cn(
                            "flex items-center justify-center rounded-full transition-all border shadow-2xl active:scale-90",
                            isMobile ? "w-10 h-10" : "w-14 h-14",
                            isPipActive ? "bg-white/20 text-white border-white/50" : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20"
                          )}
                          title="PICTURE IN PICTURE"
                         >
                           <MonitorPlay size={isMobile ? 20 : 24} />
                         </button>
                       )}
                       
                       <button 
                        onClick={toggleFullScreen}
                        className={cn(
                          "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-full flex items-center justify-center border border-white/5 transition-all shadow-2xl active:scale-90 hover:border-white/20",
                          isMobile ? "w-10 h-10" : "w-14 h-14"
                        )}
                        title="PLEIN ÉCRAN"
                       >
                         <Maximize size={isMobile ? 20 : 24} />
                       </button>
                    </div>
                 </div>
              </div>

              {/* MINI EPG CAROUSEL (Integrated) */}
              {showMiniEpg && !isMobile && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-3">
                       <LayoutList size={16} className="text-amber-500" />
                       <h5 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">En ce moment sur les autres chaînes</h5>
                    </div>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                    {channels.filter(c => c.id !== channel.id).slice(0, 15).map((ch) => (
                      <div 
                        key={ch.id} 
                        onClick={() => {
                          onSelectChannel?.(ch);
                          setActiveOverlay('none');
                        }}
                        className="snap-start shrink-0 w-[240px] bg-[#111111]/60 backdrop-blur-xl border border-white/5 rounded-[22px] p-4 flex gap-4 cursor-pointer hover:bg-white/20/10 hover:border-red-500/20 transition-all group"
                      >
                        <div className="w-14 h-14 bg-black/40 rounded-xl border border-white/10 p-2.5 flex items-center justify-center shrink-0">
                          <img src={ch.logo || undefined} alt="" className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <h6 className="text-[11px] font-black text-white uppercase tracking-tight truncate leading-none mb-1.5 group-hover:text-amber-500 transition-colors">{ch.name}</h6>
                          <span className="text-[9px] text-white/20 font-bold uppercase truncate tracking-widest">{ch.category}</span>
                          <div className="mt-2 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-white/70 w-2/3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {activeOverlay === 'tech' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className={cn("absolute bg-[#0f0f0f]/95 border border-white/10 rounded-[24px] md:rounded-[32px] shadow-[0_0_100px_rgba(0,0,0,0.9)] backdrop-blur-3xl z-50", isMobile ? "inset-4 p-4 overflow-y-auto" : "right-6 top-24 w-80 p-6")}>
                   <div className={cn("flex items-center justify-between mb-4")}>
                     <div className="flex flex-col">
                       <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.3em] leading-none mb-1.5">SYSTEM INFO</span>
                       <h4 className="text-white font-black text-lg md:text-xl uppercase tracking-tighter flex items-center gap-2">PARAMÈTRES</h4>
                     </div>
                     <button onClick={() => setActiveOverlay('none')} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white/60 transition-all"><X size={18} /></button>
                   </div>
                   
                   <div className={cn("space-y-3 md:space-y-4")}>
                      <div className={cn("bg-white/[0.03] rounded-2xl border border-white/5 p-4")}>
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">Serveur</span>
                           <span className="text-emerald-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"><div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Live Node</span>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: 'Résolution', value: techInfo.resolution, icon: <Maximize size={14} /> },
                            { label: 'Codec', value: techInfo.codec, icon: <Cpu size={14} /> },
                            { label: 'Bitrate', value: techInfo.bitrate, icon: <Activity size={14} /> },
                            { label: 'Latence', value: techInfo.latency, icon: <Wifi size={14} /> }
                          ].map(item => (
                            <div key={item.label} className="flex items-center justify-between">
                               <span className="text-white/40 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">{item.icon} {item.label}</span>
                               <span className="text-white text-[10px] font-mono font-bold">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
                           <span className="text-white/30 text-[8px] font-black uppercase tracking-widest">Signal</span>
                           <span className="text-white font-black text-[10px] uppercase">Stable</span>
                        </div>
                        <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
                           <span className="text-white/30 text-[8px] font-black uppercase tracking-widest">Sécurité</span>
                           <span className="text-amber-500 font-black text-[10px] uppercase flex items-center gap-1.5"><Lock size={10} /> SSL</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button onClick={toggleSlowMode} className={cn(
                          "w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                          isSlowMode ? "bg-emerald-500 text-white" : "bg-white/20 text-white"
                        )}>
                          {isSlowMode ? "STABILITÉ ACTIVE" : "ACTIVER STABILITÉ"}
                        </button>
                    </div>

                    {/* SOURCE SELECTOR */}
                    {streamsToTry.length > 1 && (
                      <div className="mt-4">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block">SOURCES FLUX</span>
                        <div className="grid grid-cols-1 gap-2">
                          {streamsToTry.map((url, idx) => {
                            const isHS = channel && hsSources[channel.id]?.includes(idx);
                            let longPressTimer: NodeJS.Timeout;
                            const handleMouseDown = () => { longPressTimer = setTimeout(() => toggleHS(idx), 800); };
                            const handleMouseUp = () => clearTimeout(longPressTimer);
                            const handleTouchStart = () => { longPressTimer = setTimeout(() => toggleHS(idx), 800); };
                            const handleTouchEnd = () => clearTimeout(longPressTimer);

                            return (
                              <button
                                key={`source-${idx}`}
                                onClick={() => !isHS && changeSource(idx)}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                onContextMenu={(e) => e.preventDefault()}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left relative overflow-hidden",
                                  attemptIndex === idx 
                                    ? "bg-white/20 border-white/40 text-white" 
                                    : isHS 
                                      ? "bg-black/40 border-white/5 text-white/20 opacity-50 cursor-not-allowed"
                                      : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/5"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <MonitorPlay size={12} className={attemptIndex === idx ? "text-amber-500" : isHS ? "text-white/10" : "text-white/20"} />
                                  <span className={cn("text-[10px] font-extrabold uppercase truncate max-w-[140px]", isHS && "line-through")}>
                                    Serveur #{idx + 1} {isHS && "(HS)"}
                                  </span>
                                </div>
                                {attemptIndex === idx && !isHS && <Zap size={10} className="text-amber-500 animate-pulse" />}
                                {isHS && <AlertTriangle size={10} className="text-red-900" />}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[8px] text-white/20 uppercase text-center font-bold">Appui long pour mettre HS</p>
                      </div>
                    )}

                    {/* QUALITY SELECTOR */}
                    {hlsLevels.length > 0 && (
                      <div className="mt-4">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block">QUALITÉ</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          <button
                            onClick={() => changeQuality(-1)}
                            className={cn(
                              "px-2 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all",
                              currentQualityIndex === -1
                                ? "bg-white/20 border-white/40 text-white"
                                : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/5"
                            )}
                          >
                            AUTO
                          </button>
                          {hlsLevels.map((lvl) => (
                            <button
                              key={`lvl-${lvl.id}`}
                              onClick={() => changeQuality(lvl.id)}
                              className={cn(
                                "px-2 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all",
                                currentQualityIndex === lvl.id
                                  ? "bg-white/20 border-white/40 text-white"
                                  : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/5"
                              )}
                            >
                              {lvl.height}P
                            </button>
                          )).reverse().slice(0, 7)}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeOverlay === 'epg' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className={cn(
                    "absolute bg-[#0a0a0a]/95 border border-white/10 rounded-[32px] md:rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,1)] backdrop-blur-3xl z-[60] overflow-hidden flex flex-col",
                    isMobile ? "inset-2 p-5" : "right-10 top-20 bottom-32 w-[450px] p-8"
                  )}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-3">Electronic Program Guide</span>
                      <h3 className="text-white font-black text-2xl md:text-3xl uppercase tracking-tighter italic">Guide Complet</h3>
                    </div>
                    <button 
                      onClick={() => setActiveOverlay('none')}
                      className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white/60 transition-all hover:rotate-90 duration-500"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-2">
                    {liveEpg?.schedule && liveEpg.schedule.length > 0 ? (
                      liveEpg.schedule.map((prog: any, idx: number) => (
                        <div 
                          key={`epg-${idx}`} 
                          className={cn(
                            "group relative bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-[24px] p-4 md:p-5 transition-all duration-500 hover:bg-white/[0.08] hover:border-white/20",
                            idx === 0 && "bg-amber-500/10 border-amber-500/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 text-white/30 font-mono text-[10px] font-black uppercase tracking-widest">
                                {idx === 0 && (
                                  <span className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                    <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" /> DIRECT
                                  </span>
                                )}
                                <span>{format(new Date(prog.startTime), 'HH:mm')} — {format(new Date(prog.endTime), 'HH:mm')}</span>
                              </div>
                              <h4 className="text-white font-black text-base md:text-lg uppercase tracking-tight group-hover:text-amber-400 transition-colors line-clamp-1">{prog.title}</h4>
                              <p className="text-white/40 text-[11px] md:text-xs font-medium leading-relaxed mt-1.5 line-clamp-2 md:line-clamp-3 italic group-hover:text-white/60 transition-colors">
                                {prog.description || "Aucune description détaillée pour ce programme."}
                              </p>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-2">
                               <div className="w-10 h-10 rounded-full border-2 border-white/5 flex items-center justify-center bg-black/40 group-hover:border-amber-500/50 transition-all duration-500">
                                 {idx === 0 ? <Zap size={14} className="text-amber-500 fill-current" /> : <Timer size={14} className="text-white/20" />}
                               </div>
                               <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">PROG. {idx + 1}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-white/[0.02] rounded-[40px] border border-white/5 border-dashed">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                           <Loader2 size={32} className="text-white/10 animate-spin" />
                        </div>
                        <h4 className="text-white/40 font-black uppercase tracking-widest text-sm">Chargement du guide...</h4>
                        <p className="text-white/10 text-[10px] mt-3 uppercase font-bold tracking-widest">Synchronisation avec les sources satellites</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                        <span className="text-white/40 font-black text-[11px] uppercase tracking-widest">Données EPG Certifiées</span>
                     </div>
                     <span className="text-white/20 font-mono text-[10px]">{format(new Date(), 'HH:mm')} UTC</span>
                  </div>
                </motion.div>
              )}

              {activeOverlay === 'channels' && (
                <motion.div 
                  initial={{ x: isMobile ? '100%' : -500 }}
                  animate={{ x: 0 }}
                  exit={{ x: isMobile ? '100%' : -500 }}
                  className={cn(
                    "absolute z-50 bg-[#000000]/98 backdrop-blur-3xl border-white/10 shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col",
                    isMobile 
                      ? "inset-y-0 right-0 w-full md:w-96 border-l" 
                      : "inset-y-0 left-0 w-[420px] border-r"
                  )}
                >
                  <div className={cn("border-b border-white/10 shrink-0", isMobile ? "p-4" : "p-10")}>
                    <div className={cn("flex items-center justify-between", isMobile ? "mb-4" : "mb-8")}>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] leading-none mb-2">NAVIGATEUR LIVE</span>
                        <h3 className={cn("font-black text-white uppercase tracking-tighter", isMobile ? "text-xl" : "text-2xl md:text-3xl")}>MES CHAÎNES</h3>
                      </div>
                      <button onClick={() => setActiveOverlay('none')} className="p-2.5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all bg-white/5 border border-white/5"><ChevronLeft size={isMobile ? 20 : 24} /></button>
                    </div>
                    <div className="relative group">
                      <Search className={cn("absolute top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500 transition-colors", isMobile ? "left-4" : "left-5")} size={isMobile ? 16 : 20} />
                      <input 
                        type="text" 
                        placeholder="RECHERCHER..."
                        value={sidebarSearch}
                        onChange={(e) => setSidebarSearch(e.target.value)}
                        className={cn(
                          "w-full bg-[#111111] border border-white/10 rounded-xl md:rounded-2xl text-white focus:outline-none focus:border-red-500/50 transition-all font-black tracking-widest uppercase",
                          isMobile ? "py-2.5 pl-11 pr-4 text-[10px]" : "py-4 pl-14 pr-6 text-xs"
                        )}
                      />
                    </div>
                  </div>

                  <div className={cn("flex-1 overflow-y-auto custom-scrollbar", isMobile ? "p-4 space-y-3" : "p-8 space-y-4")}>
                    {filteredChannels.length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center gap-6">
                        <MonitorPlay size={40} className="text-white/10" />
                        <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Aucune chaîne disponible</span>
                      </div>
                    ) : (
                      filteredChannels.map((ch, idx) => (
                        <div 
                          key={`${ch.id}-${idx}`}
                          className={cn(
                            "group relative rounded-[20px] md:rounded-[28px] transition-all cursor-pointer flex items-center border",
                            isMobile ? "p-3 gap-3" : "p-4 md:p-5 gap-4 md:gap-6",
                            channel.id === ch.id 
                              ? "bg-white/10 border-white/30" 
                              : idx === focusedIndex ? "bg-white/10 border-white/20" : "bg-[#0b0b0b] border-white/5 hover:border-white/20 hover:bg-[#111111]"
                          )}
                          onClick={() => {
                            onSelectChannel?.(ch);
                            setActiveOverlay('none');
                          }}
                        >
                          <div className={cn("bg-black/60 rounded-xl md:rounded-2xl border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500", isMobile ? "w-11 h-11 p-2" : "w-14 h-14 p-3")}>
                            <img src={ch.logo || undefined} alt="" className="max-h-full max-w-full object-contain filter drop-shadow-md" referrerPolicy="no-referrer" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-amber-500 leading-none">#{channels.indexOf(ch) + 1}</span>
                              <h4 className={cn("font-black uppercase tracking-tight truncate leading-none", isMobile ? "text-xs" : "text-sm md:text-base", channel.id === ch.id ? 'text-white' : 'text-white/90')}>
                                {ch.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="flex-1 h-0.5 md:h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-white/70 w-1/2" />
                               </div>
                               <span className={cn("text-white/30 font-black uppercase tracking-[0.1em] truncate shrink-0", isMobile ? "text-[8px]" : "text-[9px]")}>
                                {ch.category}
                              </span>
                            </div>
                          </div>
                          {channel.id === ch.id && (
                            <div className="bg-white/70 text-[8px] font-black px-2 py-1 rounded-lg text-white animate-pulse">LIVE</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-8 md:p-10 bg-black border-t border-white/10 flex items-center justify-between shrink-0">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Total</span>
                        <span className="text-sm font-black text-white">{filteredChannels.length} CANAUX</span>
                     </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

