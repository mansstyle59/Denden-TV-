import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';

interface FlixSplashProps {
  onFinish: () => void;
}

export default function FlixSplash({ onFinish }: FlixSplashProps) {
  const [show, setShow] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Play the synthesized Netflix "Ta-Dum!" classic chord
  const playTaDum = (muted: boolean) => {
    if (muted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // Sound 1: Deep cinematic rumbling sub-bass (starts at t=0)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(75, ctx.currentTime);
      // Sweeping frequency down slightly for that deep heavy impact
      osc1.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1.5);
      
      gain1.gain.setValueAtTime(0.001, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.15);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.8);

      const lpFilter = ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(140, ctx.currentTime);

      osc1.connect(lpFilter);
      lpFilter.connect(gain1);
      gain1.connect(ctx.destination);

      // Sound 2: Dramatic mid-to-high attack chord strikes (the "Ta-DUM" strike)
      // First quick pre-strike at t=0.08s
      setTimeout(() => {
        if (ctx.state === 'closed') return;
        const oscStrike1 = ctx.createOscillator();
        const gainStrike1 = ctx.createGain();
        oscStrike1.type = 'triangle';
        oscStrike1.frequency.setValueAtTime(110, ctx.currentTime); // Low A

        gainStrike1.gain.setValueAtTime(0.18, ctx.currentTime);
        gainStrike1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        const bpFilter1 = ctx.createBiquadFilter();
        bpFilter1.type = 'bandpass';
        bpFilter1.frequency.setValueAtTime(250, ctx.currentTime);

        oscStrike1.connect(bpFilter1);
        bpFilter1.connect(gainStrike1);
        gainStrike1.connect(ctx.destination);

        oscStrike1.start();
        oscStrike1.stop(ctx.currentTime + 0.4);
      }, 70);

      // Second, main brilliant impact strike at t=0.22s
      setTimeout(() => {
        if (ctx.state === 'closed') return;
        
        // Root + harmonic Fifth + high shine
        const oscA = ctx.createOscillator();
        const oscE = ctx.createOscillator();
        const oscHigh = ctx.createOscillator();
        
        const gainStrike2 = ctx.createGain();

        // Deep heavy root
        oscA.type = 'triangle';
        oscA.frequency.setValueAtTime(110, ctx.currentTime); // A2
        
        // Fifth warmth
        oscE.type = 'triangle';
        oscE.frequency.setValueAtTime(165, ctx.currentTime); // E3

        // Higher shiny overlay
        oscHigh.type = 'sine';
        oscHigh.frequency.setValueAtTime(330, ctx.currentTime); // E4

        gainStrike2.gain.setValueAtTime(0.001, ctx.currentTime);
        gainStrike2.gain.exponentialRampToValueAtTime(0.40, ctx.currentTime + 0.1);
        gainStrike2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);

        const bpFilter2 = ctx.createBiquadFilter();
        bpFilter2.type = 'bandpass';
        bpFilter2.frequency.setValueAtTime(450, ctx.currentTime);

        oscA.connect(bpFilter2);
        oscE.connect(bpFilter2);
        oscHigh.connect(bpFilter2);
        
        bpFilter2.connect(gainStrike2);
        gainStrike2.connect(ctx.destination);

        oscA.start();
        oscE.start();
        oscHigh.start();

        oscA.stop(ctx.currentTime + 2.2);
        oscE.stop(ctx.currentTime + 2.2);
        oscHigh.stop(ctx.currentTime + 2.2);
      }, 200);

      osc1.start();
      osc1.stop(ctx.currentTime + 2.0);
    } catch (e) {
      console.warn("Autoplay audio blocked or Web Audio not supported:", e);
    }
  };

  useEffect(() => {
    // Check if user has muted previously
    const savedMute = localStorage.getItem('denden_flix_splash_muted') === 'true';
    setIsMuted(savedMute);

    // Give a 150ms beat so browser layout loads, then trigger the audio
    const audioTimer = setTimeout(() => {
      playTaDum(savedMute);
    }, 150);

    // Auto navigate to main layout after intro completes
    const dismissTimer = setTimeout(() => {
      setShow(false);
      setTimeout(onFinish, 600); // Wait for AnimatePresence fade-out transition
    }, 2800);

    return () => {
      clearTimeout(audioTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('denden_flix_splash_muted', String(nextMuted));
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] bg-[#141414] flex flex-col items-center justify-center p-6 overflow-hidden select-none"
        >
          {/* Subtle Dark Vignette Atmosphere */}
          <div className="absolute inset-0 bg-[#000000]" />
          
          {/* Tilted Posters Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 mix-blend-screen flex items-center justify-center">
            <motion.div 
              initial={{ scale: 1.2, rotate: -15, opacity: 0 }}
              animate={{ scale: 1.5, rotate: -15, opacity: 1 }}
              transition={{ duration: 3, ease: "easeOut" }}
              className="flex gap-4 p-10 w-[200vw]"
            >
              {/* Columns of posters */}
              {[
                ["https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg", "https://image.tmdb.org/t/p/w500/A1nwMwDhaQkQ8R9l8vV6h42r0x3.jpg", "https://image.tmdb.org/t/p/w500/1XDDXPXGiI8id7MrUxK36ke7wow.jpg"],
                ["https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg", "https://image.tmdb.org/t/p/w500/1rTfSXXfI1oFhP215sYJ53N4Nq7.jpg", "https://image.tmdb.org/t/p/w500/8tBCA4y3sX5O7h1KzF5TqK9hE5V.jpg"],
                ["https://image.tmdb.org/t/p/w500/A1nwMwDhaQkQ8R9l8vV6h42r0x3.jpg", "https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg", "https://image.tmdb.org/t/p/w500/1XDDXPXGiI8id7MrUxK36ke7wow.jpg"],
                ["https://image.tmdb.org/t/p/w500/1rTfSXXfI1oFhP215sYJ53N4Nq7.jpg", "https://image.tmdb.org/t/p/w500/8tBCA4y3sX5O7h1KzF5TqK9hE5V.jpg", "https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg"],
                ["https://image.tmdb.org/t/p/w500/1XDDXPXGiI8id7MrUxK36ke7wow.jpg", "https://image.tmdb.org/t/p/w500/A1nwMwDhaQkQ8R9l8vV6h42r0x3.jpg", "https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg"],
              ].map((col, i) => (
                <div key={i} className="flex flex-col gap-4 -mt-[100px]" style={{ transform: `translateY(${i % 2 === 0 ? '50px' : '-50px'})` }}>
                  {col.map((poster, j) => (
                    <img key={j} src={poster} alt="poster" className="w-48 h-72 object-cover rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] opacity-60" />
                  ))}
                </div>
              ))}
            </motion.div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-[#031d45]/80 via-transparent to-[#8a0606]/80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_80%)] pointer-events-none" />
          
          {/* Vertical streaming light bar effect in the center of background */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-48 bg-gradient-to-r from-transparent via-[#E50914]/[0.02] to-transparent pointer-events-none" />

          {/* Cinematic Red Zooming Text Logo */}
          <motion.div
            initial={{ scale: 0.65, opacity: 0, filter: "brightness(0.5) blur(4px)" }}
            animate={{ 
              scale: [0.65, 1, 1.15, 2.5], 
              opacity: [0, 1, 1, 0],
              filter: ["brightness(0.5) blur(4px)", "brightness(1) blur(0px)", "brightness(1.2) blur(0px)", "brightness(2) blur(8px)"]
            }}
            transition={{ 
              duration: 2.8, 
              times: [0, 0.25, 0.75, 1],
              ease: [0.12, 0, 0.15, 1] 
            }}
            className="flex flex-col items-center justify-center relative"
          >
            {/* Ambient neon backdrop glow */}
            <div className="absolute -inset-20 bg-[#E50914]/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Denden Flix custom logo wordmark */}
            <h1 
              className="text-7xl md:text-[9rem] tracking-tighter text-[#E50914] transform uppercase select-none relative z-10 antialiased"
              style={{ fontFamily: "'Bebas Neue', sans-serif", transform: "scaleY(1.15)" }}
            >
              DENDEN FLIX
            </h1>

            {/* Simulated letter slice effect to match premium intros */}
            <div className="absolute w-[120%] h-0.5 bg-gradient-to-r from-transparent via-red-500/35 to-transparent top-1/2 -translate-y-1/2 blur-[1px] mix-blend-screen" />
          </motion.div>

          {/* Bottom Indicators & Toolbar */}
          <div className="absolute bottom-12 left-0 right-0 px-10 flex items-center justify-between z-50">
            {/* Audio Feedback control */}
            <button 
              onClick={handleToggleMute}
              className="p-3 bg-black/60 hover:bg-black/95 text-white/60 hover:text-white rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-90"
              title={isMuted ? "Activer le son" : "Désactiver le son"}
              id="splash-sound-control-btn"
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="animate-pulse" />}
            </button>

            {/* Skip Option */}
            <button
              onClick={() => {
                setShow(false);
                setTimeout(onFinish, 100);
              }}
              className="px-5 py-2 bg-black/50 hover:bg-[#E50914] text-white/80 hover:text-white rounded-full border border-white/10 hover:border-[#E50914] backdrop-blur-md text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md"
              id="skip-splash-btn"
            >
              Passer l'intro
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
