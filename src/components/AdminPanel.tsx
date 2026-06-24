import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, Edit2, Check, X, Search, FileUp, Download, Link, 
  Activity, AlertCircle, RefreshCw, Sparkles, Database, ShieldAlert,
  Sliders, Layers, Zap, Eye, CheckCircle2, Wifi, WifiOff, LayoutGrid,
  Trophy, Film, Tv, Baby, Globe, Music, BookOpen, MapPin, Languages,
  Copy, Merge, ArrowRightLeft, Settings, ShieldCheck, PieChart,
  BarChart3, Info, ExternalLink, Image as ImageIcon, Crop, RotateCcw,
  AlertTriangle, Lock, Unlock, Keyboard, MousePointer2, Clock, Radar
} from 'lucide-react';
import { Channel, Category, EPGSource } from '../types';
import { cn } from '../lib/utils';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useDeviceType } from '../hooks/useDeviceType';

interface AdminPanelProps {
  channels: Channel[];
  onAddChannel: (channel: Partial<Channel>) => void;
  onUpdateChannel: (id: string, channel: Partial<Channel>) => void;
  onDeleteChannel: (id: string) => void;
  currentUserEmail?: string;
}

type AdminTab = 'overview' | 'channels' | 'categories' | 'streams' | 'epg' | 'security';

