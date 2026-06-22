import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Film, Plus, X, Search, Trash2, Sliders, CheckCircle, Loader2, ArrowLeft,
  Database, Info, AlertTriangle, Play, Globe, Star, AppWindow, Eye, 
  Settings, Image as ImageIcon, Users, BookOpen, Clock, FileVideo, Sparkles, Zap
} from 'lucide-react';
import { Movie } from '../types';
import { cn } from '../lib/utils';

interface MovieSettingsProps {
  movies: Movie[];
  onAddMovie: (movie: Partial<Movie>) => Promise<void>;
  onUpdateMovie: (id: string, movie: Partial<Movie>) => Promise<void>;
  onDeleteMovie: (id: string) => Promise<void>;
  onBack?: () => void;
}

export default function MovieSettings({ 
  movies, 
  onAddMovie, 
  onUpdateMovie, 
  onDeleteMovie,
  onBack 
}: MovieSettingsProps) {
  // Movie management states
  const [editingMovie, setEditingMovie] = useState<Partial<Movie> | null>(null);
      const [movieSearchQuery, setMovieSearchQuery] = useState("");
  const [isSavingMovie, setIsSavingMovie] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const localFileRef = useRef<HTMLInputElement>(null);

  // Intelligent 1-Click Addition states
  const [isManualMode, setIsManualMode] = useState(false);
  const [instantStreamUrl, setInstantStreamUrl] = useState("");

  // Batch import states
  const [showBatchTools, setShowBatchTools] = useState(false);
  const [batchInput, setBatchInput] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<{title: string, year?: string, videoUrl?: string}[]>([]);

  // Tag Inputs
  const [genreInput, setGenreInput] = useState("");
  const [actorInput, setActorInput] = useState("");
  const [deletingMovieId, setDeletingMovieId] = useState<string | null>(null);

  const triggerFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(""), 4000);
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create a temporary Blob URL for the session
    const blobUrl = URL.createObjectURL(file);
    if (editingMovie) {
      setEditingMovie({
        ...editingMovie,
        title: editingMovie.title || file.name.replace(/\.[^/.]+$/, ""),
        videoUrl: blobUrl
      });
      triggerFeedback("Vidéo locale chargée ! (Note: le lien expirera après rafraîchissement)");
    }
  };

  const handleSmartImport = async () => {
    if (!batchInput.trim()) return;
    setIsBatchProcessing(true);
    try {
      // 1. Try to parse as M3U first (basic client-side)
      if (batchInput.includes("#EXTM3U") || batchInput.includes("#EXTINF")) {
        const lines = batchInput.split('\n');
        const results: any[] = [];
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith("#EXTINF")) {
            const titleMatch = lines[i].match(/,(.*)$/);
            const nextLine = lines[i+1]?.trim();
            if (titleMatch && nextLine && nextLine.startsWith('http')) {
              results.push({
                title: titleMatch[1].trim(),
                videoUrl: nextLine
              });
            }
          }
        }
        if (results.length > 0) {
          setBatchResults(results);
          triggerFeedback(`${results.length} films détectés dans le M3U !`);
          return;
        }
      }

      // 2. Fallback basic M3U parsing
      const lines = batchInput.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('#'));
      const fallbackResults = lines.map(l => ({ title: l.trim() }));
      setBatchResults(fallbackResults);
      triggerFeedback(`${fallbackResults.length} lignes trouvées !`);
    } catch (err) {
      triggerFeedback("Échec de l'importation");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const autoImportItem = async (item: any, index: number) => { if (!item?.title) return; setIsBatchProcessing(true); try { await onAddMovie({ title: item.title, year: item.year || new Date().getFullYear().toString(), videoUrl: item.videoUrl || "", quality: "HD", genres: ["Action"], summary: "Importé automatiquement." }); triggerFeedback("Film ajouté."); } catch (err) {} finally { setIsBatchProcessing(false); } };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // We can't "upload" easily to a cloud storage here, but we can treat it as a "Local" reference
    // Or if it's an M3U, we read it.
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBatchInput(content);
      triggerFeedback("Fichier chargé. Cliquez sur 'Analyser' pour importer.");
    };
    reader.readAsText(file);
  };

  const handleSaveMovie = async () => {
    if (!editingMovie?.title?.trim()) {
      triggerFeedback("Le titre du film est obligatoire");
      return;
    }
    if (!editingMovie?.videoUrl?.trim()) {
      triggerFeedback("L'URL de diffusion est obligatoire");
      return;
    }
    setIsSavingMovie(true);
    try {
      if (editingMovie.id) {
        await onUpdateMovie(editingMovie.id, editingMovie);
        triggerFeedback("Le film a été mis à jour dans la bibliothèque !");
      } else {
        await onAddMovie(editingMovie);
        triggerFeedback("Le film a été enregistré avec succès !");
      }
      setEditingMovie(null);
    } catch (err) {
      triggerFeedback("Erreur lors de la sauvegarde du film ");
    } finally {
      setIsSavingMovie(false);
    }
  };

  // Tags helpers
  const handleAddGenre = () => {
    if (!genreInput.trim()) return;
    const currentGenres = editingMovie?.genres || [];
    if (!currentGenres.includes(genreInput.trim())) {
      setEditingMovie({
        ...editingMovie,
        genres: [...currentGenres, genreInput.trim()]
      });
    }
    setGenreInput("");
  };

  const handleRemoveGenre = (genre: string) => {
    const currentGenres = editingMovie?.genres || [];
    setEditingMovie({
      ...editingMovie,
      genres: currentGenres.filter(g => g !== genre)
    });
  };

  const handleAddActor = () => {
    if (!actorInput.trim()) return;
    const currentActors = editingMovie?.actors || [];
    if (!currentActors.includes(actorInput.trim())) {
      setEditingMovie({
        ...editingMovie,
        actors: [...currentActors, actorInput.trim()]
      });
    }
    setActorInput("");
  };

  const handleRemoveActor = (actor: string) => {
    const currentActors = editingMovie?.actors || [];
    setEditingMovie({
      ...editingMovie,
      actors: currentActors.filter(a => a !== actor)
    });
  };

  return (
    <div className="space-y-8 select-none">
      {/* Toast notifier banner */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-8 right-8 bg-[#111] text-emerald-400 font-extrabold px-6 py-4 rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-emerald-500/20 z-[100] text-xs flex items-center gap-3 backdrop-blur-xl"
          >
            <CheckCircle size={18} className="text-emerald-400" />
            <span>{feedbackMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all border border-white/5"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
              <Settings className="text-red-650" size={28} />
              PARAMÈTRES FILMS
            </h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
              Configuration avancée du catalogue cinéphile
            </p>
          </div>
        </div>
        
        {!editingMovie && (
          <div className="flex gap-3">
            <button 
              onClick={() => setShowBatchTools(!showBatchTools)}
              className={cn(
                "px-6 py-4 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border active:scale-95",
                showBatchTools 
                  ? "bg-white text-black border-white" 
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
              )}
            >
              <Database size={16} /> Import Intelligent
            </button>
            <button 
              onClick={() => {
                setShowBatchTools(false);
                setMovieSearchQuery("");
                setInstantStreamUrl("");
                setIsManualMode(false);
                setEditingMovie({ 
                  title: '', videoUrl: '', genres: ["Action", "Drame"], actors: [], 
                  quality: 'HD', year: new Date().getFullYear().toString(),
                  director: '', country: 'France', language: 'Français'
                });
              }}
              className="px-8 py-4 bg-red-650 hover:bg-red-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-600/20 active:scale-95 border border-red-500/10 focus:outline-none"
            >
              <Plus size={18} /> Ajouter un film
            </button>
          </div>
        )}
      </div>

      {/* Batch / Smart Import Tools */}
      <AnimatePresence>
        {showBatchTools && !editingMovie && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-8 mb-8 space-y-8">
              <div className="flex flex-col lg:flex-row gap-10">
                {/* Left: Input */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                       <Database size={16} className="text-red-500" /> Analyseur de contenu (M3U, Texte, Liste)
                    </label>
                    <div className="flex items-center gap-2">
                       <input 
                         type="file" 
                         id="movie-file-upload" 
                         className="hidden" 
                         accept=".m3u,.txt,.mp4" 
                         onChange={handleFileUpload}
                       />
                       <label 
                         htmlFor="movie-file-upload"
                         className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white/50 hover:text-white transition-all cursor-pointer border border-white/5"
                       >
                         Charger .m3u / local
                       </label>
                    </div>
                  </div>
                  <textarea 
                    className="w-full h-48 bg-black border border-white/10 rounded-2xl p-6 text-xs font-mono text-white/80 placeholder:text-white/10 focus:ring-2 focus:ring-red-650/40 outline-none resize-none leading-relaxed"
                    placeholder={"Collez ici le contenu d'un fichier M3U ou une simple liste de films...\nEx:\n#EXTINF:-1,Inception (2010)\nhttps://server.com/inception.mp4\n\nOu juste des noms:\nLe Parrain\nGladiator 2000"}
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                  />
                  <button 
                    onClick={handleSmartImport}
                    disabled={isBatchProcessing || !batchInput.trim()}
                    className="w-full py-4 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest hover:bg-red-650 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-30 active:scale-95 shadow-2xl"
                  >
                    {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    Analyser avec l'IA Cinéphile
                  </button>
                </div>

                {/* Right: Results / Queue */}
                <div className="lg:w-[400px] flex flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest">
                      File d'attente intelligente ({batchResults.length})
                    </label>
                    {batchResults.length > 0 && (
                       <button onClick={() => setBatchResults([])} className="text-[10px] font-black text-red-500 hover:underline uppercase">Vider</button>
                    )}
                  </div>
                  <div className="flex-1 bg-black border border-white/5 rounded-2xl overflow-y-auto max-h-[300px] p-2 space-y-1">
                    {batchResults.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between group">
                        <div className="min-w-0 flex-1 pr-4">
                           <div className="text-[11px] font-black text-white uppercase truncate">{item.title}</div>
                           <div className="text-[9px] text-white/30 font-bold uppercase mt-0.5">
                             {item.year || (item.videoUrl ? 'Lien détecté' : 'Métadonnées à chercher')}
                           </div>
                        </div>
                        <button 
                          onClick={() => autoImportItem(item, idx)}
                          disabled={isBatchProcessing}
                          className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-500 hover:text-white"
                          title="Importer maintenant"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ))}
                    {batchResults.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-white/10 p-8 text-center">
                         <Database size={32} className="mb-3 opacity-20" />
                         <p className="text-[10px] font-bold uppercase tracking-widest">Aucun film en attente</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                     <p className="text-[10px] text-emerald-400 font-black leading-tight uppercase flex items-center gap-2">
                       <CheckCircle size={12} /> Mode intelligent activé
                     </p>
                     <p className="text-[9px] text-white/30 mt-1">
                     </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Editing / Adding form with Realestate design */}
      <AnimatePresence>
        {editingMovie && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="bg-neutral-950/40 border border-white/10 rounded-[32px] p-6 sm:p-10 relative overflow-hidden"
          >
            {/* Close visual form */}
            <button 
              onClick={() => setEditingMovie(null)} 
              className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-red-650 text-white/50 hover:text-white rounded-full transition-all border border-white/5 hover:border-transparent active:scale-95"
            >
              <X size={18}/>
            </button>

            <div className="flex items-center gap-3 mb-8">
               <div className="p-3.5 bg-red-650/10 rounded-2xl text-red-650 border border-red-650/20">
                 <Film size={22} />
               </div>
               <div>
                 <h4 className="text-lg font-black text-white uppercase tracking-wider">
                   {editingMovie.id ? `Éditer les paramètres : ${editingMovie.title}` : "Création Manuelle"}
                 </h4>
                 <p className="text-white/40 text-xs font-bold tracking-widest uppercase">
                   Double colonne avec prévisualisation temps réel
                 </p>
               </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                
                {/* Left Form controls (span 2) */}
                <div className="xl:col-span-2 space-y-8">
                  {/* Main sections */}
                  <div className="space-y-6">
                    <h5 className="text-xs font-black uppercase text-white/40 tracking-widest pb-2 border-b border-white/5 flex items-center gap-2">
                      <Database size={14} className="text-red-650" /> 1. Propriétés d'identité
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Titre Français</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                          value={editingMovie.title || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Titre Original</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                          value={editingMovie.originalTitle || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, originalTitle: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Année de Sortie</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                          value={editingMovie.year || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, year: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                          type="number"
                          step="0.1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Note IMDb (ex: 8.1)</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                          type="number"
                          step="0.1"
                          value={editingMovie.ratingImdb || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, ratingImdb: parseFloat(e.target.value) || undefined})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Qualité Vidéo</label>
                        <select 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40 cursor-pointer"
                          value={editingMovie.quality || "HD"}
                          onChange={(e) => setEditingMovie({...editingMovie, quality: e.target.value as any})}
                        >
                          <option value="SD">SD (Basse)</option>
                          <option value="HD">HD (Haute Définition)</option>
                          <option value="FullHD">Full HD 1080p</option>
                          <option value="4K">4K UHD</option>
                          <option value="8K">8K Cine</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Sources info */}
                  <div className="space-y-6">
                    <h5 className="text-xs font-black uppercase text-white/40 tracking-widest pb-2 border-b border-white/5 flex items-center gap-2">
                      <Play size={14} className="text-red-650" /> 2. Coordonnées de diffusion
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5 flex-1">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center justify-between">
                          <span>URL Flux Vidéo principal (.mp4, .m3u8, direct)</span>
                          <span className="text-red-500/60 lowercase italic">Ou choisir local</span>
                        </label>
                        <div className="flex gap-2">
                          <input 
                            className="bg-black border border-white/10 rounded-xl py-3.5 px-4 text-white w-full text-xs font-mono outline-none focus:ring-1 focus:ring-red-650/40"
                            placeholder="https://..."
                            value={editingMovie.videoUrl || ""}
                            onChange={(e) => setEditingMovie({...editingMovie, videoUrl: e.target.value})}
                          />
                          <input 
                            type="file" 
                            ref={localFileRef} 
                            className="hidden" 
                            accept="video/*" 
                            onChange={handleLocalFileSelect}
                          />
                          <button 
                            onClick={() => localFileRef.current?.click()}
                            type="button"
                            className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center justify-center text-white/40 hover:text-white"
                            title="Sélectionner un fichier local"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">URL Bande-annonce (YouTube)</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3.5 px-4 text-white w-full text-xs font-mono outline-none focus:ring-1 focus:ring-red-650/40"
                          placeholder="https://youtube.com/watch?v=..."
                          value={editingMovie.trailerUrl || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, trailerUrl: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Production Metadata */}
                  <div className="space-y-6">
                    <h5 className="text-xs font-black uppercase text-white/40 tracking-widest pb-2 border-b border-white/5 flex items-center gap-2">
                      <Globe size={14} className="text-red-650" /> 3. Production & Métadonnées
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Réalisateur</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                          value={editingMovie.director || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, director: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Pays</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                          value={editingMovie.country || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, country: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Langue</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                          value={editingMovie.language || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, language: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Durée (ex: 2h 15min)</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                          placeholder="2h 15min"
                          value={editingMovie.duration || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, duration: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visual assets & lists */}
                  <div className="space-y-6">
                    <h5 className="text-xs font-black uppercase text-white/40 tracking-widest pb-2 border-b border-white/5 flex items-center gap-2">
                      <ImageIcon size={14} className="text-red-650" /> 4. Éléments Graphiques
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Lien Affiche (Poster portrait HD url)</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3.5 px-4 text-white w-full text-xs font-mono outline-none focus:ring-1 focus:ring-red-650/40"
                          value={editingMovie.poster || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, poster: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Lien Arrière-plan (Widescreen backdrop url)</label>
                        <input 
                          className="bg-black border border-white/10 rounded-xl py-3.5 px-4 text-white w-full text-xs font-mono outline-none focus:ring-1 focus:ring-red-650/40"
                          value={editingMovie.banner || ""}
                          onChange={(e) => setEditingMovie({...editingMovie, banner: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Tags Inputs */}
                  <div className="space-y-6">
                    <h5 className="text-xs font-black uppercase text-white/40 tracking-widest pb-2 border-b border-white/5 flex items-center gap-2">
                      <Users size={14} className="text-red-650" /> 5. Casting et Catégories
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Genres Tag block */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Genres de cinéma associés</label>
                        <div className="flex gap-2">
                          <input 
                            className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white flex-1 text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                            placeholder="ex: Drame, Action, Thriller..."
                            value={genreInput}
                            onChange={(e) => setGenreInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGenre())}
                          />
                          <button 
                            onClick={handleAddGenre}
                            type="button"
                            className="px-4 bg-white/5 rounded-xl text-white/60 hover:text-white"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-2 bg-black/30 border border-white/5 rounded-xl min-h-[50px]">
                          {(editingMovie.genres || []).map((genre) => (
                            <span key={genre} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 animate-fade-in">
                              {genre}
                              <button type="button" onClick={() => handleRemoveGenre(genre)} className="hover:text-red-500 text-white/40 text-[9px] font-black">✕</button>
                            </span>
                          ))}
                          {(editingMovie.genres || []).length === 0 && (
                            <span className="text-[10px] text-white/25 italic p-1">Aucun genre attribué</span>
                          )}
                        </div>
                      </div>

                      {/* Actors Tag block */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Acteurs principaux</label>
                        <div className="flex gap-2">
                          <input 
                            className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white flex-1 text-xs font-bold outline-none focus:ring-1 focus:ring-red-650/40"
                            placeholder="ex: Leonardo DiCaprio..."
                            value={actorInput}
                            onChange={(e) => setActorInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddActor())}
                          />
                          <button 
                            onClick={handleAddActor}
                            type="button"
                            className="px-4 bg-white/5 rounded-xl text-white/60 hover:text-white"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-2 bg-black/30 border border-white/5 rounded-xl min-h-[50px]">
                          {(editingMovie.actors || []).map((actor) => (
                            <span key={actor} className="bg-white/5 text-white/80 border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                              {actor}
                              <button type="button" onClick={() => handleRemoveActor(actor)} className="hover:text-red-500 text-white/40 text-[9px]">✕</button>
                            </span>
                          ))}
                          {(editingMovie.actors || []).length === 0 && (
                            <span className="text-[10px] text-white/25 italic p-1">Aucun acteur enregistré</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Synopsis */}
                  <div className="space-y-6">
                    <h5 className="text-xs font-black uppercase text-white/40 tracking-widest pb-2 border-b border-white/5 flex items-center gap-2">
                      <BookOpen size={14} className="text-red-650" /> 6. Synopsis & Résumé de l'œuvre
                    </h5>
                    <div className="space-y-1.5">
                      <textarea 
                        className="bg-black border border-white/10 rounded-xl py-3 px-4 text-white w-full text-xs font-medium outline-none focus:ring-1 focus:ring-red-650/40 h-28 resize-none leading-relaxed"
                        placeholder="Saisissez un résumé complet et vendeur..."
                        value={editingMovie.summary || ""}
                        onChange={(e) => setEditingMovie({...editingMovie, summary: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Status switches (New/Popular) */}
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={!!editingMovie.isNew}
                        onChange={(e) => setEditingMovie({...editingMovie, isNew: e.target.checked})}
                        className="w-4 h-4 rounded text-red-600 focus:ring-red-650 accent-red-600"
                      />
                      <div className="text-xs font-black uppercase tracking-wider text-white/80">Marquer comme : Nouveau</div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={!!editingMovie.isPopular}
                        onChange={(e) => setEditingMovie({...editingMovie, isPopular: e.target.checked})}
                        className="w-4 h-4 rounded text-red-500 focus:ring-red-650 accent-red-500"
                      />
                      <div className="text-xs font-black uppercase tracking-wider text-white/80">Marquer comme : Populaire</div>
                    </label>
                  </div>

                  {/* Validation and submission */}
                  <div className="flex gap-4 pt-6">
                    <button 
                      onClick={handleSaveMovie}
                      disabled={isSavingMovie}
                      className="flex-1 py-4.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingMovie ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      {editingMovie.id ? "Appliquer les modifications" : "Enregistrer dans la bibliothèque"}
                    </button>
                    <button 
                      onClick={() => setEditingMovie(null)}
                      type="button"
                      className="px-8 py-4.5 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all border border-white/5 active:scale-95 cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>

                {/* Right preview column (span 1) */}
                <div className="space-y-6">
                  <div className="sticky top-24 bg-white/[0.02] border border-white/5 p-6 rounded-[24px] space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                       <h5 className="text-[10px] font-black uppercase text-red-650 tracking-widest flex items-center gap-2">
                         <AppWindow size={14} /> Prévisualisation Live
                       </h5>
                       <span className="text-[9px] font-black text-white/30 uppercase tracking-tighter decoration-emerald-500/50">Denden TV UI</span>
                    </div>

                    {/* 1. Portrait Poster Simulator */}
                    <div className="space-y-2">
                       <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Format Carte de la bibliothèque :</span>
                       <div className="relative aspect-[2/3] w-48 mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black group-hover:scale-105 transition-all">
                         {editingMovie.poster ? (
                           <img src={editingMovie.poster} className="w-full h-full object-cover" alt="Simulated Poster" referrerPolicy="no-referrer" />
                         ) : (
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 p-4">
                             <ImageIcon size={36} className="mb-2" />
                             <span className="text-[9px] font-black uppercase tracking-wider text-center">Aucune image poster</span>
                           </div>
                         )}
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-end p-3">
                           <div className="flex items-center justify-between gap-1 mb-1">
                             <span className="text-[8px] font-black bg-red-650 text-white px-1.5 py-0.5 rounded-sm uppercase">{editingMovie.quality || 'HD'}</span>
                             <span className="text-[9px] font-bold text-white/50">{editingMovie.year || '2026'}</span>
                           </div>
                           <h4 className="text-white font-black text-[11px] truncate">{editingMovie.title || "Titre du film"}</h4>
                           <div className="flex items-center gap-1 mt-0.5">
                             <Star size={9} className="text-yellow-500 fill-current" />
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* 2. Banner/Backdrop simulator */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Format Bannière d'arrière-plan :</span>
                      <div className="relative h-28 bg-black border border-white/5 rounded-xl overflow-hidden">
                         {editingMovie.banner || editingMovie.poster ? (
                           <img src={editingMovie.banner || editingMovie.poster} className="w-full h-full object-cover opacity-60" alt="Simulated Backdrop" referrerPolicy="no-referrer" />
                         ) : (
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10 p-4">
                             <ImageIcon size={20} className="mb-1" />
                             <span className="text-[8px] font-black uppercase tracking-wider">Aucun arrière-plan</span>
                           </div>
                         )}
                         <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                         <div className="absolute bottom-2 left-3">
                           <h5 className="text-[12px] font-black text-white leading-tight drop-shadow-md">{editingMovie.title || 'Titre du film'}</h5>
                           <span className="text-[8px] text-emerald-500 font-extrabold flex items-center gap-1">
                           </span>
                         </div>
                      </div>
                    </div>

                    {/* Helpers tip info box */}
                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1.5 text-[11px]">
                       <div className="font-extrabold text-white/60 uppercase text-[9px] tracking-widest flex items-center gap-1"><Info size={12} className="text-red-650" /> Recommandations</div>
                       <p className="text-white/40 leading-relaxed">
                         Pour de meilleurs résultats, utilisez des formats d'affiche portrait de ratio **2:3** et des formats d'arrière-plan de ratio **16:9** (paysage).
                       </p>
                    </div>
                  </div>
                </div>

              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Database View listing table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-white/5 px-4 py-4 md:px-8 md:py-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2">
           <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 md:gap-3">
             <Database className="text-red-650" size={16} /> 
             Bibliothèque Interactive ({movies.length})
           </h3>
           <span className="text-[8px] md:text-[9px] font-black text-white/30 uppercase tracking-widest">Trié par année (décroissant)</span>
        </div>
        <div className="overflow-x-auto min-h-[200px] md:min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20">
                <th className="px-4 py-3 md:px-8 md:py-4 text-[9px] md:text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5">Film & Identité</th>
                <th className="px-4 py-3 md:px-8 md:py-4 text-[9px] md:text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 whitespace-nowrap">Année / Qualité</th>
                <th className="px-4 py-3 md:px-8 md:py-4 text-[9px] md:text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5">Audiences</th>
                <th className="px-4 py-3 md:px-8 md:py-4 text-[9px] md:text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 text-right">Contrôles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {movies.length > 0 ? (
                [...movies].sort((a,b) => parseInt(b.year) - parseInt(a.year)).map(movie => (
                  <tr key={movie.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3 md:px-8 md:py-5">
                      <div className="flex items-center gap-3 md:gap-5">
                        <div className="relative shrink-0">
                          <img src={movie.poster} className="w-10 h-14 md:w-12 md:h-18 object-cover rounded-xl shadow-lg border border-white/10 group-hover:scale-105 transition-all duration-300" referrerPolicy="no-referrer" />
                          <div className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 bg-red-650 text-white text-[7px] md:text-[8px] font-black px-1 md:px-1.5 py-0.5 rounded shadow">
                            {movie.quality}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs md:text-base font-black text-white group-hover:text-red-500 transition-colors truncate max-w-[120px] md:max-w-md uppercase tracking-tight">{movie.title}</div>
                          <div className="text-[9px] md:text-[10px] text-white/30 font-mono mt-0.5 md:mt-1 opacity-60 truncate max-w-[100px] md:max-w-xs">{movie.videoUrl}</div>
                          <div className="hidden md:flex flex-wrap gap-1.5 mt-2">
                             {movie.genres && movie.genres.slice(0, 3).map((g, i) => (
                               <span key={i} className="text-[9px] font-black uppercase px-2.5 py-0.5 bg-white/5 rounded border border-white/5 text-white/40">
                                 {g}
                               </span>
                             ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 md:px-8 md:py-5">
                      <div className="space-y-1">
                        <div className="text-xs md:text-sm font-black text-white">{movie.year}</div>
                        <div className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1 md:gap-1.5">
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 md:px-8 md:py-5">
                      <div className="flex flex-col">
                        <span className="text-xs md:text-sm font-black text-white/80">{movie.viewCount || 0}</span>
                        <span className="text-[8px] md:text-[9px] font-bold text-white/20 uppercase hidden md:inline">Projections</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 md:px-8 md:py-5 text-right">
                      <div className="flex items-center justify-end gap-2 md:gap-3">
                        {deletingMovieId === movie.id ? (
                          <div className="flex items-center gap-1 md:gap-1.5 animate-fade-in">
                            <button
                              onClick={() => {
                                onDeleteMovie(movie.id);
                                setDeletingMovieId(null);
                              }}
                              className="px-2 py-1.5 md:px-3 md:py-2 bg-red-650 hover:bg-red-700 rounded-lg md:rounded-xl text-white font-extrabold text-[9px] md:text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-md active:scale-95"
                              title="Confirmer la suppression"
                            >
                              <CheckCircle size={12} className="animate-pulse" />
                              <span className="hidden md:inline">Sûr ?</span>
                            </button>
                            <button
                              onClick={() => setDeletingMovieId(null)}
                              className="p-1.5 md:p-2 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-xl text-white/40 hover:text-white transition-all border border-white/5 flex items-center justify-center focus:outline-none"
                              title="Annuler"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => {
                                setIsManualMode(true);
                                setEditingMovie(movie);
                              }}
                              className="p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-xl text-white/40 hover:text-white transition-all border border-white/5 flex items-center justify-center group/btn focus:outline-none"
                              title="Paramétrer"
                            >
                              <Sliders size={14} className="md:w-[18px] md:h-[18px] group-hover/btn:rotate-12 transition-transform duration-300" />
                            </button>
                            <button 
                              onClick={() => setDeletingMovieId(movie.id)}
                              className="p-2 md:p-3 bg-red-600/5 hover:bg-red-600/20 rounded-lg md:rounded-xl text-red-500/40 hover:text-red-500 transition-all border border-red-500/5 flex items-center justify-center group/btn focus:outline-none"
                              title="Supprimer"
                            >
                              <Trash2 size={14} className="md:w-[18px] md:h-[18px] group-hover/btn:scale-110 transition-transform duration-300" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={4} className="py-16 md:py-32 text-center">
                      <div className="inline-flex p-6 md:p-10 bg-white/[0.02] border border-white/5 border-dashed rounded-3xl md:rounded-[48px] flex-col items-center">
                         <Film size={48} className="text-white/5 mb-4 md:mb-6 md:w-16 md:h-16" />
                         <h4 className="text-lg md:text-xl font-black text-white/30 uppercase tracking-tighter">Catalogue Vide</h4>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="p-6 bg-red-650/5 border border-red-500/10 rounded-2xl flex items-start gap-4">
           <AlertTriangle className="text-red-500 shrink-0" size={24} />
           <div>
             <h5 className="text-xs font-black text-red-500 uppercase tracking-widest">Avertissement de diffusion</h5>
             <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
               Pour un fonctionnement optimal, fournissez des URLs de flux de qualité, idéalement compatibles CORS ou encodées en .mp4/.m3u8 directes.
             </p>
           </div>
        </div>
        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
           <Globe className="text-blue-500 shrink-0" size={24} />
           <div>
             <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
               L'accès direct aux serveurs The Movie Database garantit des métadonnées riches et des visuels de haute qualité.
             </p>
           </div>
        </div>
        <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-4">
           <CheckCircle className="text-emerald-500 shrink-0" size={24} />
           <div>
             <h5 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Durable Cloud Sync</h5>
             <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
               Toute modification apportée ici est synchronisée immédiatement à l'ensemble des écrans connectés.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
