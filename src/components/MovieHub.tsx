import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Info, Plus, Star, Clock, Calendar, Globe, User, 
  X, Share2, Film, Search, Settings, Filter, ArrowRight,
  TrendingUp, Award, Sparkles, Tv, Layers
} from 'lucide-react';
import { Movie } from '../types';
import { cn } from '../lib/utils';

interface MovieHubProps {
  onChannelSelect: (movie: Movie) => void;
  onGoToSettings?: () => void;
  deviceType: string;
  continueWatching?: {[id: string]: number};
  moviesList?: Movie[];
}

export default function MovieHub({ 
  onChannelSelect, 
  onGoToSettings, 
  deviceType,
  continueWatching = {},
  moviesList
}: MovieHubProps) {
  const [movies, setMovies] = useState<Movie[]>(moviesList || []);
  const [loading, setLoading] = useState(!moviesList);
  const isMobile = deviceType === 'mobile' || deviceType === 'tablet';
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Tous");
  
  useEffect(() => {
    if (!moviesList) {
      fetchMovies();
    } else {
      setMovies(moviesList);
      setLoading(false);
    }
  }, [moviesList]);

  const fetchMovies = async () => {
    try {
      const res = await axios.get('/api/movies');
      setMovies(res.data);
    } catch (err) {
      console.error('Failed to fetch movies:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedMovies = useMemo(() => {
    return [...movies].sort((a, b) => parseInt(b.year) - parseInt(a.year));
  }, [movies]);

  // Dynamic Genres extracted directly from database
  const availableGenres = useMemo(() => {
    const list = new Set<string>();
    movies.forEach(m => {
      if (m.genres && Array.isArray(m.genres)) {
        m.genres.forEach(g => {
          if (g && g.trim()) {
            list.add(g.trim());
          }
        });
      }
    });
    
    const genres = ["Tous"];
    
    return [...genres, ...Array.from(list)];
  }, [movies]);

  // Filter movies based on search and selected genre
  const filteredMovies = useMemo(() => {
    return sortedMovies.filter(m => {
      const matchesSearch = searchQuery.trim() === "" || 
        (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.genres && Array.isArray(m.genres) && m.genres.some(g => (g || '').toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (m.director && (m.director || '').toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGenre = selectedGenre === "Tous" || 
        (m.genres && Array.isArray(m.genres) && m.genres.some(g => (g || '').toLowerCase() === selectedGenre.toLowerCase()));

      return matchesSearch && matchesGenre;
    });
  }, [sortedMovies, searchQuery, selectedGenre]);

  // Pick the spotlight movie (e.g., highest visual rating or newest)
  const spotlightMovie = useMemo(() => {
    if (movies.length === 0) return null;
    // Prefer movies with trailer and high IMDb score, or newest
    const candidates = movies.filter(m => m.banner && m.summary);
    if (candidates.length > 0) {
      return candidates.sort((a, b) => (b.ratingImdb || 0) - (a.ratingImdb || 0))[0];
    }
    return movies[0];
  }, [movies]);

  // Movies with progress
  const continueWatchingMovies = useMemo(() => {
    const ids = Object.keys(continueWatching);
    if (ids.length === 0) return [];
    return movies.filter(m => ids.includes(m.id))
      .map(m => ({ ...m, progress: continueWatching[m.id] }))
      .sort((a, b) => (b.progress || 0) - (a.progress || 0));
  }, [movies, continueWatching]);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-32">
      {/* 1. Immersive Spotlight Hero Section */}
      {spotlightMovie && !searchQuery && selectedGenre === "Tous" && (
        <div className="relative w-full h-[65vh] md:h-[75vh] mb-12 overflow-hidden px-4 sm:px-12">
          {/* Backdrop Blur Mirror */}
          <div className="absolute inset-0 bg-[#070707]" />
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 md:opacity-50 transition-all duration-1000 scale-105 filter blur-[2px] md:blur-none"
            style={{ 
              backgroundImage: `url(${spotlightMovie.banner || spotlightMovie.poster})`,
              maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'
            }}
          />
          {/* Real Gradient Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-full md:w-2/3 bg-gradient-to-r from-black via-black/60 to-transparent" />

          {/* Epic content overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-14 md:pb-16 max-w-4xl z-10">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 bg-indigo-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-600/30">
                  <Sparkles size={11} className="animate-spin duration-3000" />
                  À la une
                </span>
                <span className="text-yellow-500 text-xs font-black flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-yellow-500/20">
                  <Star size={12} className="fill-current text-yellow-500" /> {spotlightMovie.ratingImdb || '8.2'} IMDb
                </span>
                <span className="text-white/60 text-xs font-black bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/5">
                  {spotlightMovie.year}
                </span>
                <span className="text-white/60 text-xs font-black bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/5 uppercase">
                  {spotlightMovie.quality}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none drop-shadow-2xl">
                {spotlightMovie.title}
              </h2>

              <p className="text-white/60 text-[10px] sm:text-xs font-medium line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl drop-shadow">
                {spotlightMovie.summary}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <button 
                  onClick={() => onChannelSelect(spotlightMovie)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-600/30 focus:ring-4 focus:ring-white/80 focus:outline-none text-xs"
                >
                  <Play size={18} fill="currentColor" />
                  Lancer le film
                </button>
                <button 
                  onClick={() => setSelectedMovie(spotlightMovie)}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-full flex items-center justify-center gap-3 transition-all active:scale-95 border border-white/10 backdrop-blur-md focus:ring-4 focus:ring-indigo-600/50 focus:outline-none text-xs"
                >
                  <Info size={18} />
                  Plus d'informations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Continuer à regarder */}
      {continueWatchingMovies.length > 0 && !searchQuery && selectedGenre === "Tous" && (
        <div className="px-6 sm:px-12 mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
            <Clock size={14} className="text-indigo-600" /> Continuer à regarder
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
            {continueWatchingMovies.map((movie) => (
              <motion.div
                key={`cw-${movie.id}`}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group border border-white/5 bg-neutral-900"
                onClick={() => onChannelSelect(movie)}
              >
                <img src={movie.banner || movie.poster} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black">
                  <h4 className="text-white font-bold text-[10px] sm:text-xs line-clamp-1">{movie.title}</h4>
                  <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ width: '45%' }} />
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <Play size={16} fill="currentColor" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Continuer à regarder section logic... */}
      
      {/* 3. Dernières Sorties / Tendances */}
      {!searchQuery && selectedGenre === "Tous" && (
        <div className="px-6 sm:px-12 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-600" /> Dernières Sorties
            </h3>
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600/20" />
            </div>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
            {movies.slice(0, 10).map((movie) => (
              <motion.div
                key={`trending-${movie.id}`}
                whileHover={{ scale: 1.05, y: -5 }}
                className={cn(
                  "snap-start shrink-0 aspect-[2/3] rounded-[24px] overflow-hidden cursor-pointer group border border-white/5 relative",
                  isMobile ? "w-[150px]" : "w-[200px]"
                )}
                onClick={() => setSelectedMovie(movie)}
              >
                <img src={movie.poster} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-80" />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-[9px] font-black">{movie.quality}</div>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-[10px] font-black text-white uppercase truncate drop-shadow-md">{movie.title}</h4>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Premium Category Header & Controls */}
      <div className="px-6 sm:px-12 mb-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <Film className="text-indigo-600" size={24} />
            BIBLIOTHÈQUE CINÉMA
          </h1>
          <p className="text-white/40 text-[9px] sm:text-[10px] mt-1.5 uppercase font-black tracking-widest flex items-center gap-2">
            <span>{filteredMovies.length} titres</span>
            <span className="w-1 h-1 rounded-full bg-indigo-600" />
            <span>Serveur Ultra-Rapide</span>
          </p>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          {/* Modern search input with magnifying animation */}
          <div className="relative flex-1 sm:flex-none sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-500 group-hover:scale-110 transition-all duration-300" size={16} />
            <input 
              type="text"
              placeholder="Chercher un film..."
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white/[0.06] hover:bg-white/[0.05] transition-all font-bold text-sm uppercase tracking-wider"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick config button for adding new content */}
          {onGoToSettings && (
            <button 
              onClick={onGoToSettings}
              className="p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl text-white/50 hover:text-white transition-all border border-white/5 group focus:ring-4 focus:ring-indigo-600/60 focus:outline-none"
              title="Paramètres films"
            >
              <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Horizontal Genre Pills Selection */}
      {availableGenres.length > 1 && (
        <div className="px-6 sm:px-12 mb-10 overflow-x-auto scrollbar-hide flex gap-3 pb-3 mask-image-edge">
          {availableGenres.map((genre) => {
            const isActive = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest border transition-all duration-300 whitespace-nowrap active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-600",
                  isActive 
                    ? "bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-600/30 font-black scale-105" 
                    : "bg-white/[0.03] text-white/50 border-white/5 hover:border-white/20 hover:text-white"
                )}
              >
                {genre}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Elegant Glassmorphism Cards Grid */}
      <div className="px-6 sm:px-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
        <AnimatePresence mode="popLayout">
          {filteredMovies.map((movie) => (
            <motion.div
              key={movie.id}
              layout
              tabIndex={0}
              data-nav-id={`movie-${movie.id}`}
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ 
                y: -12, 
                scale: 1.05,
                borderColor: "rgba(0, 168, 225, 0.45)",
                boxShadow: "0 25px 45px rgba(0, 168, 225, 0.2)"
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative aspect-[2/3] rounded-[24px] overflow-hidden cursor-pointer shadow-2xl group border border-white/5 focus:outline-none focus:ring-4 focus:ring-red-650/60 focus:scale-105 focus:z-10 focus:shadow-[0_0_30px_rgba(0,168,225,0.5)]"
              onClick={() => setSelectedMovie(movie)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedMovie(movie);
                }
              }}
            >
              {/* Image poster */}
              <img 
                src={movie.poster} 
                alt={movie.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              
              {/* Premium dark gradient bottom overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90 group-hover:via-black/50 transition-all duration-300 flex flex-col justify-end p-4">
                <div className="flex items-center justify-between gap-2 mb-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <span className="text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-sm tracking-wider uppercase leading-none">
                    {movie.quality}
                  </span>
                  <span className="text-[9px] font-bold text-white/50 tracking-wide">
                    {movie.year}
                  </span>
                </div>
                <h4 className="text-white font-black text-[11px] sm:text-xs line-clamp-1 group-hover:text-indigo-400 transition-colors duration-300 drop-shadow-md">
                  {movie.title}
                </h4>
                <div className="flex items-center justify-between mt-1 transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex items-center gap-1.5">
                    <Star size={11} className="text-yellow-500 fill-current" />
                    <span className="text-[10px] font-black text-white/60">{movie.ratingImdb || 'N/A'}</span>
                  </div>
                  {movie.genres && movie.genres[0] && (
                    <span className="text-[9px] font-extrabold text-white/30 uppercase tracking-widest truncate max-w-[80px]">
                      {movie.genres[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Nouveau / Populaire Tags */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {movie.isNew && (
                  <div className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-widest border border-indigo-500/20">
                    Nouveau
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* No movies fallback state */}
      {filteredMovies.length === 0 && (
        <div className="h-[40vh] flex flex-col items-center justify-center text-center px-6">
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-full mb-4 animate-pulse">
            <Search size={40} className="text-white/20" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Aucun film disponible</h2>
          <p className="text-white/40 text-xs mt-2 max-w-sm">Désolé, aucun film ne correspond à votre recherche ou catégorie sélectionnée.</p>
          <button 
            onClick={() => { setSearchQuery(""); setSelectedGenre("Tous"); }}
            className="mt-6 text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-400 tracking-widest focus:outline-none"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* 5. Details Modal - VIP High-Fidelity experience */}
      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 md:p-12 overflow-hidden"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedMovie(null)} />
            
            <motion.div
              layoutId={`movie-${selectedMovie.id}`}
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="bg-[#0b0b0b] w-full max-w-5xl max-h-[92vh] rounded-[32px] overflow-y-auto relative shadow-2xl border border-white/10 scrollbar-hide flex flex-col"
            >
              {/* Header Close button */}
              <button 
                onClick={() => setSelectedMovie(null)}
                className="absolute top-6 right-6 z-50 p-2.5 bg-black/60 hover:bg-indigo-600 rounded-full text-white/80 hover:text-white transition-all duration-300 shadow-xl border border-white/10 hover:border-transparent active:scale-95"
              >
                <X size={18} />
              </button>

              {/* Wide banner Section */}
              <div className="relative h-[250px] sm:h-[480px] w-full shrink-0">
                <img 
                  src={selectedMovie.banner || selectedMovie.poster} 
                  alt={selectedMovie.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {/* Premium Gradient Transitions */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/40 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0b0b] to-transparent" />

                {/* Floating identity content */}
                <div className="absolute bottom-0 left-0 p-6 sm:p-12 w-full flex flex-col md:flex-row md:items-end justify-between gap-6 z-10">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                      <span className="text-yellow-500 font-extrabold flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-md">
                        <Star size={11} className="fill-current text-yellow-500" /> {selectedMovie.ratingImdb || 'N/A'} IMDb
                      </span>
                      <span className="text-white/60 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">{selectedMovie.year}</span>
                      <span className="text-white/60 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">{selectedMovie.duration || 'N/A'}</span>
                      <span className="border border-indigo-600/30 text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded-md text-[9px] tracking-widest font-black uppercase">{selectedMovie.quality}</span>
                    </div>

                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-tight drop-shadow-2xl">
                      {selectedMovie.title}
                    </h2>
                    
                    {selectedMovie.originalTitle && (
                      <p className="text-white/40 text-xs sm:text-sm font-bold uppercase tracking-wider">
                        Titre original : {selectedMovie.originalTitle}
                      </p>
                    )}
                  </div>

                  {/* Immediate actions */}
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-indigo-600/30 text-[10px] uppercase tracking-widest focus:ring-4 focus:ring-white/80 focus:outline-none"
                      onClick={() => {
                        onChannelSelect(selectedMovie);
                        setSelectedMovie(null);
                      }}
                      id="watch-movie-btn"
                    >
                      <Play size={14} fill="currentColor" /> Regarder maintenant
                    </button>
                    <button 
                      className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-full font-black flex items-center justify-center gap-3 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                      onClick={() => alert("Signalement envoyé à l'administrateur concernant la source du film.")}
                      id="report-movie-btn"
                    >
                      Reporter un problème
                    </button>
                  </div>
                </div>
              </div>

              {/* Details and synopsis container */}
              <div className="p-6 sm:p-12 pt-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Left Column (Main Info) */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Synopsis */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] flex items-center gap-2">
                        <Layers size={14} /> Synopsis & Résumé
                      </h3>
                      <p className="text-xs sm:text-sm leading-relaxed text-white/70 font-medium">
                        {selectedMovie.summary || "Aucun synopsis disponible pour ce titre."}
                      </p>
                    </div>

                    {/* Metadata boxes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">Réalisateur</span>
                        <div className="font-extrabold text-sm text-white/80">{selectedMovie.director || "N/A"}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">Pays d'origine</span>
                        <div className="font-extrabold text-sm text-white/80">{selectedMovie.country || "N/A"}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">Langue</span>
                        <div className="font-extrabold text-sm text-white/80">{selectedMovie.language || "N/A"}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">Audience</span>
                        <div className="font-extrabold text-sm text-emerald-500 uppercase flex items-center gap-1.5">
                          <User size={13} /> Tout Public
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Cast Cards */}
                    {selectedMovie.actors && Array.isArray(selectedMovie.actors) && selectedMovie.actors.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-white/40 tracking-[0.2em]">Casting Principal</h3>
                        <div className="flex flex-wrap gap-2.5">
                          {selectedMovie.actors.map((actor, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 pl-3 pr-4 py-2 rounded-full">
                              <div className="w-5 h-5 rounded-full bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-[9px] uppercase">
                                {actor.charAt(0)}
                              </div>
                              <span className="text-[11px] font-bold text-white/80">{actor}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column (Trailer & Extra list) */}
                  <div className="space-y-8">
                    {/* Beautiful Trailer card */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
                      <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                        <Play size={14} fill="currentColor" /> Bande-annonce
                      </h3>
                      {selectedMovie.trailerUrl ? (
                        <div className="aspect-video bg-black rounded-xl overflow-hidden relative group border border-white/10 shadow-lg">
                          <img 
                            src={selectedMovie.trailerUrl.includes('v=') 
                              ? `https://img.youtube.com/vi/${selectedMovie.trailerUrl.split('v=')[1]}/hqdefault.jpg`
                              : selectedMovie.poster
                            }
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-500 scale-105 group-hover:scale-110"
                            alt="Trailer thumbnail"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button 
                              onClick={() => {
                                try {
                                  window.open(selectedMovie.trailerUrl, '_blank');
                                } catch (e) {
                                  console.warn("Popup blocked or not supported", e);
                                }
                              }}
                              className="p-3 bg-indigo-600 backdrop-blur-md rounded-full text-white hover:scale-110 shadow-xl shadow-indigo-600/40 transition-transform active:scale-95"
                            >
                              <Play size={18} fill="currentColor" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-white/[0.02] border border-white/5 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4">
                          <span className="text-[10px] text-white/20 font-black uppercase tracking-wider">Trailer Non disponible</span>
                        </div>
                      )}
                    </div>

                    {/* Genres tag list */}
                    {selectedMovie.genres && Array.isArray(selectedMovie.genres) && selectedMovie.genres.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase text-white/40 tracking-[0.2em]">Genres associés</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedMovie.genres.map((genre, idx) => (
                            <span 
                              key={idx} 
                              className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