export default function AdminPanel({ channels, onAddChannel, onUpdateChannel, onDeleteChannel, currentUserEmail }: AdminPanelProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile' || deviceType === 'tablet';
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'m3u' | 'xtream' | 'url' | 'fstv' | 'witv' | 'tvmio' | 'local'>('m3u');
  const [scanUrl, setScanUrl] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [epgSources, setEpgSources] = useState<EPGSource[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Playlist Import Wizard States
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedPreviewChannels, setParsedPreviewChannels] = useState<any[]>([]);
  const [previewFilter, setPreviewFilter] = useState('');
  const [channelsToImport, setChannelsToImport] = useState<string[]>([]);
  const [importStatusMessage, setImportStatusMessage] = useState('');
  const [selectedPreviewCategory, setSelectedPreviewCategory] = useState<string>('ALL');
  const [globalCategoryOverride, setGlobalCategoryOverride] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Helper methods for the preview list
  const uniqueM3uCategories = (items: any[]) => {
    return ['ALL', ...new Set(items.map(c => c.category || 'Importé'))];
  };

  const getFilteredPreview = (items: any[], filterText: string, activeCategory: string) => {
    return items.filter(ch => {
      const nameMatch = (ch.name || '').toLowerCase().includes(filterText.toLowerCase());
      const urlMatch = (ch.url || '').toLowerCase().includes(filterText.toLowerCase());
      const matchesSearch = nameMatch || urlMatch;
      const matchesCategory = activeCategory === 'ALL' || ch.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const getPaginatedPreview = (items: any[], page: number) => {
    const limit = 20;
    return items.slice((page - 1) * limit, page * limit);
  };
  
  const [formData, setFormData] = useState<Partial<Channel>>({
    name: '',
    logo: '',
    url: '',
    category: 'Généralistes',
    isEnabled: true,
    backupUrls: [],
    tags: [],
    channelNumber: 0,
    epgId: '',
    country: 'France',
    language: 'Français',
    description: ''
  });

  const [categoryFormData, setCategoryFormData] = useState<Partial<Category>>({
    name: '',
    icon: 'LayoutGrid',
    color: '#00A8E1'
  });
  
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [actionStatus, setActionStatus] = useState<{message: string, type: 'success' | 'error' | 'loading'} | null>(null);

  const performAction = async (actionFn: () => Promise<any>, successMsg: string, errorMsg: string) => {
    setActionStatus({ message: 'Action en cours...', type: 'loading' });
    try {
      await actionFn();
      setActionStatus({ message: successMsg, type: 'success' });
    } catch (err) {
      console.error(err);
      setActionStatus({ message: errorMsg, type: 'error' });
    }
    setTimeout(() => setActionStatus(null), 3000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Stats fetch failed', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Categories fetch failed', err);
    }
  }, []);

  const fetchEpgSources = useCallback(async () => {
    try {
      const res = await axios.get('/api/epg/sources');
      setEpgSources(res.data);
    } catch (err) {
      console.error('EPG Sources fetch failed', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCategories();
    fetchEpgSources();
  }, [fetchStats, fetchCategories, fetchEpgSources, channels]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '0104') {
      setIsUnlocked(true);
    } else {
      toast.error('Code PIN incorrect.');
      setPinInput('');
    }
  };

  const handleSaveChannel = async () => {
    setIsProcessing(true);
    try {
      if (editingId) {
        await axios.put(`/api/channels/${editingId}`, formData);
        onUpdateChannel(editingId, formData);
      } else {
        const res = await axios.post('/api/channels', formData);
        onAddChannel(res.data);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', logo: '', url: '', category: 'Généralistes', isEnabled: true });
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l’enregistrement.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleChannelSelection = (id: string) => {
    setSelectedChannels(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDuplicate = async (id: string) => {
    setIsProcessing(true);
    try {
      const res = await axios.post(`/api/channels/duplicate/${id}`);
      onAddChannel(res.data);
    } catch (err) {
      toast.error('Erreur de duplication');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    // Bulk delete proceeds without browser confirm due to iframe restrictions
    setIsProcessing(true);
    try {
      await axios.post('/api/channels/bulk-delete', { ids: selectedChannels });
      setSelectedChannels([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCategory = async () => {
    setIsProcessing(true);
    try {
      if (editingCategoryId) {
        await axios.put(`/api/categories/${editingCategoryId}`, categoryFormData);
      } else {
        await axios.post('/api/categories', categoryFormData);
      }
      fetchCategories();
      setIsAddingCategory(false);
      setEditingCategoryId(null);
    } catch (err) {
      toast.error('Erreur catégorie');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    // Skip confirm
    try {
      await axios.delete(`/api/categories/${id}`);
      fetchCategories();
    } catch (err) {
      toast.error('Erreur suppression');
    }
  };

  const handleLogoSearch = async () => {
    if (!formData.name) return toast.warning('Entrez d\'abord le nom de la chaîne');
    setIsProcessing(true);
    try {
      // Simulation d'une recherche automatique
      const name = formData.name.toLowerCase().replace(/\s+/g, '');
      const mockLogo = `https://logo.clearbit.com/${name}.com`;
      setFormData({ ...formData, logo: mockLogo });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSource = async (index: number) => {
    try {
      await axios.post('/api/epg/sources/toggle', { index });
      fetchEpgSources();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour.');
    }
  };

  const handleScan = async () => {
    if (scanType === 'm3u' || scanType === 'url') {
      await handleAnalyzeUrl();
    } else if (scanType === 'fstv') {
      if (!scanUrl) return toast.warning('Veuillez entrer une URL.');
      setIsProcessing(true);
      try {
        const res = await axios.post('/api/channels/scrape-fstv', { url: scanUrl });
        toast.success(`Chaîne ${res.data.channel.name} ajoutée via FSTV Scraper.`);
        setIsScanning(false);
        setScanUrl('');
        fetchStats();
      } catch (err) {
        toast.error('Erreur lors du scrap (FSTV).');
      } finally {
        setIsProcessing(false);
      }
    } else if (scanType === 'witv') {
      if (!scanUrl) return toast.warning('Veuillez entrer une URL.');
      setIsProcessing(true);
      try {
        const res = await axios.post('/api/channels/scrape-witv', { url: scanUrl });
        toast.success(`Chaîne ${res.data.channel.name} ajoutée via wiTV Scraper.`);
        setIsScanning(false);
        setScanUrl('');
        fetchStats();
      } catch (err) {
        toast.error('Erreur lors du scrap (wiTV).');
      } finally {
        setIsProcessing(false);
      }
    } else if (scanType === 'tvmio') {
      setIsProcessing(true);
      try {
        const res = await axios.post('/api/channels/import-tvmio');
        toast.success(`${res.data.count} nouvelles chaînes TVMio importées (${res.data.totalInCatalog} au total).`);
        setIsScanning(false);
        fetchStats();
      } catch (err) {
        toast.error('Erreur lors de l’importation TVMio.');
      } finally {
        setIsProcessing(false);
      }
    } else if (scanType === 'local') {
      if (parsedPreviewChannels.length > 0) {
        await handleBulkImportSubmit();
      } else if (localFile) {
        handleLocalFile(localFile);
      } else {
        toast.warning('Veuillez d’abord sélectionner un fichier M3U.');
      }
    }
  };

  const parseM3uText = (m3uContent: string): any[] => {
    const lines = m3uContent.split('\n');
    const parsedChannels: any[] = [];
    let currentChannel: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXTINF:')) {
        const logoMatch = line.match(/tvg-logo="([^"]+)"/) || line.match(/logo="([^"]+)"/);
        const groupMatch = line.match(/group-title="([^"]+)"/) || line.match(/category="([^"]+)"/);
        const commaIndex = line.lastIndexOf(',');
        const name = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Chaîne IPTV';
        
        let resolvedLogo = logoMatch ? logoMatch[1] : '';
        if (!resolvedLogo && name) {
          const cleanNameForIcon = name.toLowerCase().replace(/[^a-z0-9]/g, '');
          resolvedLogo = `https://raw.githubusercontent.com/iptv-org/database/master/data/icons/${cleanNameForIcon}.png`;
        }

        currentChannel = {
          name: name,
          logo: resolvedLogo || 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120',
          category: groupMatch ? groupMatch[1] : 'Importé',
          backupUrls: []
        };
      } else if (line && !line.startsWith('#') && currentChannel) {
        currentChannel.url = line;
        parsedChannels.push(currentChannel);
        currentChannel = null;
      }
    }
    return parsedChannels;
  };

  const handleLocalFile = (file: File) => {
    setLocalFile(file);
    setIsProcessing(true);
    setImportStatusMessage('Lecture du fichier local en cours...');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        try {
          const items = parseM3uText(text);
          setParsedPreviewChannels(items);
          setChannelsToImport(items.map(item => item.url));
          setCurrentPage(1);
        } catch (err) {
          toast.error("Erreur lors de la lecture ou l'analyse du fichier.");
        } finally {
          setIsProcessing(false);
          setImportStatusMessage('');
        }
      }
    };
    reader.onerror = () => {
      toast.error("Erreur de lecture du fichier.");
      setIsProcessing(false);
      setImportStatusMessage('');
    };
    reader.readAsText(file);
  };

  const handleAnalyzeUrl = async () => {
    if (!scanUrl) return toast.warning('Veuillez entrer une URL.');
    setIsProcessing(true);
    setImportStatusMessage('Téléchargement et analyse de la playlist distante...');
    try {
      const res = await axios.post('/api/playlists/parse', { url: scanUrl });
      const items = res.data.channels || [];
      if (items.length === 0) {
        toast.warning('Aucune chaîne trouvée dans cette playlist.');
      } else {
        setParsedPreviewChannels(items);
        setChannelsToImport(items.map((item: any) => item.url));
        setCurrentPage(1);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erreur lors du téléchargement. Veuillez vérifier l'URL de votre playlist.");
    } finally {
      setIsProcessing(false);
      setImportStatusMessage('');
    }
  };

  const handleBulkImportSubmit = async () => {
    setIsProcessing(true);
    setImportStatusMessage('Importation de votre sélection...');
    try {
      const selectedItems = parsedPreviewChannels
        .filter(ch => channelsToImport.includes(ch.url))
        .map(ch => ({
          name: ch.name,
          logo: ch.logo,
          url: ch.url,
          category: globalCategoryOverride || ch.category || 'Importé'
        }));

      if (selectedItems.length === 0) {
        toast.warning('Aucune chaîne sélectionnée pour l\'importation.');
        setIsProcessing(false);
        setImportStatusMessage('');
        return;
      }

      const res = await axios.post('/api/channels/bulk', selectedItems);
      toast.success(`${res.data.count} chaînes importées avec succès !`);
      
      // Close modal & reset
      setIsScanning(false);
      setParsedPreviewChannels([]);
      setChannelsToImport([]);
      setLocalFile(null);
      setScanUrl('');
      setGlobalCategoryOverride('');
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'importation de la playlist.");
    } finally {
      setIsProcessing(false);
      setImportStatusMessage('');
    }
  };

  const handleDeleteOffline = async () => {
    const offlineCount = channels.filter(c => c.status === 'offline').length;
    if (offlineCount === 0) {
      toast.info('Aucune chaîne n\'est actuellement hors-service.');
      return;
    }

    await performAction(
      () => axios.delete('/api/channels/offline').then(res => {
         fetchStats();
         return res;
      }),
      'Chaînes HS supprimées.',
      'Erreur lors de la suppression.'
    );
  };

  const handleDeleteAllChannels = async () => {
    await performAction(
      () => axios.delete('/api/channels').then(res => {
         setSelectedChannels([]);
         fetchStats();
         return res;
      }),
      'Chaînes supprimées.',
      'Erreur lors de la suppression.'
    );
  };

  const handleKeepOnlyFrench = async () => {
    if (!window.confirm("Voulez-vous vraiment trier et ne garder que les chaînes en français ? Toutes les chaînes étrangères importées seront définitivement supprimées.")) {
      return;
    }
    await performAction(
      () => axios.post('/api/channels/keep-only-french').then(res => {
         fetchStats();
         return res;
      }),
      'Tri effectué !',
      'Erreur lors du tri.'
    );
  };

  const handleAutoMergeDuplicates = async () => {
    if (!window.confirm("Voulez-vous fusionner automatiquement les chaînes en double (ex: TF1 SD, TF1 HD) ? Leurs adresses de flux seront combinées en secours backup pour garantir une meilleure disponibilité, et les doublons seront supprimés.")) {
      return;
    }
    await performAction(
      () => axios.post('/api/channels/auto-merge-duplicates').then(res => {
         fetchStats();
         return res;
      }),
      'Fusion réussie !',
      'Erreur lors de la fusion.'
    );
  };

  const dashboardCards = [
    { label: 'Total Chaînes', value: stats?.totalChannels || 0, icon: Tv, color: 'text-white' },
    { label: 'Flux Actifs', value: stats?.activeChannels || 0, icon: Wifi, color: 'text-emerald-500' },
    { label: 'Flux HS', value: stats?.offlineChannels || 0, icon: WifiOff, color: 'text-red-500' },
    { label: 'Catégories', value: stats?.totalCategories || 0, icon: Layers, color: 'text-purple-500' },
    { label: 'Santé Globale', value: `${stats?.healthScore || 0}%`, icon: Activity, color: 'text-blue-500' },
  ];

  if (!isUnlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-[#121212] border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl space-y-8"
        >
          <div className="w-20 h-20 bg-red-600/10 rounded-3xl flex items-center justify-center mx-auto border border-red-600/20">
            <Lock className="text-red-500" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Zone Sécurisée</h2>
            <p className="text-white/40 text-sm mt-2">Veuillez entrer votre code PIN administrateur</p>
          </div>
          
          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="flex justify-center gap-4">
              <input 
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                autoFocus
                className="w-full h-20 bg-white/5 border-2 border-white/10 rounded-2xl text-center text-4xl font-black text-white tracking-[1em] focus:border-red-600 focus:outline-none transition-all placeholder:text-white/5"
                placeholder="****"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 active:scale-95"
            >
              Déverrouiller
            </button>
          </form>
          
          <p className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">Denden System OS • v2.4.0</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in pb-32 lg:pb-0">
      {/* Notification Overlay */}
      <AnimatePresence>
          {actionStatus && (
              <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                      "fixed top-20 right-6 z-[200] px-6 py-4 rounded-2xl border flex items-center gap-3 backdrop-blur-xl shadow-2xl",
                      actionStatus.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                      actionStatus.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                      "bg-blue-500/10 border-blue-500/20 text-blue-500"
                  )}
              >
                  {actionStatus.type === 'loading' ? <RefreshCw className="animate-spin" size={16} /> : actionStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span className="font-black text-xs uppercase tracking-widest">{actionStatus.message}</span>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Header Admin */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-red-600 rounded-xl shadow-xl shadow-red-600/20">
              <ShieldCheck className="text-white" size={isMobile ? 20 : 28} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white tracking-tighter uppercase leading-none">Centre de Contrôle</h1>
              <p className="text-[9px] md:text-xs text-white/40 font-mono tracking-[0.2em] mt-1 uppercase">Admin Hub • ID: {currentUserEmail?.split('@')[0] || 'ROOT'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide max-w-full">
          {(['overview', 'channels', 'categories', 'streams', 'epg'] as AdminTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 md:px-5 py-2.5 rounded-xl text-[9px] md:text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all shrink-0",
                activeTab === tab 
                  ? "bg-white text-black shadow-xl" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              {tab === 'overview' && 'Stats'}
              {tab === 'channels' && 'Chaînes'}
              {tab === 'categories' && 'Catégories'}
              {tab === 'streams' && 'Flux'}
              {tab === 'epg' && 'EPG'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="space-y-6"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-6">
              {dashboardCards.map((card, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/5 p-5 md:p-6 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <card.icon size={isMobile ? 60 : 80} />
                  </div>
                  <card.icon className={cn(card.color, "mb-3 md:mb-4")} size={isMobile ? 22 : 28} />
                  <div className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-0.5 tracking-tighter">{card.value}</div>
                  <div className="text-[8px] md:text-[10px] text-white/40 font-black uppercase tracking-widest">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Quick Action Bento */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="lg:col-span-2 bg-gradient-to-br from-red-600/20 to-transparent border border-red-600/20 p-6 md:p-10 rounded-[2.5rem] relative overflow-hidden">
                <div className="relative z-10 space-y-6 md:space-y-8">
                  <div>
                    <h3 className="text-xl md:text-3xl font-black text-white mb-2 tracking-tight">Actions Système</h3>
                    <p className="text-white/50 text-xs md:text-sm max-w-lg leading-relaxed font-medium">Exécutez des opérations de maintenance globales sur l'ensemble de votre base de données Denden TV.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button onClick={() => performAction(() => axios.post('/api/epg/sync'), 'EPG synchronisé !', 'Erreur de sync.')} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 transition-all text-white group">
                      <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-center">Sync EPG</span>
                    </button>
                    <button onClick={() => performAction(() => axios.post('/api/pluto/sync'), 'Pluto TV Synchronisé !', 'Erreur de sync Pluto.')} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 transition-all text-white group">
                      <Tv className="group-hover:scale-110 transition-transform text-teal-400" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-center text-teal-400">Sync Pluto TV</span>
                    </button>
                    <button onClick={() => performAction(() => axios.post('/api/channels/check'), 'Flux testés.', 'Erreur de test flux.')} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 transition-all text-white group">
                      <Activity className="group-hover:scale-110 transition-transform" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-center">Tester Flux</span>
                    </button>
                    <button onClick={() => performAction(() => axios.post('/api/channels/repair'), 'Base réparée.', 'Erreur de réparation.')} className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 transition-all text-white group">
                      <Zap className="group-hover:text-yellow-400 group-hover:animate-pulse transition-colors" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-center">Réparer Tout</span>
                    </button>
                    <button onClick={handleDeleteOffline} disabled={isProcessing} className="flex flex-col items-center justify-center gap-3 p-4 bg-red-600/10 hover:bg-red-600/20 rounded-3xl border border-red-600/20 transition-all text-red-500 group disabled:opacity-50">
                      <Trash2 className="group-hover:scale-110" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-center">Vider HS</span>
                    </button>
                    <button onClick={handleKeepOnlyFrench} disabled={isProcessing} className="flex flex-col items-center justify-center gap-3 p-4 bg-blue-600/10 hover:bg-blue-600/20 rounded-3xl border border-blue-600/20 transition-all text-blue-400 group disabled:opacity-50">
                      <Languages className="group-hover:scale-110 transition-transform text-blue-400" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-center">Garder FR Only</span>
                    </button>
                    <button onClick={handleAutoMergeDuplicates} disabled={isProcessing} className="flex flex-col items-center justify-center gap-3 p-4 bg-purple-600/10 hover:bg-purple-600/20 rounded-3xl border border-purple-600/20 transition-all text-purple-400 group disabled:opacity-50">
                      <Merge className="group-hover:scale-110 transition-transform text-purple-400" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-center">Fusionner Doublons</span>
                    </button>
                    <button className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 transition-all text-white group">
                      <ImageIcon className="group-hover:scale-110" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-center">Maj Logos</span>
                    </button>
                    <button className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 transition-all text-white group">
                      <Layers className="group-hover:scale-110" size={24} />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-center">Réorganiser</span>
                    </button>
                  </div>
                </div>
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-red-600/10 rounded-full blur-[100px]" />
              </div>

              <div className="bg-[#111111] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" size={20} />
                    Alertes & Santé
                  </h3>
                  <div className="space-y-3">
                    {stats?.offlineChannels > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                        <X className="text-red-500" size={16} />
                        <span className="text-[10px] text-red-100 font-bold uppercase">{stats.offlineChannels} chaînes sont actuellement hors-service</span>
                      </div>
                    )}
                    {stats?.healthScore < 80 && (
                      <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                        <AlertCircle className="text-amber-500" size={16} />
                        <span className="text-[10px] text-amber-100 font-bold uppercase">Santé globale critique. Lancez une réparation.</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                      <Info className="text-blue-500" size={16} />
                      <span className="text-[10px] text-blue-100 font-bold uppercase">Dernière Sync: {stats?.lastEpgSync ? new Date(stats.lastEpgSync).toLocaleString() : 'Jamais'}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('streams')}
                  className="w-full mt-6 py-4 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Détails Diagnostic
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'channels' && (
          <motion.div 
            key="channels"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-6"
          >
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] p-4 rounded-3xl border border-white/5 backdrop-blur-xl">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input 
                  type="text" 
                  placeholder="Filtrer par nom, catégorie, tags, pays..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-red-600 transition-all font-medium"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedChannels.length > 0 ? (
                  <>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-600/20 transition-all">
                      <Trash2 size={14} /> Supprimer ({selectedChannels.length})
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-600/20 transition-all">
                      <Merge size={14} /> Fusionner
                    </button>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {channels.length > 0 && (
                      <button 
                        onClick={handleDeleteAllChannels}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-600/20 transition-all"
                      >
                        <Trash2 size={14} /> Tout Supprimer
                      </button>
                    )}
                    {channels.some(c => c.status === 'offline') && (
                      <button 
                        onClick={handleDeleteOffline}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-600/20 transition-all"
                      >
                        <Trash2 size={14} /> Vider HS
                      </button>
                    )}
                    <button 
                      onClick={() => setIsScanning(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-600/20"
                    >
                      <Radar size={14} /> Scanner
                    </button>
                    <button 
                      onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', logo: '', url: '', category: 'Généralistes', isEnabled: true });
                        setIsAdding(true);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl"
                    >
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Form Overlay Modal */}
            {isAdding && (
              <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  onClick={() => setIsAdding(false)}
                />
                <motion.div 
                  initial={isMobile ? { y: "100%" } : { scale: 0.9, y: 20 }}
                  animate={{ y: 0, scale: 1 }}
                  className="w-full sm:max-w-4xl max-h-[95vh] sm:max-h-none h-auto bg-[#111111] border-t sm:border border-white/10 rounded-t-[2rem] sm:rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl flex flex-col"
                >
                  <div className="p-5 sm:p-8 border-b border-white/10 flex justify-between items-center shrink-0">
                    <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">{editingId ? 'Modifier' : 'Nouveau Canal'}</h2>
                    <button onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white transition-colors p-2 -mr-2"><X size={20} /></button>
                  </div>
                  
                  <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 pb-10 sm:pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                      <div className="space-y-4 sm:space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Identité & Nom</label>
                          <input 
                            type="text" 
                            placeholder="Nom du canal" 
                            value={formData.name || ''} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:py-4 text-sm text-white focus:outline-none focus:border-red-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Flux Principal (URL M3U8/TS)</label>
                          <input 
                            type="text" 
                            placeholder="https://..." 
                            value={formData.url || ''} 
                            onChange={e => setFormData({...formData, url: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:py-4 text-sm text-white focus:outline-none focus:border-red-600 font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Catégorie</label>
                            <select 
                              value={formData.category}
                              onChange={e => setFormData({...formData, category: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:py-4 text-sm text-white focus:outline-none focus:border-red-600 appearance-none"
                            >
                              {categories.map((cat, i) => <option key={`cat-opt-${cat.id || ''}-${i}`} value={cat.name}>{cat.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Numéro LCN</label>
                            <input 
                              type="number" 
                              value={formData.channelNumber || ''} 
                              onChange={e => setFormData({...formData, channelNumber: parseInt(e.target.value)})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:py-4 text-sm text-white focus:outline-none focus:border-red-600"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Logo (URL ou Upload)</label>
                            <button 
                              onClick={handleLogoSearch}
                              className="text-[9px] text-blue-400 font-bold hover:underline flex items-center gap-1"
                            >
                              <Search size={10} /> Recherche auto
                            </button>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                              {formData.logo ? <img src={formData.logo} alt="" className="w-full h-full object-contain p-2" /> : <ImageIcon className="text-white/20" size={24} />}
                            </div>
                            <input 
                              type="text" 
                              placeholder="URL du logo" 
                              value={formData.logo || ''} 
                              onChange={e => setFormData({...formData, logo: e.target.value})}
                              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:py-4 text-sm text-white focus:outline-none focus:border-red-600"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Pays</label>
                            <input 
                              type="text" 
                              placeholder="ex: France" 
                              value={formData.country || ''} 
                              onChange={e => setFormData({...formData, country: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:py-4 text-sm text-white focus:outline-none focus:border-red-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Langue</label>
                            <input 
                              type="text" 
                              placeholder="ex: Français" 
                              value={formData.language || ''} 
                              onChange={e => setFormData({...formData, language: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:py-4 text-sm text-white focus:outline-none focus:border-red-600"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Flux de secours (Ligne par ligne)</label>
                          <textarea 
                            rows={2}
                            placeholder="https://backup1.com/stream.m3u8&#10;https://backup2.com/stream.m3u8" 
                            value={formData.backupUrls?.join('\n') || ''} 
                            onChange={e => setFormData({...formData, backupUrls: e.target.value.split('\n').filter(l => l.trim() !== '')})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:py-4 text-xs text-white focus:outline-none focus:border-red-600 font-mono resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Tags (Séparez par virgules)</label>
                          <input 
                            type="text" 
                            placeholder="4K, HEVC, Sport, FR" 
                            value={formData.tags?.join(', ') || ''} 
                            onChange={e => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:py-4 text-sm text-white focus:outline-none focus:border-red-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-8 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button 
                        onClick={() => setFormData({...formData, isEnabled: !formData.isEnabled})}
                        className={cn(
                          "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border w-full sm:w-auto",
                          formData.isEnabled ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}
                      >
                        {formData.isEnabled ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                        {formData.isEnabled ? 'Activée' : 'Désactivée'}
                      </button>
                    </div>
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                      <button 
                        onClick={() => setIsAdding(false)}
                        className="flex-1 sm:flex-none px-6 py-4 text-white/50 hover:text-white font-black text-[10px] uppercase tracking-widest order-2 sm:order-1"
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={handleSaveChannel}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 min-w-[120px] order-1 sm:order-2"
                      >
                        {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : (editingId ? 'Maj' : 'Créer')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Scan Modal */}
            {isScanning && (
              <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                  onClick={() => {
                    setIsScanning(false);
                    setParsedPreviewChannels([]);
                    setLocalFile(null);
                    setScanUrl('');
                    setGlobalCategoryOverride('');
                  }}
                />
                <motion.div 
                  initial={isMobile ? { y: "100%" } : { scale: 0.9, y: 20 }}
                  animate={{ y: 0, scale: 1 }}
                  className={cn(
                    "bg-[#111111] border-t sm:border border-white/10 rounded-t-[2rem] sm:rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl transition-all duration-300 flex flex-col w-full",
                    parsedPreviewChannels.length > 0 ? "max-w-5xl h-[95vh] sm:h-[85vh]" : "max-w-2xl max-h-[90vh] sm:max-h-none"
                  )}
                >
                  {/* Header */}
                  <div className="p-6 md:p-8 flex justify-between items-center shrink-0">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        {parsedPreviewChannels.length > 0 
                          ? `Importation (${parsedPreviewChannels.length} chaînes)` 
                          : 'Importer des Chaînes'}
                      </h2>
                      <p className="text-xs text-white/50 mt-1">
                        {parsedPreviewChannels.length > 0 
                          ? 'Vérifiez et importez votre sélection' 
                          : 'Sélectionnez une source pour l\'import'}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsScanning(false);
                        setParsedPreviewChannels([]);
                        setLocalFile(null);
                        setScanUrl('');
                        setGlobalCategoryOverride('');
                      }} 
                      className="p-2 text-white/50 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  {/* Status Overlay */}
                  {importStatusMessage && (
                    <div className="bg-blue-600/20 text-blue-400 px-6 py-3 text-xs font-medium tracking-wide flex items-center gap-3 shrink-0">
                      <RefreshCw className="animate-spin" size={14} />
                      {importStatusMessage}
                    </div>
                  )}

                  {parsedPreviewChannels.length === 0 ? (
                    /* STEP 1: CHOOSE AND PARSE SOURCE */
                    <>
                      <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide">
                          {(['m3u', 'xtream', 'url', 'fstv', 'witv', 'tvmio', 'local'] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => setScanType(t)}
                              className={cn(
                                "px-4 py-2 rounded-lg text-xs font-medium uppercase transition-all shrink-0 border",
                                scanType === t 
                                  ? "bg-white text-black border-white" 
                                  : "text-white/40 border-white/10 hover:border-white/30"
                              )}
                            >
                              {t === 'm3u' ? 'M3U' : t === 'xtream' ? 'Xtream' : t === 'url' ? 'Simple' : t === 'fstv' ? 'FSTV' : t === 'witv' ? 'wiTV' : t === 'tvmio' ? 'TVMio' : 'Local'}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-6">
                          {(scanType === 'm3u' || scanType === 'url') && (
                            <div className="space-y-2 animate-fade-in">
                              <label className="text-xs font-medium text-white/50 block">
                                URL
                              </label>
                              <input 
                                type="text" 
                                placeholder="https://..." 
                                value={scanUrl} 
                                onChange={e => setScanUrl(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                              />
                            </div>
                          )}

                          {scanType === 'xtream' && (
                            <div className="space-y-4 animate-fade-in">
                              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
                                <Info className="shrink-0 text-blue-500" size={16} />
                                <p className="text-[11px] font-bold text-blue-200">
                                  Pour utiliser des identifiants Xtream Codes, veuillez formater l'URL au format M3U standard:<br/>
                                  <span className="font-mono text-[10px] text-white/60 block mt-1">http://serveur.com:port/get.php?username=VOTRE_USER&password=VOTRE_PASS&output=ts</span>
                                </p>
                              </div>
                            </div>
                          )}

                          {scanType === 'fstv' && (
                            <div className="space-y-4 animate-fade-in relative overflow-hidden p-6 rounded-3xl bg-blue-600/5 border border-blue-500/20">
                              <div className="relative z-10 space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">URL de la page newsid FSTV</label>
                                <input 
                                  type="text" 
                                  placeholder="https://fstv.rest/index.php?newsid=..." 
                                  value={scanUrl} 
                                  onChange={e => setScanUrl(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-600 font-mono"
                                />
                                <div className="flex items-start gap-3">
                                  <Zap className="text-yellow-500 shrink-0 mt-1" size={16} />
                                  <p className="text-[11px] text-white/50 leading-relaxed font-bold">L'outil va automatiquement extraire le nom, le logo, la catégorie et configurer le proxy sécurisé pour la lecture du flux en direct.</p>
                                </div>
                              </div>
                              <Radar className="absolute -bottom-10 -right-10 text-white/[0.02]" size={150} />
                            </div>
                          )}

                          {scanType === 'witv' && (
                            <div className="space-y-4 animate-fade-in relative overflow-hidden p-6 rounded-3xl bg-blue-600/5 border border-blue-500/20">
                              <div className="relative z-10 space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">URL de la page wiTV (witv.team)</label>
                                <input 
                                  type="text" 
                                  placeholder="https://witv.team/chaines-live/..." 
                                  value={scanUrl} 
                                  onChange={e => setScanUrl(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-600 font-mono"
                                />
                                <div className="flex items-start gap-3">
                                  <Zap className="text-yellow-500 shrink-0 mt-1" size={16} />
                                  <p className="text-[11px] text-white/50 leading-relaxed font-bold">L'outil va automatiquement extraire le nom, le logo, la catégorie (Documentaires, etc.) et configurer le proxy sécurisé wiTV pour la lecture en direct.</p>
                                </div>
                              </div>
                              <Radar className="absolute -bottom-10 -right-10 text-white/[0.02]" size={150} />
                            </div>
                          )}

                          {scanType === 'tvmio' && (
                            <div className="space-y-4 animate-fade-in relative overflow-hidden p-6 rounded-3xl bg-emerald-600/5 border border-emerald-500/20">
                              <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                    <Tv className="text-white" size={20} />
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Addon TVMio France</h3>
                                    <p className="text-[10px] text-white/40 font-mono tracking-widest">STREMIO INTEGRATION • FR VERSION</p>
                                  </div>
                                </div>
                                <p className="text-[11px] text-white/60 leading-relaxed font-bold">
                                  Importez instantanément des centaines de chaînes françaises gratuites depuis le manifest TVMio. 
                                  Les flux sont automatiquement routés via notre proxy sécurisé pour une compatibilité maximale.
                                </p>
                              </div>
                              <Sparkles className="absolute -bottom-10 -right-10 text-emerald-500/[0.05]" size={150} />
                            </div>
                          )}

                          {scanType === 'local' && (
                            <div className="space-y-4 animate-fade-in">
                              <label 
                                className={cn(
                                  "w-full border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/[0.02]",
                                  isDragging ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                                )}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setIsDragging(false);
                                  const file = e.dataTransfer.files?.[0];
                                  if (file) handleLocalFile(file);
                                }}
                              >
                                <input 
                                  type="file" 
                                  accept=".m3u,.m3u8,.txt" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleLocalFile(file);
                                  }}
                                />
                                <FileUp size={44} className={cn("mb-4 transition-transform", isDragging ? "text-blue-500 scale-110" : "text-white/40")} />
                                <p className="text-sm font-bold text-white">Sélectionnez ou glissez-déposez votre playlist M3U</p>
                                <p className="text-[11px] text-white/40 mt-2 uppercase tracking-wider font-mono">Fichiers supportés : m3u, m3u8, txt</p>
                                
                                {localFile && (
                                  <div className="mt-4 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-xs text-blue-400 font-mono">
                                    📁 {localFile.name} ({(localFile.size / 1024).toFixed(1)} Ko)
                                  </div>
                                )}
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 md:p-6 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                        <button 
                          onClick={() => {
                            setIsScanning(false);
                            setLocalFile(null);
                            setScanUrl('');
                          }}
                          className="w-full sm:w-auto px-6 py-3.5 text-white/50 hover:text-white font-black text-[10px] md:text-xs uppercase tracking-widest order-2 sm:order-1"
                          disabled={isProcessing}
                        >
                          Annuler
                        </button>
                        <button 
                          onClick={handleScan}
                          disabled={isProcessing || (scanType !== 'local' && scanType !== 'tvmio' && !scanUrl) || (scanType === 'local' && !localFile)}
                          className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2"
                        >
                          {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : (scanType === 'tvmio' ? <Download size={14} /> : <Radar size={14} />)}
                          {scanType === 'tvmio' ? 'Lancer' : 'Analyser'}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* STEP 2: SHOW CHANNELS PREVIEW TABLE AND MANAGE SELECTIVE IMPORT */
                    <>
                      {/* Control Panel Above Table */}
                      <div className="p-4 sm:p-6 bg-[#161616] border-b border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 shrink-0">
                        {/* Search */}
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                          <input 
                            type="text" 
                            placeholder="Rechercher..." 
                            value={previewFilter}
                            onChange={e => {
                              setPreviewFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-blue-600 transition-all font-medium"
                          />
                        </div>

                        {/* Category Dropdown Filter */}
                        <div>
                          <select 
                            value={selectedPreviewCategory}
                            onChange={e => {
                              setSelectedPreviewCategory(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-blue-600 font-medium"
                          >
                            <option value="ALL">Catégories ({uniqueM3uCategories(parsedPreviewChannels).length - 1})</option>
                            {uniqueM3uCategories(parsedPreviewChannels).filter(c => c !== 'ALL').map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        {/* Global Category Override */}
                        <div className="hidden md:block">
                          <input 
                            type="text" 
                            placeholder="Forcer catégorie..." 
                            value={globalCategoryOverride}
                            onChange={e => setGlobalCategoryOverride(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:border-blue-600 transition-all font-medium"
                          />
                        </div>
                      </div>

                      {/* Channels list - Responsive Card or Table */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
                        {!isMobile ? (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#181818] text-white/40 font-black uppercase tracking-widest border-b border-white/10 sticky top-0 z-20">
                              <tr>
                                <th className="px-6 py-4 w-12 text-center text-red-500 font-bold text-[14px]">
                                   <Tv size={14} />
                                </th>
                                <th className="px-6 py-4 w-16 text-center">Logo</th>
                                <th className="px-6 py-4">Nom de la Chaîne</th>
                                <th className="px-6 py-4 w-48 font-mono">Groupe Original</th>
                                <th className="px-6 py-4">URL</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {getPaginatedPreview(
                                getFilteredPreview(parsedPreviewChannels, previewFilter, selectedPreviewCategory),
                                currentPage
                              ).map((ch, idx) => {
                                const isChecked = channelsToImport.includes(ch.url);
                                return (
                                  <tr 
                                    key={idx} 
                                    className={cn(
                                      "hover:bg-white/[0.02] cursor-pointer transition-colors",
                                      isChecked ? "bg-red-600/[0.03]" : ""
                                    )}
                                    onClick={() => {
                                      if (isChecked) {
                                        setChannelsToImport(prev => prev.filter(url => url !== ch.url));
                                      } else {
                                        setChannelsToImport(prev => [...prev, ch.url]);
                                      }
                                    }}
                                  >
                                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                      <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setChannelsToImport(prev => prev.filter(url => url !== ch.url));
                                          } else {
                                            setChannelsToImport(prev => [...prev, ch.url]);
                                          }
                                        }}
                                        className="w-4 h-4 rounded bg-white/5 border-white/20 accent-red-650"
                                      />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <img 
                                        src={ch.logo} 
                                        alt="" 
                                        referrerPolicy="no-referrer"
                                        onError={e => {
                                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120';
                                        }}
                                        className="w-10 h-10 object-contain rounded-xl bg-white/5 border border-white/10 mx-auto"
                                      />
                                    </td>
                                    <td className="px-6 py-4 font-black text-white text-[13px]">
                                      {ch.name}
                                    </td>
                                    <td className="px-6 py-4 text-white/40 font-bold uppercase tracking-tighter text-[9.5px]">
                                      <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{ch.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-white/20 font-mono text-[9px] truncate max-w-xs uppercase">
                                      {ch.url}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="p-4 space-y-4">
                             <div className="flex items-center justify-between px-2 mb-2">
                               <button 
                                 onClick={() => {
                                   const visible = getFilteredPreview(parsedPreviewChannels, previewFilter, selectedPreviewCategory).map(ch => ch.url);
                                   if (visible.every(url => channelsToImport.includes(url))) {
                                      setChannelsToImport(prev => prev.filter(url => !visible.includes(url)));
                                   } else {
                                      setChannelsToImport(prev => [...new Set([...prev, ...visible])]);
                                   }
                                 }}
                                 className="text-[10px] font-black uppercase text-red-500 tracking-widest bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 active:scale-95 transition-all"
                               >
                                 Tout Sélectionner ({getFilteredPreview(parsedPreviewChannels, previewFilter, selectedPreviewCategory).length})
                               </button>
                             </div>
                             {getPaginatedPreview(
                                getFilteredPreview(parsedPreviewChannels, previewFilter, selectedPreviewCategory),
                                currentPage
                              ).map((ch, idx) => {
                                const isChecked = channelsToImport.includes(ch.url);
                                return (
                                  <div 
                                    key={idx}
                                    onClick={() => {
                                      if (isChecked) {
                                        setChannelsToImport(prev => prev.filter(url => url !== ch.url));
                                      } else {
                                        setChannelsToImport(prev => [...prev, ch.url]);
                                      }
                                    }}
                                    className={cn(
                                      "p-4 rounded-[20px] active:scale-[0.98] transition-all flex items-center gap-4 relative",
                                      isChecked ? "bg-red-650/10 border border-red-650/40 ring-2 ring-red-600/5 shadow-xl shadow-red-600/10" : "bg-white/[0.03] border border-white/5"
                                    )}
                                  >
                                    <div className="w-12 h-12 bg-black/50 border border-white/10 rounded-xl p-1.5 shrink-0 flex items-center justify-center">
                                      <img 
                                        src={ch.logo} 
                                        alt="" 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-black text-white text-sm truncate uppercase tracking-tight">{ch.name}</h4>
                                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5 truncate">{ch.category}</p>
                                    </div>
                                    <div className={cn(
                                       "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                       isChecked ? "bg-red-600 border-red-400 scale-110 shadow-lg" : "bg-white/5 border-white/10"
                                    )}>
                                      {isChecked && <Check size={14} className="text-white" strokeWidth={4} />}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* Pagination Controls & Actions Bottom */}
                      <div className="p-4 sm:p-6 bg-[#161616] border-t border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
                        {/* Page controls */}
                        <div className="flex items-center gap-3">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="bg-white/5 border border-white/10 active:scale-95 font-bold font-mono text-[10px] px-3 py-2 rounded-xl text-white disabled:opacity-40"
                          >
                            ◄
                          </button>
                          <span className="text-[10px] sm:text-xs font-mono text-white/40 uppercase tracking-widest">
                            Page <strong className="text-white bg-white/5 px-2 py-0.5 rounded">{currentPage}</strong> / {Math.ceil(getFilteredPreview(parsedPreviewChannels, previewFilter, selectedPreviewCategory).length / 20) || 1}
                          </span>
                          <button 
                            disabled={currentPage >= Math.ceil(getFilteredPreview(parsedPreviewChannels, previewFilter, selectedPreviewCategory).length / 20)}
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(getFilteredPreview(parsedPreviewChannels, previewFilter, selectedPreviewCategory).length / 20), prev + 1))}
                            className="bg-white/5 border border-white/10 active:scale-95 font-bold font-mono text-[10px] px-3 py-2 rounded-xl text-white disabled:opacity-40"
                          >
                            ►
                          </button>
                        </div>

                        {/* Import and Back Buttons */}
                        <div className="flex gap-3 w-full sm:w-auto">
                          <button 
                            onClick={() => {
                              setParsedPreviewChannels([]);
                              setChannelsToImport([]);
                              setLocalFile(null);
                              setGlobalCategoryOverride('');
                            }}
                            className="flex-1 sm:flex-none px-5 py-4 rounded-2xl bg-white/5 active:bg-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                            disabled={isProcessing}
                          >
                            Lâcher
                          </button>
                          <button 
                            onClick={handleBulkImportSubmit}
                            className="flex-[2] sm:flex-none px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-red-600/30 flex items-center justify-center gap-2"
                            disabled={isProcessing || channelsToImport.length === 0}
                          >
                            {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <FileUp size={16} />}
                            Importer ({channelsToImport.length})
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            )}

            <div className="bg-white/[0.01] rounded-[2.5rem] border border-white/5 overflow-hidden">
              {!isMobile ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white/[0.03] text-white/40 font-black uppercase tracking-widest border-b border-white/10">
                    <tr>
                      <th className="px-4 md:px-6 py-6 w-12">
                        <input 
                          type="checkbox"
                          checked={selectedChannels.length === channels.length && channels.length > 0}
                          onChange={(e) => setSelectedChannels(e.target.checked ? channels.map(c => c.id) : [])}
                          className="w-4 h-4 rounded-lg bg-white/5 border-white/20 accent-red-600"
                        />
                      </th>
                      <th className="px-4 md:px-6 py-6">Canal</th>
                      <th className="hidden md:table-cell px-6 py-6">Signal</th>
                      <th className="hidden lg:table-cell px-6 py-6 font-mono text-[10px]">Catégorie / Pays</th>
                      <th className="hidden xl:table-cell px-6 py-6 font-mono text-[10px]">Source URL</th>
                      <th className="hidden md:table-cell px-6 py-6 uppercase font-mono text-[10px]">EPG Mapping</th>
                      <th className="px-4 md:px-6 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {channels.filter(c => 
                      (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
                      (c.category && (c.category || '').toLowerCase().includes(search.toLowerCase())) ||
                      (c.country || '').toLowerCase().includes(search.toLowerCase())
                    ).map((channel, i) => (
                      <tr 
                        key={`${channel.id || 'chan'}-${i}`} 
                        onClick={() => toggleChannelSelection(channel.id)}
                        className={cn(
                          "hover:bg-white/[0.03] transition-colors cursor-pointer group",
                          selectedChannels.includes(channel.id) ? "bg-red-600/5" : ""
                        )}
                      >
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={selectedChannels.includes(channel.id)}
                            onChange={() => toggleChannelSelection(channel.id)}
                            className="w-4 h-4 rounded-lg bg-white/5 border-white/20 accent-red-600"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black border border-white/10 rounded-xl p-2 shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
                              {channel.logo ? (
                                <img src={channel.logo} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <Tv size={18} className="text-white/30" />
                              )}
                            </div>
                            <div>
                              <div className="font-black text-white text-sm tracking-tight flex items-center gap-2">
                                {channel.name} 
                              </div>
                              <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">#{channel.channelNumber || '--'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                channel.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                channel.status === 'slow' ? 'bg-amber-500' : 'bg-red-500'
                              )} />
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-tighter",
                                channel.status === 'online' ? 'text-emerald-500' :
                                channel.status === 'slow' ? 'text-amber-500' : 'text-red-500'
                              )}>
                                {channel.status === 'online' ? 'Online' : channel.status === 'slow' ? 'Slow' : 'Offline'}
                              </span>
                            </div>
                            <div className="text-[9px] text-white/30 font-mono">{channel.responseTime ? `${channel.responseTime}ms` : '--'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className="px-2.5 py-0.5 bg-blue-600/10 text-blue-400 border border-blue-600/20 rounded-lg text-[9px] font-black uppercase tracking-widest">{channel.category}</span>
                            <div className="flex items-center gap-1 text-[9px] text-white/40 font-bold">{channel.country || 'International'} <Languages size={10} /></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-[150px] truncate font-mono text-[9px] text-white/40 mb-1" title={channel.url}>{channel.url}</div>
                          <div className="flex gap-1">
                            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-mono text-white/40 uppercase">{channel.format || 'HLS'}</span>
                            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-mono text-white/40 uppercase">{channel.quality || 'Auto'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <BookOpen size={14} className={channel.epgId ? "text-emerald-500" : "text-white/20"} />
                            <span className={cn("text-[9px] font-bold uppercase", channel.epgId ? "text-white" : "text-white/20")}>
                              {channel.epgId || 'Non lié'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleDuplicate(channel.id)}
                              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                              title="Dupliquer"
                            >
                              <Copy size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingId(channel.id);
                                setFormData(channel);
                                setIsAdding(true);
                              }}
                              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                              title="Éditer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => onDeleteChannel(channel.id)}
                              className="p-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {channels.filter(c => 
                    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
                    (c.category && (c.category || '').toLowerCase().includes(search.toLowerCase())) ||
                    (c.country || '').toLowerCase().includes(search.toLowerCase())
                  ).map((channel, i) => (
                    <div 
                      key={`${channel.id || 'chan'}-${i}`}
                      onClick={() => toggleChannelSelection(channel.id)}
                      className={cn(
                        "bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all active:scale-[0.98]",
                        selectedChannels.includes(channel.id) ? "border-red-600/50 bg-red-600/5" : ""
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black border border-white/10 rounded-xl p-2 shrink-0 flex items-center justify-center">
                          {channel.logo ? (
                            <img src={channel.logo} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Tv size={18} className="text-white/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                             <h4 className="font-black text-white text-sm uppercase truncate tracking-tight">{channel.name}</h4>
                             <div className={cn(
                               "w-2 h-2 rounded-full shrink-0",
                               channel.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"
                             )} />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate leading-none">
                               #{channel.channelNumber || '--'} • {channel.category}
                             </span>
                             {channel.country && <span className="bg-white/5 text-white/30 px-1 rounded text-[8px] font-black uppercase tracking-tighter leading-none">{channel.country}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                           <button 
                              onClick={() => {
                                setEditingId(channel.id);
                                setFormData(channel);
                                setIsAdding(true);
                              }}
                              className="p-2 text-white/40 active:text-white"
                           >
                             <Edit2 size={16} />
                           </button>
                           <button 
                              onClick={() => onDeleteChannel(channel.id)}
                              className="p-2 text-white/40 active:text-red-500"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'categories' && (
          <motion.div 
            key="categories"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Gestion des Catégories</h2>
              <button 
                onClick={() => {
                  setEditingCategoryId(null);
                  setCategoryFormData({ name: '', icon: 'LayoutGrid', color: '#00A8E1' });
                  setIsAddingCategory(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Plus size={14} /> Nouvelle Catégorie
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...categories].sort((a, b) => a.order - b.order).map((cat, i) => (
                <div key={`cat-${cat.id || ''}-${i}`} className="bg-[#111111] border border-white/5 rounded-3xl p-6 group hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                      style={{ backgroundColor: `${cat.color}20`, border: `2px solid ${cat.color}` }}
                    >
                      {cat.name === 'Sports' && <Trophy className="text-blue-500" />}
                      {cat.name === 'Films' && <Film className="text-purple-500" />}
                      {cat.name === 'Séries' && <Tv className="text-pink-500" />}
                      {cat.name === 'Jeunesse' && <Baby className="text-amber-500" />}
                      {!['Sports', 'Films', 'Séries', 'Jeunesse'].includes(cat.name) && <LayoutGrid className="text-white" />}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setCategoryFormData(cat);
                          setIsAddingCategory(true);
                        }}
                        className="p-2 hover:bg-white/10 rounded-xl text-white/50 hover:text-white"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 hover:bg-red-500/10 rounded-xl text-white/50 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-white">{cat.name}</h4>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{channels.filter(c => c.category === cat.name).length} Chaînes</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    <span>Position: {i + 1}</span>
                    <div className="flex gap-2">
                       <button className="hover:text-white"><ArrowRightLeft size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isAddingCategory && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddingCategory(false)} />
                <motion.div 
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="w-full max-w-md bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 relative z-10"
                >
                  <h3 className="text-xl font-black text-white uppercase mb-6">{editingCategoryId ? 'Modifier' : 'Nouvelle'} Catégorie</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Nom</label>
                      <input 
                        type="text" 
                        value={categoryFormData.name} 
                        onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-red-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Couleur Accent</label>
                        <input 
                          type="color" 
                          value={categoryFormData.color} 
                          onChange={e => setCategoryFormData({...categoryFormData, color: e.target.value})}
                          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-2 py-2 appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block ml-1">Ordre</label>
                        <input 
                          type="number" 
                          value={categoryFormData.order || 0} 
                          onChange={e => setCategoryFormData({...categoryFormData, order: parseInt(e.target.value)})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-red-600"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setIsAddingCategory(false)} className="flex-1 py-4 text-white/50 font-black uppercase text-xs tracking-widest">Annuler</button>
                      <button onClick={handleSaveCategory} className="flex-2 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-600/20">Enregistrer</button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'streams' && (
          <motion.div 
            key="streams"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Santé des Flux</h2>
                <p className="text-white/40 text-xs mt-1">Diagnostic en temps réel et métriques.</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => axios.post('/api/channels/check')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all"
                >
                  <Activity size={14} /> Diagnostic
                </button>
              </div>
            </div>

            <div className="bg-white/[0.01] rounded-[2.5rem] border border-white/5 overflow-hidden">
               {!isMobile ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-white/[0.03] text-white/40 font-black uppercase tracking-widest border-b border-white/10 text-[9px]">
                      <tr>
                        <th className="px-6 py-4">Nom</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Latence</th>
                        <th className="px-6 py-4">Résolution</th>
                        <th className="px-6 py-4">Codec V/A</th>
                        <th className="px-6 py-4">Format</th>
                        <th className="px-6 py-4">Serveur</th>
                        <th className="px-6 py-4 text-right">Dernier Scan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {channels.map((ch, i) => (
                        <tr key={`stream-row-${ch.id || 'ch'}-${i}`} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-black tracking-tight">{ch.name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <div className={cn("w-1.5 h-1.5 rounded-full", ch.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500')} />
                               <span className={cn("uppercase text-[8px] font-black", ch.status === 'online' ? 'text-emerald-500' : 'text-red-500')}>{ch.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-[9px] text-white/60">{ch.responseTime || '--'} ms</td>
                          <td className="px-6 py-4 font-mono text-[9px] text-white/60">{ch.resolution || 'Auto'}</td>
                          <td className="px-6 py-4 font-mono text-[9px] text-white/60">{ch.codecVideo || 'H264'} / {ch.codecAudio || 'AAC'}</td>
                          <td className="px-6 py-4"><span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-mono text-white/40 uppercase">{ch.format || 'HLS'}</span></td>
                          <td className="px-6 py-4 font-mono text-[9px] text-white/40 uppercase tracking-widest">{ch.server || 'Main'}</td>
                          <td className="px-6 py-4 text-right text-white/20 font-mono text-[8px]">{ch.lastCheck ? new Date(ch.lastCheck).toLocaleTimeString() : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               ) : (
                  <div className="p-4 space-y-3">
                    {channels.map((ch, i) => (
                      <div key={`stream-card-${ch.id || 'ch'}-${i}`} className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <h4 className="font-black text-white text-sm uppercase tracking-tight">{ch.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                 <div className={cn("w-1.5 h-1.5 rounded-full", ch.status === 'online' ? 'bg-emerald-500' : 'bg-red-500')} />
                                 <span className={cn("uppercase text-[9px] font-black tracking-widest", ch.status === 'online' ? 'text-emerald-500' : 'text-red-500')}>{ch.status}</span>
                              </div>
                           </div>
                           <div className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-[9px] font-mono text-white/40 uppercase font-bold">
                              {ch.format || 'HLS'}
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Latence</p>
                              <p className="text-[10px] font-mono text-white/70">{ch.responseTime || '--'} ms</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Résolution</p>
                              <p className="text-[10px] font-mono text-white/70">{ch.resolution || '--'}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Codec</p>
                              <p className="text-[10px] font-mono text-white/70">{ch.codecVideo || 'H264'}</p>
                           </div>
                           <div className="space-y-1 text-right">
                              <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Dernier Check</p>
                              <p className="text-[10px] font-mono text-white/40">{ch.lastCheck ? new Date(ch.lastCheck).toLocaleTimeString() : 'N/A'}</p>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
               )}
            </div>
          </motion.div>
        )}

        {activeTab === 'epg' && (
          <motion.div 
            key="epg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
             <div className="flex justify-between items-center">
                <div>
                   <h2 className="text-xl font-black text-white uppercase tracking-tight">Programmes TV (EPG)</h2>
                   <p className="text-white/40 text-xs mt-1">Gérez vos sources de données et synchronisations horaires.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <Plus size={14} /> Ajouter une source
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {epgSources.map((source, i) => (
                  <div key={source.url || i} className="bg-[#111111] border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between">
                     <div className="flex gap-6">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shrink-0">
                           <Database size={32} className="text-blue-500" />
                        </div>
                        <div className="space-y-2 flex-1">
                           <div className="flex justify-between items-start">
                              <h4 className="text-lg font-black text-white">{source.name}</h4>
                              <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest", source.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20')}>
                                 {source.isActive ? 'Actif' : 'Inactif'}
                              </span>
                           </div>
                           <p className="text-[10px] font-mono text-white/30 truncate">{source.url}</p>
                           <div className="flex gap-4 items-center pt-2">
                              <div className="flex items-center gap-1.5">
                                 <RefreshCw size={12} className="text-white/20" />
                                 <span className="text-[9px] text-white/40 font-bold uppercase">6 heures</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                 <Clock size={12} className="text-white/20" />
                                 <span className="text-[9px] text-white/40 font-bold uppercase">UTC+0</span>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
                        <button onClick={() => handleToggleSource(i)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">S'abonner</button>
                        <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Editer</button>
                     </div>
                  </div>
                ))}
             </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div 
            key="security"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto space-y-8"
          >
             <div className="text-center space-y-2">
                <ShieldAlert className="text-red-500 mx-auto" size={48} />
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Paramètres de Sécurité</h2>
                <p className="text-white/40 text-sm">Contrôlez l'accès au centre d'administration et aux flux sensibles.</p>
             </div>

             <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 space-y-10 shadow-2xl">
                <div className="space-y-6">
                   <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-3">
                      <Lock size={14} /> Changement du Code PIN
                   </h3>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-white/60 uppercase tracking-widest block ml-1">Ancien PIN</label>
                         <input type="password" maxLength={4} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-xl font-black text-white tracking-[0.5em] focus:border-red-600 outline-none" placeholder="****" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-white/60 uppercase tracking-widest block ml-1">Nouveau PIN</label>
                         <input type="password" maxLength={4} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-xl font-black text-white tracking-[0.5em] focus:border-red-600 outline-none" placeholder="****" />
                      </div>
                   </div>
                   <button className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105">Mettre à jour le PIN</button>
                </div>

                <div className="pt-10 border-t border-white/5 space-y-6">
                   <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-3">
                      <ShieldAlert size={14} /> Restrictions Globales
                   </h3>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                         <div>
                            <p className="text-white font-black uppercase tracking-tight text-sm">Bloquer Adresses IP Non-Voisines</p>
                            <p className="text-white/30 text-[10px] font-medium tracking-wide">Autorise seulement les accès depuis votre réseau local.</p>
                         </div>
                         <div className="w-12 h-6 bg-red-600 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                      </div>
                      <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                         <div>
                            <p className="text-white font-black uppercase tracking-tight text-sm">Masquer URL des Flux</p>
                            <p className="text-white/30 text-[10px] font-medium tracking-wide">Cache les adresses réelles dans le diagnostic public.</p>
                         </div>
                         <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-4 h-4 bg-white/40 rounded-full"></div></div>
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
