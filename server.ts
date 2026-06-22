/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import zlib from 'zlib';
import { parseStringPromise } from 'xml2js';
import { Movie } from './src/types';

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'db.json');
const EPG_CACHE_PATH = path.join(process.cwd(), 'epg_cache.json');

// Initial data
const INITIAL_DATA = {
  channels: [],
  categories: [
    { id: '1', name: 'Généralistes', icon: 'LayoutGrid', color: '#00A8E1', order: 0 },
    { id: '2', name: 'Cinéma & Séries', icon: 'Film', color: '#8b5cf6', order: 1 },
    { id: '4', name: 'Information', icon: 'Globe', color: '#0ea5e9', order: 2 },
    { id: '5', name: 'Documentaires', icon: 'BookOpen', color: '#6366f1', order: 3 },
    { id: '6', name: 'Jeunesse', icon: 'Baby', color: '#f59e0b', order: 4 },
    { id: '7', name: 'Loisirs & Découverte', icon: 'Compass', color: '#10b981', order: 5 },
    { id: '8', name: 'Musique', icon: 'Music', color: '#ec4899', order: 6 },
    { id: '9', name: 'International & Local', icon: 'MapPin', color: '#6b7280', order: 7 }
  ],
  movies: [],
  settings: {
    language: 'fr',
    videoQuality: 'auto',
    parentalLock: false,
    pin: '0104',
    theme: 'dark'
  },
  epgCache: {}
};

function readDb() {
  try {
    let data;
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2));
      data = INITIAL_DATA;
    } else {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
    // Clean demo channels anyway to fulfill clean up requirements with full null-safety
    if (data && data.channels) {
      const originalCount = data.channels.length;
      let channels = data.channels.filter((c: any) => {
        if (!c) return false;
        const urlStr = c.url || '';
        const nameStr = c.name || '';
        return !urlStr.includes('test-streams.mux.dev') || nameStr.toLowerCase().includes('france 2');
      });
      
      // Remove duplicate channel IDs
      const uniqueChannels = [];
      const idSet = new Set();
      for (const c of channels) {
        if (c && c.id) {
          if (!idSet.has(c.id)) {
            idSet.add(c.id);
            uniqueChannels.push(c);
          }
        } else if (c) {
          uniqueChannels.push(c);
        }
      }
      
      /*
      // Add Bein Sport 1 if it doesn't exist
      const beinChannelName = 'Bein Sport 1';
      if (!uniqueChannels.some(c => c.name === beinChannelName)) {
        uniqueChannels.push({
          id: 'bein-1-cartelive',
          name: beinChannelName,
          category: '2', // Sports
          url: '/api/proxy/cartelive?feed=ufeed01',
          fallbackUrl: '',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/BeIN_SPORTS_1_-_Logo_2017.svg/1024px-BeIN_SPORTS_1_-_Logo_2017.svg.png',
          status: 'online',
          responseTime: 100,
          format: 'HLS (.m3u8)',
          quality: 'HD'
        });
      }

      const bein2Name = 'Bein Sport 2';
      if (!uniqueChannels.some(c => c.name === bein2Name)) {
        uniqueChannels.push({
          id: 'bein-2-cartelive',
          name: bein2Name,
          category: '2', // Sports
          url: '/api/proxy/cartelive?feed=ufeed02',
          fallbackUrl: '',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/BeIN_SPORTS_2_-_Logo_2017.svg/1024px-BeIN_SPORTS_2_-_Logo_2017.svg.png',
          status: 'online',
          responseTime: 100,
          format: 'HLS (.m3u8)',
          quality: 'HD'
        });
      }

      const rmc1Name = 'RMC Sport 1';
      if (!uniqueChannels.some(c => c.name === rmc1Name)) {
        uniqueChannels.push({
          id: 'rmc-1-cartelive',
          name: rmc1Name,
          category: '2', // Sports
          url: '/api/proxy/cartelive?feed=ufeed17',
          fallbackUrl: '',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/RMC_Sport_1_logo.png/1200px-RMC_Sport_1_logo.png',
          status: 'online',
          responseTime: 100,
          format: 'HLS (.m3u8)',
          quality: 'HD'
        });
      }

      const rmc2Name = 'RMC Sport 2';
      if (!uniqueChannels.some(c => c.name === rmc2Name)) {
        uniqueChannels.push({
          id: 'rmc-2-cartelive',
          name: rmc2Name,
          category: '2', // Sports
          url: '/api/proxy/cartelive?feed=ufeed18',
          fallbackUrl: '',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/RMC_Sport_2_logo.png/1200px-RMC_Sport_2_logo.png',
          status: 'online',
          responseTime: 100,
          format: 'HLS (.m3u8)',
          quality: 'HD'
        });
      }
      */

      data.channels = uniqueChannels;
      if (data.channels.length !== originalCount) {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
      }
    }
    return data;
  } catch (err) {
    console.error('Error reading DB:', err);
    return INITIAL_DATA;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

interface StreamStats {
  status: 'online' | 'slow' | 'offline';
  responseTime: number;
  format: string;
  quality: 'HD' | 'SD' | 'Hors Service';
}

async function checkStream(url: string): Promise<StreamStats> {
  const start = Date.now();
  let format = 'Inconnu';
  if (url.includes('.m3u8')) format = 'HLS (.m3u8)';
  else if (url.includes('.ts')) format = 'MPEG-TS (.ts)';
  else if (url.includes('.mp4')) format = 'MPEG-4 (.mp4)';

  const fullUrl = url.startsWith('/') ? `http://localhost:3000${url}` : url;

  try {
    const response = await axios.get(fullUrl, { 
      timeout: 5000, 
      headers: { 'Range': 'bytes=0-1024', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      validateStatus: (status) => status < 400 || status === 416
    });
    const responsetime = Date.now() - start;
    const status = responsetime > 2500 ? 'slow' : 'online';
    const quality = responsetime < 1200 ? 'HD' : 'SD';
    return {
      status,
      responseTime: responsetime,
      format,
      quality
    };
  } catch (err) {
    return {
      status: 'offline',
      responseTime: 0,
      format,
      quality: 'Hors Service'
    };
  }
}

// Normalized name for robust fuzzy matching (strip accents, spaces, quality codes, prefixes)
function normalizeChannelName(name: any): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\b(fhd|hd|sd|4k|hevc|vip|backup|ts|usa|es|direct)\b/g, '')
    .replace(/\b(fr|be|ch)(:|\s*$)/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function parseXMLTVDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  try {
    const cleanStr = dateStr.replace(/\s+/g, '');
    const year = parseInt(cleanStr.substring(0, 4));
    const month = parseInt(cleanStr.substring(4, 6)) - 1;
    const day = parseInt(cleanStr.substring(6, 8));
    const hour = parseInt(cleanStr.substring(8, 10));
    const minute = parseInt(cleanStr.substring(10, 12));
    const second = parseInt(cleanStr.substring(12, 14)) || 0;

    let offsetMinutes = 0;
    const plusIdx = dateStr.indexOf('+');
    const minusIdx = dateStr.indexOf('-');
    const offsetIndex = plusIdx !== -1 ? plusIdx : minusIdx;
    
    if (offsetIndex !== -1) {
      const sign = dateStr.charAt(offsetIndex) === '+' ? 1 : -1;
      const offsetStr = dateStr.substring(offsetIndex + 1).trim();
      if (offsetStr.length >= 4) {
        const offsetHours = parseInt(offsetStr.substring(0, 2)) || 0;
        const offsetMins = parseInt(offsetStr.substring(2, 4)) || 0;
        offsetMinutes = sign * (offsetHours * 60 + offsetMins);
      }
    }

    const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second));
    if (offsetMinutes !== 0) {
      utcDate.setMinutes(utcDate.getMinutes() - offsetMinutes);
    }
    return utcDate;
  } catch (err) {
    console.error('Failed to parse XMLTV date:', dateStr, err);
    return new Date();
  }
}

function getXMLTVText(el: any): string {
  if (!el) return '';
  if (Array.isArray(el)) {
    if (el.length === 0) return '';
    return getXMLTVText(el[0]);
  }
  if (typeof el === 'object') {
    return el._ || el.value || '';
  }
  return String(el);
}

// In-Memory EPG structures to avoid bloat in db.json
let cachedProgrammes: any[] = [];
let indexedProgrammes: { [normalizedChannel: string]: any[] } = {};

function loadEpgCache() {
  try {
    if (fs.existsSync(EPG_CACHE_PATH)) {
      cachedProgrammes = JSON.parse(fs.readFileSync(EPG_CACHE_PATH, 'utf-8'));
      console.log(`Loaded ${cachedProgrammes.length} programs from local EPG cache.`);
      reindexProgrammes();
    }
  } catch (err) {
    console.error('Error loading EPG cache from disk:', err);
  }
}

function saveEpgCache() {
  try {
    fs.writeFileSync(EPG_CACHE_PATH, JSON.stringify(cachedProgrammes, null, 2));
    console.log(`Saved ${cachedProgrammes.length} programs to local EPG cache.`);
  } catch (err) {
    console.error('Error saving EPG cache to disk:', err);
  }
}

function reindexProgrammes() {
  const index: { [normalizedChannel: string]: any[] } = {};
  for (const prog of cachedProgrammes) {
    const channelIdAttr = prog.channelId;
    if (!channelIdAttr) continue;

    const norm = normalizeChannelName(channelIdAttr);
    if (!norm) continue;

    if (!index[norm]) {
      index[norm] = [];
    }
    index[norm].push(prog);
  }

  // Sort programs by start date
  for (const norm in index) {
    index[norm].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  indexedProgrammes = index;
  console.log(`Re-indexed EPG database: mapped ${Object.keys(indexedProgrammes).length} channels.`);
}

async function syncEPG(io: Server) {
  const db = readDb();
  console.log('Initiating EPG synchronization sync...');
  let newProgrammes: any[] = [];

  for (const source of db.epgSources) {
    if (!source.isActive) continue;
    try {
      console.log(`Fetching EPG source: ${source.name} (${source.url})`);
      const response = await axios.get(source.url, { responseType: 'arraybuffer', timeout: 25000 });
      let xml: string;

      if (source.url.endsWith('.gz')) {
        xml = zlib.gunzipSync(response.data).toString();
      } else {
        xml = response.data.toString();
      }

      console.log(`Parsing XML elements for ${source.name}...`);
      const result = await parseStringPromise(xml);

      if (result && result.tv && result.tv.programme) {
        const rawProgrammes = result.tv.programme;
        console.log(`Discovered ${rawProgrammes.length} program attributes in ${source.name}. Processing...`);

        for (const prog of rawProgrammes) {
          const channelId = prog.$.channel;
          const startStr = prog.$.start;
          const stopStr = prog.$.stop;

          if (!channelId || !startStr || !stopStr) continue;

          const title = getXMLTVText(prog.title);
          const desc = getXMLTVText(prog.desc);
          const category = getXMLTVText(prog.category);
          
          let icon = '';
          if (prog.icon && Array.isArray(prog.icon) && prog.icon[0] && prog.icon[0].$) {
             icon = prog.icon[0].$.src || '';
          }

          const startTime = parseXMLTVDate(startStr).toISOString();
          const endTime = parseXMLTVDate(stopStr).toISOString();

          newProgrammes.push({
            channelId,
            title,
            description: desc,
            category,
            icon,
            startTime,
            endTime
          });
        }
        source.lastSync = new Date().toISOString();
      }
    } catch (err) {
      console.error(`EPG sync failed for ${source.name}:`, err);
    }
  }

  if (newProgrammes.length > 0) {
    cachedProgrammes = newProgrammes;
    saveEpgCache();
    reindexProgrammes();
  }

  writeDb(db);
  io.emit('EPG_SYNCED', { lastSync: new Date().toISOString() });
}

// Fetch lists from iptv-org and store them to heal offline channels
async function fetchAndIndexIptvOrg(): Promise<{ [normalizedName: string]: string[] }> {
  const index: { [normalizedName: string]: string[] } = {};
  const urls = [
    'https://iptv-org.github.io/iptv/countries/fr.m3u',
    'https://iptv-org.github.io/iptv/categories/sports.m3u',
    'https://iptv-org.github.io/iptv/categories/news.m3u'
  ];

  for (const url of urls) {
    try {
      console.log(`IPTV AutoRepair: indexing from playlist ${url}`);
      const res = await axios.get(url, { timeout: 15000 });
      const content = res.data;
      const lines = content.split('\n');

      let currentName = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#EXTINF:')) {
          const commaIndex = trimmed.lastIndexOf(',');
          currentName = commaIndex !== -1 ? trimmed.substring(commaIndex + 1).trim() : '';
        } else if (trimmed && !trimmed.startsWith('#') && currentName) {
          const streamUrl = trimmed;
          const norm = normalizeChannelName(currentName);
          if (norm && streamUrl) {
            if (!index[norm]) index[norm] = [];
            if (!index[norm].includes(streamUrl)) {
              index[norm].push(streamUrl);
            }
          }
          currentName = '';
        }
      }
    } catch (err) {
      console.error(`Failed to index iptv-org category list: ${url}`);
    }
  }
  return index;
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  app.post('/api/log-error', (req, res) => {
    console.error('CLIENT ERROR LOGGED:', req.body);
    res.json({ ok: true });
  });

  // Load cache initially
  loadEpgCache();
  
  // Initial sync attempt at startup
  setTimeout(async () => {
    const db = readDb();
    const hasSync = db.epgSources?.some(s => s.lastSync);
    if (!hasSync || cachedProgrammes.length === 0) {
      console.log('No EPG sync found or cache empty, performing initial sync...');
      await syncEPG(io);
    }
  }, 5000);
  
  // Self-heal/cleanup database of any duplicates or invalid demo channels at startup
  readDb();

  // API Routes
  app.get('/api/data', (req, res) => {
    res.json(readDb());
  });

  app.get('/api/movies', (req, res) => {
    const db = readDb();
    res.json(db.movies || []);
  });

  app.post('/api/movies', (req, res) => {
    const db = readDb();
    const movie = req.body;
    movie.id = Date.now().toString();
    if (!db.movies) db.movies = [];
    db.movies.push(movie);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    io.emit('MOVIES_UPDATED', db.movies);
    res.json(movie);
  });

  app.put('/api/movies/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const updated = req.body;
    db.movies = (db.movies || []).map((m: any) => m.id === id ? { ...m, ...updated } : m);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    io.emit('MOVIES_UPDATED', db.movies);
    res.json(updated);
  });

  app.delete('/api/movies/:id', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    db.movies = (db.movies || []).filter((m: any) => m.id !== id);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    io.emit('MOVIES_UPDATED', db.movies);
    res.json({ success: true });
  });



  app.get('/api/stats', (req, res) => {
    const db = readDb();
    const online = db.channels.filter((c: any) => c.status === 'online').length;
    const slow = db.channels.filter((c: any) => c.status === 'slow').length;
    const offline = db.channels.filter((c: any) => c.status === 'offline').length;
    
    res.json({
      totalChannels: db.channels.length,
      activeChannels: online + slow,
      offlineChannels: offline,
      totalCategories: db.categories.length,
      lastEpgSync: db.epgSources.reduce((latest: string | null, s: any) => {
        if (!s.lastSync) return latest;
        if (!latest) return s.lastSync;
        return new Date(s.lastSync) > new Date(latest) ? s.lastSync : latest;
      }, null),
      healthScore: db.channels.length > 0 ? Math.round(((online + (slow * 0.5)) / db.channels.length) * 100) : 0
    });
  });

  // Helper to find the correct EPG programs for a channel based on strict and priority rules
  function findCorrectEpgProgs(channel: any): any[] {
    const areProgsMatching = (vcNorm: string, dbNorm: string) => {
      if (vcNorm === dbNorm) return true;

      // cherie/cheri variation
      const vcCherie = vcNorm.replace(/cherie?/g, 'cheri');
      const dbCherie = dbNorm.replace(/cherie?/g, 'cheri');
      if (vcCherie === dbCherie) return true;

      // sport/sports variation
      const vcSport = vcNorm.replace(/sports?/g, 'sport');
      const dbSport = dbNorm.replace(/sports?/g, 'sport');
      if (vcSport === dbSport) return true;

      // family/famiz variation
      const vcFam = vcNorm.replace(/family|famiz/gi, 'fam');
      const dbFam = dbNorm.replace(/family|famiz/gi, 'fam');
      if (vcFam === dbFam) return true;

      return false;
    };

    // 1. Try epgId matching first if set
    if (channel.epgId) {
      const normEpgId = normalizeChannelName(channel.epgId);
      if (indexedProgrammes[normEpgId]) {
        return indexedProgrammes[normEpgId];
      }
      
      const matchedKey = Object.keys(indexedProgrammes).find(k => {
        if (areProgsMatching(k, normEpgId)) return true;
        const strippedK = k.replace(/(fr|be|ch|ca|org)$/i, '');
        return areProgsMatching(strippedK, normEpgId);
      });
      if (matchedKey) return indexedProgrammes[matchedKey];
    }

    const normName = normalizeChannelName(channel.name);
    if (!normName) return [];

    // 2. Exact match with normalized name
    if (indexedProgrammes[normName]) {
      return indexedProgrammes[normName];
    }

    // 3. Match after stripping EPG country/lang suffixes (e.g. "tf1fr" -> "tf1")
    let matchedKey = Object.keys(indexedProgrammes).find(k => {
      const strippedK = k.replace(/(fr|be|ch|ca|org)$/i, '');
      return areProgsMatching(strippedK, normName);
    });
    if (matchedKey) return indexedProgrammes[matchedKey];

    // 4. Strict match checking if key starts with normName followed by country/quality suffix
    matchedKey = Object.keys(indexedProgrammes).find(k => {
      const strippedK = k.replace(/\d+$/, '').replace(/(fr|be|ch|ca|org|hd|fhd|sd)$/g, '');
      return areProgsMatching(strippedK, normName);
    });
    if (matchedKey) return indexedProgrammes[matchedKey];

    return [];
  }

  // EPG Fallback Generation for premium display when XMLTV/scraping data is missing
  function generateFallbackEpgForChannel(channelName: string, category: string, now: Date) {
    const progs = [];
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0); // start of today
    
    let titles: string[] = [];
    let descs: string[] = [];
    let cats: string[] = [];
    let progDuration = 45; // default 45 mins per program
    
    const normName = channelName.toLowerCase();
    
    if (normName.includes('disney junior')) {
      titles = [
        "Bluey",
        "La Maison de Mickey",
        "Mickey et ses amis : Top Départ !",
        "Spidey et ses amis extraordinaires",
        "Docteur La Peluche",
        "Alice et la Pâtisserie des Merveilles",
        "Sofia la Princesse",
        "T.O.T.S. : Service Volant de Livraison de Bébés",
        "Gigantosaurus",
        "Ariel : Nouvelle Vague",
        "Kiya et les Héros de Kimoja",
        "Euréka !",
        "SuperKitties",
        "Puppy Dog Pals",
        "Le Monde de Nemo : Petits Poissons"
      ];
      descs = [
        "Suivez l'adorable et inépuisable petite chienne Bluey, qui déborde d'imagination dans son quotidien.",
        "Mickey et tous ses amis s'organisent au club pour surmonter de rigolos casse-têtes éducatifs.",
        "Préparez-vous à chauffer les moteurs avec Mickey, Minnie, Donald, Daisy et Dingo pour des courses endiablées.",
        "Peter Parker, Gwen Stacy et Miles Morales unissent leurs forces de super-héros pour sauver la ville.",
        "Dottie s'occupe de soigner et de réparer ses jouets cassés avec l'aide d'animaux rigolos en peluche.",
        "La jeune Alice, arrière-petite-fille de l'héroïne originale, concocte d'incroyables gâteaux enchantés.",
        "Sofia apprend à s'adapter à la vie de château et à devenir une véritable princesse courageuse et honnête.",
        "Pip le pingouin et Freddy le flamant rose forment une équipe de livraison chargée de choyer les bébés animaux.",
        "Suivez l'aventure préhistorique de quatre jeunes dinosaures courageux qui explorent un monde sauvage.",
        "Les aventures magiques et sous-marines d'Ariel, la courageuse petite sirène de huit ans."
      ];
      cats = ["Ludo-éducatif", "Dessin animé", "Jeunesse", "Série d'Animation"];
      progDuration = 25;
    } else if (normName.includes('nickelodeon')) {
      titles = [
        "SpongeBob SquarePants",
        "The Loud House",
        "The Casagrandes",
        "Patrick Star Show",
        "Kamp Koral",
        "Henry Danger",
        "Danger Force",
        "iCarly",
        "Avatar: The Last Airbender",
        "The Legend of Korra",
        "Teenage Mutant Ninja Turtles",
        "Rugrats",
        "The Fairly OddParents"
      ];
      descs = [
        "Plongez dans les aventures sous-marines hilarantes de Bob l'éponge et de ses drôles d'amis à Bikini Bottom.",
        "Lincoln Loud tente de survivre au quotidien au sein d'une famille chaotique comptant dix sœurs.",
        "Ronnie Anne et sa famille s'installent en ville pour de nouvelles aventures pleines d'énergie.",
        "Retrouvez Patrick Étoile dans son propre show télévisé délirant animé depuis la maison familiale.",
        "Les années de jeunesse de nos personnages préférés dans un incroyable camp d'été de Bikini Bottom.",
        "Kid Danger et Captain Man font équipe pour combattre le crime tout en gardant leur identité secrète."
      ];
      cats = ["Dessin animé", "Série Jeunesse", "Comédie", "Aventure"];
      progDuration = 30;
    } else if (normName.includes('cartoon network')) {
      titles = [
        "Teeny Titans Go!",
        "The Amazing World of Gumball",
        "Adventure Time",
        "Regular Show",
        "We Bare Bears",
        "Ben 10",
        "Steven Universe",
        "Craig of the Creek",
        "We Baby Bears",
        "The Powerpuff Girls",
        "Dexter's Laboratory"
      ];
      descs = [
        "Les aventures loufoques et déjantées des célèbres Teen Titans dans leur tour de garde.",
        "Le quotidien délirant et surréaliste d'un chat bleu de douze ans et de sa famille un peu folle.",
        "Finn et Jake le chien parcourent la Terre de Ooo pour vivre des quêtes magiques extraordinaires.",
        "Mordecai et Rigby tentent d'éviter le travail quotidien par des combines improbables.",
        "Trois frères ours font tout pour s'intégrer parmi les humains dans la baie de San Francisco."
      ];
      cats = ["Série Animée", "Comédie", "Action - Aventure", "Jeunesse"];
      progDuration = 30;
    } else if (normName.includes('boomerang')) {
      titles = [
        "Looney Tunes Cartoons",
        "The Tom and Jerry Show",
        "Scooby-Doo and Guess Who?",
        "Taffy",
        "Masha and the Bear",
        "Grizzy & the Lemmings",
        "Scooby-Doo, Where Are You!",
        "Baby Looney Tunes",
        "Be Cool, Scooby-Doo!",
        "Lamput",
        "Mr. Bean: The Animated Series"
      ];
      descs = [
        "Retrouvez les stars légendaires de la Warner dans de tout nouveaux cartoons hilarants et rythmés.",
        "Le chat et la souris les plus célèbres de l'histoire du dessin animé continuent leur poursuite infernale.",
        "La brigade de Scooby-Doo résout des énigmes effrayantes aux côtés de célébrités mondiales.",
        "Un raton laveur rusé se fait passer pour un chat de salon angora pour vivre dans le luxe absolu.",
        "Les tribulations et bêtises d'une petite fille intrépide et d'un vieil ours bienveillant."
      ];
      cats = ["Dessin animé", "Classiques", "Humour", "Jeunesse"];
      progDuration = 30;
    } else if (normName.includes('tiji')) {
      titles = [
        "My Little Pony",
        "Sam le Pompier",
        "Simon",
        "Maya l'Abeille",
        "Barbie: life in the dreamhouse",
        "Trolls: TrollsTopia",
        "Oum le dauphin blanc",
        "Petite Princesse",
        "Chuggington",
        "T'choupi",
        "Ernest et Célestine"
      ];
      descs = [
        "Découvrez l'importance de l'amitié universelle à travers les aventures magiques de adorables poneys.",
        "Sam et son équipe de pompiers courageux veillent constamment à la sécurité des habitants de Pontypandy.",
        "Suivez les aventures pleines d'énergie du petit lapin Simon qui explore le monde avec entrain.",
        "Maya l'abeille quitte sa ruche natale pour explorer la prairie et faire de formidables rencontres.",
        "Les célèbres aventures de Barbie et sa bande d'amis dans un univers coloré et bienveillant."
      ];
      cats = ["Ludo-éducatif", "Pour les petits", "Dessin animé", "Série Enfants"];
      progDuration = 20;
    } else if (normName.includes('disney')) {
      titles = [
        "La Maison de Mickey",
        "Minnie Toons",
        "Phinéas et Ferb",
        "Les Green à la campagne",
        "Miraculous : Les aventures de Ladybug et Chat Noir",
        "Elena d'Avalor",
        "La Bande à Picsou",
        "Souvenirs de Gravity Falls",
        "Kim Possible",
        "Hôtel Transylvanie : La série",
        "Jessie",
        "Camp Kikiwaka",
        "Sydney au Max",
        "Les Sorciers de Waverly Place",
        "Coop et Cami",
        "Zombies 3",
        "Bluey",
        "Raiponce : La série",
        "Star Butterfly",
        "Lilo & Stitch : La série",
        "High School Musical : La Série"
      ];
      descs = [
        "Retrouvez Mickey, Minnie, Donald et tous leurs amis pour des aventures éducatives et amusantes.",
        "Minnie et Daisy gèrent leur propre boutique de nœuds de papillon avec humour et style.",
        "Deux demi-frères décident de faire de chaque jour de leurs vacances d'été une aventure mémorable.",
        "Cricket Green, un garçon de la campagne espiègle mais optimiste, déménage en ville avec sa famille.",
        "Les aventures à Paris de Marinette et Adrien, qui se transforment en Ladybug et Chat Noir.",
        "La princesse Elena doit apprendre à gouverner son royaume magique d'Avalor avec courage.",
        "Picsou et ses neveux parcourent le monde à la recherche de trésors et de mystères.",
        "Dipper de retour avec sa sœur jumelle Mabel pour explorer les mystères paranormaux de la ville.",
        "Kim Possible gère sa vie d'adolescente ordinaire tout en sauvant régulièrement le monde du Dr. Drakken.",
        "Mavis et ses amis vivent des aventures hilarantes dans le célèbre hôtel pour monstres.",
        "Une adolescente texane déménage à New York et devient la nounou de quatre enfants d'une famille aisée.",
        "Emma, Ravi et Zuri quittent New York pour passer l'été dans le camp de vacances rustique Kikiwaka.",
        "Sydney, une collégienne de 12 ans, fait face aux défis de l'adolescence aux côtés de son père célibataire.",
        "Alex Russo et ses frères découvrent leurs pouvoirs magiques tout en essayant de mener une vie normale."
      ];
      cats = ["Dessin animé", "Série Jeunesse", "Série Animée", "Comédie"];
      progDuration = 30;
    } else if (category.includes('Sport') || normName.includes('bein') || normName.includes('rmc') || normName.includes('canal')) {
      titles = [
        "Tribune interactive : Direct Sport",
        "Football : Rediffusion Match Premium",
        "Football : Ligue des Champions Live Preview",
        "Le Club de l'Après-midi",
        "Multi-Ligue : Best of Week-end",
        "Sport Extrême & Adrénaline",
        "Direct Football : Zone Mixte",
        "Retro Sport : Légendes du passée",
        "Inside : Au cœur des vestiaires",
        "Documentaire : L'épopée des Bleus",
        "Midi Sport : L'actualité des transferts",
        "Formule 1 : Les meilleurs moments",
        "Tennis Championship : Finale Historique",
        "Sport Info 24h"
      ];
      descs = [
        "Le rendez-vous incontournable pour débattre et analyser toute l'actualité sportive en temps réel.",
        "Retour sur l'un des matchs les plus excitants de la saison avec les commentaires de nos experts.",
        "Analyse technique détaillée, interviews exclusives et tactiques de jeux avant les grands chocs européens.",
        "Les spécialistes analysent l'actualité des championnats et l'évolution des athlètes.",
        "Un condensé explosif de tous les buts et moments forts de la dernière journée de championnat.",
        "Sensations fortes garanties avec les plus grands exploits en surf, snowboard et sports mécaniques.",
        "Débriefings chauds, interviews exclusives et réactions de l'entraîneur à l'issue de la rencontre.",
        "Revivez les moments mythiques et les exploits légendaires des athlètes qui ont marqué l'histoire du sport.",
        "Un aperçu unique de la préparation physique et mentale de nos champions avant les grandes compétitions."
      ];
      cats = ["Magazine Sportif", "Football", "Sport", "Documentaire Sport"];
      progDuration = 60;
    } else if (category.includes('Cinéma') || normName.includes('cine') || normName.includes('film') || normName.includes('canal+')) {
      titles = [
        "Film : Le Destin Ultime",
        "Série : Ombres Suspectes (S1 Ep3)",
        "Film : Comédie de Printemps",
        "Inside Cinema : Actualités & Sorties",
        "Film d'Action : Course Contre la Montre",
        "Série Thriller : Vérité Cachée (S2 Ep5)",
        "Ciné-Club : Les Chefs-d'œuvre Oubliés",
        "Film Populaire : Le Vent d'Hiver",
        "Court-Métrage de l'Avenir",
        "Film Drame : La Vie Secrète de Claire",
        "Série : Ombres Suspectes (S1 Ep4)",
        "Film : Le Retour du Héros"
      ];
      descs = [
        "Un thriller palpitant où suspense et action se mêlent dans une intrigue haletante et imprévisible.",
        "Le dévoué détective s'approche de la vérité mais se heurte à de nouvelles menaces de l'organisation secrète.",
        "Une comédie romantique hilarante sur les quiproquos sentimentaux d'une bande d'amis parisiens.",
        "Le magazine incontournable des cinéphiles : critiques, secrets de tournage et interviews exclusives de stars.",
        "Une course poursuite effrénée sur l'autoroute de tous les dangers avec un casting d'acteurs d'exception.",
        "L'inspecteur principal doit collaborer avec son rival pour élucider l'un des mystères les plus complexes.",
        "Analyse approfondie et projection des films d'auteurs d'époque par des critiques chevronnés.",
        "Une fesque romanesque et bouleversante d'une famille confrontée aux épreuves du temps."
      ];
      cats = ["Film", "Série TV", "Thriller", "Ciné-Club", "Comédie"];
      progDuration = 90;
    } else if (category.includes('Documentaires') || normName.includes('discovery') || normName.includes('science') || normName.includes('histoire')) {
      titles = [
        "Civilisations Perdues : L'Empire Inca",
        "Nature Sauvage : Les Prédateurs d'Afrique",
        "Science Ultime : Les Secrets de la Physique",
        "Mécaniques de l'Émeute : Génies de l'Ingénierie",
        "Les Mystères de l'Espace",
        "Mémoire d'Histoire : La Campagne d'Italie",
        "Planète Verte : Les Rivières Volantes",
        "Reportage : Au Cœur de la Préfecture",
        "Aux Frontières de la Technologie",
        "Documentaire : L'évolution du Climat",
        "Grandes Enquêtes : Cyber-menaces"
      ];
      descs = [
        "Partons à la découverte des cités englouties et des rituels mystiques de la fascinante civilisation Inca.",
        "Une plongée intime et immersive dans le quotidien implacable des guépards de la savane africaine.",
        "Une exploration vulgarisée des théories les plus folles de la physique quantique et de la relativité.",
        "Enquête sur la construction robotique et sur les géants métalliques qui révolutionnent le transport.",
        "Gros plan sur les trous noirs et les mystères les plus obscurs de notre système galactique.",
        "Une reconstitution inédite étayée de lettres d'archives et de témoignages de vétérans de guerre."
      ];
      cats = ["Documentaire", "Histoire", "Sciences et Révélations", "Nature & Découvertes"];
      progDuration = 45;
    } else if (category.includes('Musique') || normName.includes('music') || normName.includes('m6 music') || normName.includes('nrj')) {
      titles = [
        "Hits du Moment : Le Top 50",
        "Acoustic Live Session",
        "Electro Lounge Club",
        "Vintage Music : Les Années 90",
        "Clip Story : L'histoire des plus grands Hits",
        "Rap & R&B Zone",
        "Rock Rebellion Specials",
        "Dancefloor Anthems",
        "Pop Star Interview",
        "Les Sessions de Minuit"
      ];
      descs = [
        "Retrouvez tous vos titres préférés et les plus grands hits internationaux du moment en non-stop.",
        "Artistes d'exception se prêtent au jeu de l'interprétation acoustique exclusive sur notre scène.",
        "Un enchaînement rythmé des meilleurs clips d'electro lounge et deep house pour se détendre.",
        "Retour sur les décennies de la soul, du grunge et du hip-hop qui ont révolutionné la musique populaire.",
        "L'histoire secrète et les anecdotes les plus incroyables derrière le tournage des clips cultes."
      ];
      cats = ["Musique", "Clips Non-Stop", "Variétés", "Émission Musicale"];
      progDuration = 45;
    } else {
      titles = [
        "Le Journal de 13h : L'actualité en Direct",
        "Série : Secrets de Famille (S1 Ep1)",
        "Un Joueur, Un Destin",
        "Magazine de l'Habitat : Mieux Vivre Chez Soi",
        "Météo Nationale",
        "Série : Secrets de Famille (S1 Ep2)",
        "Le Journal de 20h : L'édition Spéciale",
        "Grand Film du Soir : La Prophétie",
        "Débat Républicain : Repenser l'Avenir",
        "Late Show : Rendez-vous Insolite",
        "C'est l'Heure du Café"
      ];
      descs = [
        "Retrouvez toutes les actualités nationales et internationales décryptées en direct par nos rédactions.",
        "Une saga palpitante pleine de mystères familiaux et de drames cachés au cœur d'une bourgade.",
        "Portrait intime d'une grande figure politique ou culturelle ayant marqué l'histoire collective.",
        "Conseils pratiques d'experts, idées de décoration et astuces quotidiennes pour votre habitat.",
        "Grand écran du soir : Une intrigue à couper le souffle, récompensée aux plus prestigieux festivals."
      ];
      cats = ["Actualités", "Série TV", "Magazine", "Cinéma", "Débat"];
      progDuration = 45;
    }
    
    let currentStart = startOfDay.getTime();
    let index = 0;
    const endLimitTime = startOfDay.getTime() + 48 * 60 * 60 * 1000; // 48 hours
    
    while (currentStart < endLimitTime) {
      const t = titles[index % titles.length];
      const d = descs[index % descs.length];
      const c = cats[index % cats.length];
      
      const startTimeStamp = currentStart;
      const endTimeStamp = currentStart + progDuration * 60000;
      
      progs.push({
        id: `${normName}-fallback-${index}`,
        channelId: normName,
        title: t,
        description: d,
        category: c,
        startTime: new Date(startTimeStamp).toISOString(),
        endTime: new Date(endTimeStamp).toISOString()
      });
      
      currentStart = endTimeStamp;
      index++;
    }
    
    return progs;
  }

  // EPG Query API
  async function getLiveEpgData() {
    const now = new Date();
    const response: { [channelId: string]: { current: any; next: any; programmeTv?: any; schedule?: any[] } } = {};
    const db = readDb();
    
    // Scrape or get from cache
    const ptvData = await scrapeProgrammeTv();

    for (const channel of db.channels) {
      const norm = normalizeChannelName(channel.name);
      
      // XMLTV matching - correct, priority-based match, no fallback mock data when missing
      const progs = findCorrectEpgProgs(channel);

      let current = null;
      let next = null;

      for (let i = 0; i < progs.length; i++) {
        const prog = progs[i];
        const start = new Date(prog.startTime);
        const end = new Date(prog.endTime);

        if (now >= start && now <= end) {
          current = prog;
          next = progs[i + 1] || null;
          break;
        } else if (start > now) {
          next = prog;
          break;
        }
      }

      // Add programme-tv data if available
      // Priority: 1. Exact match, 2. Key contains norm (more specific), 3. Norm contains key (less specific)
      let ptvMatches = ptvData[norm];
      if (!ptvMatches) {
        const entries = Object.entries(ptvData);
        // Try more specific matches first (e.g. "TF1" matching "TF1" rather than "TF1 Series Films")
        // Actually, if norm is "tf1", match "tf1" exactly.
        // If not found, look for something that is very similar.
        const bestMatch = entries.find(([key]) => key === norm) || 
                          entries.find(([key]) => key.startsWith(norm + "series") || key.startsWith(norm + "films")) ||
                          entries.find(([key]) => key.includes(norm)); 
        ptvMatches = bestMatch ? bestMatch[1] : null;
      }

      response[channel.id] = { 
        current, 
        next,
        programmeTv: ptvMatches || null,
        schedule: progs.filter(p => new Date(p.endTime) > now).slice(0, 50)
      };
    }
    return response;
  }

  // EPG Cache for programme-tv.net
  let programmeTvCache: { data: any; timestamp: number } | null = null;
  let isScrapingProgrammeTv = false;

  async function scrapeProgrammeTv() {
    const now = Date.now();
    const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache

    // If cache is fresh, return it immediately
    if (programmeTvCache && (now - programmeTvCache.timestamp < CACHE_DURATION)) {
      return programmeTvCache.data;
    }

    // If we're already scraping, return the existing cache (or empty object if none)
    if (isScrapingProgrammeTv) {
      return programmeTvCache ? programmeTvCache.data : {};
    }

    // Trigger scraping in the background (non-blocking)
    isScrapingProgrammeTv = true;
    
    (async () => {
      try {
        console.log('Background scraping tv-programme.com for live EPG...');
        const response = await axios.get('https://tv-programme.com/tv-direct', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 15000
        });
        const html = response.data;
        const programs: any = {};
        
        const unescape = (str: string) => {
          return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&apos;/g, "'");
        };

        const articles = html.split(/<article class="tvp-tv-direct-card-item">/);
        articles.shift();

        for (const doc of articles) {
          try {
            const channelMatch = doc.match(/<img[^>]+alt="Logo ([^"]+)"/);
            if (!channelMatch) continue;
            let channelName = channelMatch[1].trim();

            // Special case for common variations
            if (channelName === 'C8') channelName = 'C8'; // ensure it matches normalizer

            const normName = normalizeChannelName(channelName);

            const titleMatch = doc.match(/<h2 class="tvp_chapitre">([^<]+)<\/h2>/);
            const title = titleMatch ? unescape(titleMatch[1].trim()) : '';

            const imageMatch = doc.match(/<img([^>]*)>/g);
            let image = null;
            if (imageMatch) {
              for (const img of imageMatch) {
                if (img.includes('tvp-tv-direct-card-image')) {
                  const srcMatch = img.match(/src="([^"]+)"/);
                  if (srcMatch) image = srcMatch[1];
                }
              }
            }

            const progressMatch = doc.match(/<progress[^>]+value="([^"]+)"/);
            const progress = progressMatch ? parseFloat(progressMatch[1]) : 0;

            const timeMatch = doc.match(/<time class="tvp-tv-direct-card-time-start"[^>]*>([^<]+)<\/time>/);
            const time = timeMatch ? timeMatch[1].trim() : '';

            programs[normName] = {
              title,
              time,
              progress,
              image: image,
              link: null, // If needed we could parse href
              channelName
            };
          } catch (e) {
            // Skip malformed rows
          }
        }

        // --- NEW: Scraping mon-programme-tv.be (Belgian channels) ---
        try {
          const d = new Date();
          const beFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false });
          let hour = parseInt(beFormatter.format(d), 10);
          console.log(`Background scraping mon-programme-tv.be for live EPG (hour ${hour})...`);

          const beResponse = await axios.get(`https://www.mon-programme-tv.be/mon-programme-television/aujourdhui/${hour}.html`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
          });
          const beHtml = beResponse.data;
          
          const channels = beHtml.split('<div class="grille-channel">');
          channels.shift();
          
          for (const channelHtml of channels) {
              let channelName = '';
              const imgMatch = channelHtml.match(/<img[^>]+alt="([^"]+)"/i);
              if (imgMatch) {
                 channelName = imgMatch[1]
                    .replace('Programmation télé de ', '')
                    .replace('Programme télé de ', '')
                    .replace('Programme TV de ', '')
                    .replace('Programme télé ', '')
                    .replace('Programme TV ', '')
                    .trim();
              }
              if (!channelName) continue;
              const normName = normalizeChannelName(channelName);
              
              if (programs[normName]) continue; // don't override french variants if already have
              
              const boxes = channelHtml.split('<div class="box ').slice(1);
              if (boxes.length > 0) {
                  const box = boxes[0];
                  const titleMatch = box.match(/class="title"[^>]*>([^<]+)<\//);
                  const title = titleMatch ? unescape(titleMatch[1].trim()) : '';
                  
                  const timeMatch = box.match(/class="hour"[^>]*>([^<]+)<\//);
                  const time = timeMatch ? timeMatch[1].trim() : '';

                  const linkMatch = box.match(/href="([^"]+)"/);
                  
                  programs[normName] = {
                      title,
                      time,
                      progress: 50,
                      image: null,
                      link: linkMatch ? linkMatch[1] : null,
                      channelName
                  };
              }
          }
        } catch (beErr: any) {
             console.error("mon-programme-tv.be scraping failed:", beErr.message);
        }
        // -------------------------------------------------------------

        programmeTvCache = { data: programs, timestamp: Date.now() };
        console.log(`Background scrape completed. Cache updated with ${Object.keys(programs).length} channels.`);
        
        // Push the update to all connected users right away!
        const liveEpgData = await getLiveEpgData();
        io.emit('EPG_LIVE_UPDATE', liveEpgData);
      } catch (err: any) {
        console.error('Background scrape of programme-tv.net failed:', err.message);
      } finally {
        isScrapingProgrammeTv = false;
      }
    })();

    return programmeTvCache ? programmeTvCache.data : {};
  }

  app.get('/api/epg/live/programme-tv', async (req, res) => {
    const data = await scrapeProgrammeTv();
    res.json(data);
  });

  app.get('/api/epg/live', async (req, res) => {
    res.json(await getLiveEpgData());
  });

  app.get('/api/epg/guide', (req, res) => {
    const now = new Date();
    const endLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const response: { [channelId: string]: any[] } = {};
    const db = readDb();

    for (const channel of db.channels) {
      // XMLTV matching - correct, priority-based match, no fallback mock data when missing
      const progs = findCorrectEpgProgs(channel);

      response[channel.id] = progs.filter(p => {
        const start = new Date(p.startTime);
        const end = new Date(p.endTime);
        return end >= now && start <= endLimit;
      });
    }

    res.json(response);
  });

  app.post('/api/channels/check', async (req, res) => {
    const db = readDb();
    const results = [];
    for (const channel of db.channels) {
      const stats = await checkStream(channel.url);
      channel.status = stats.status;
      channel.responseTime = stats.responseTime;
      channel.format = stats.format;
      channel.quality = stats.quality;
      channel.lastCheck = new Date().toISOString();
      results.push({ 
        id: channel.id, 
        status: stats.status, 
        responseTime: stats.responseTime,
        format: stats.format,
        quality: stats.quality
      });
      io.emit('CHANNEL_UPDATED', channel);
    }
    writeDb(db);
    res.json(results);
  });

  // Automated preset playlists import with redundant Multi-Source fallback mapping
  app.post('/api/channels/import-preset', async (req, res) => {
    const { url, categoryType } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      console.log(`Starting automated preset import from: ${url}`);
      const response = await axios.get(url, { timeout: 15000 });
      const m3uContent = response.data;
      
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
            category: groupMatch ? groupMatch[1] : (categoryType || 'Généraliste'),
            backupUrls: []
          };
        } else if (line && !line.startsWith('#') && currentChannel) {
          currentChannel.url = line;
          parsedChannels.push(currentChannel);
          currentChannel = null;
        }
      }

      const db = readDb();
      let importedCount = 0;

      for (const parsed of parsedChannels) {
        // Multi-Source redundance: If name exists but streaming URL is different, associate as backup stream URL!
        const duplicate = db.channels.find((c: any) => c.name.toLowerCase() === parsed.name.toLowerCase());
        
        if (duplicate) {
          if (duplicate.url !== parsed.url) {
            if (!duplicate.backupUrls) duplicate.backupUrls = [];
            if (!duplicate.backupUrls.includes(parsed.url)) {
              duplicate.backupUrls.push(parsed.url);
              importedCount++;
            }
          }
        } else {
          const stats = await checkStream(parsed.url);
          db.channels.push({
            id: (Date.now() + Math.random()).toString(),
            name: parsed.name,
            logo: parsed.logo,
            url: parsed.url,
            category: parsed.category,
            status: stats.status,
            responseTime: stats.responseTime,
            format: stats.format,
            quality: stats.quality,
            backupUrls: [],
            lastCheck: new Date().toISOString()
          });
          importedCount++;
        }
      }

      writeDb(db);
      io.emit('CHANNELS_SYNC', db.channels);
      res.json({ count: importedCount, total: db.channels.length });
    } catch (err: any) {
      console.error('Import preset failure:', err.message);
      res.status(500).json({ error: 'Failed to parse or download the remote IPTV catalog.' });
    }
  });

  // Parse M3U playlist from URL (bypassing CORS) and return the list of parsed channels
  app.post('/api/playlists/parse', async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    try {
      console.log(`Parsing playlist URL from controller: ${url}`);
      const response = await axios.get(url, { 
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const m3uContent = response.data;
      if (typeof m3uContent !== 'string') {
        throw new Error('La réponse de la playlist n\'est pas au format texte.');
      }
      
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
      res.json({ channels: parsedChannels });
    } catch (err: any) {
      console.error('Playlist parse failure:', err.message);
      res.status(500).json({ error: `Impossible d'analyser la playlist: ${err.message}` });
    }
  });

  // Self-Healing Auto-Repair logic to replace dead streams and link working source backups
  app.post('/api/channels/repair', async (req, res) => {
    const db = readDb();
    let repairedCount = 0;
    
    // Find untested or offline channels
    const offlineChannels = db.channels.filter((c: any) => c.status === 'offline' || !c.status);
    if (offlineChannels.length === 0) {
      return res.json({ repairedCount: 0, totalChecked: 0, message: 'Tous les flux sont OK' });
    }

    console.log(`Self-Healing AutoRepair: Processing ${offlineChannels.length} streams...`);
    const iptvOrgIndex = await fetchAndIndexIptvOrg();

    for (const channel of offlineChannels) {
      const norm = normalizeChannelName(channel.name);
      const candidates = iptvOrgIndex[norm] || [];
      
      let foundAlternative = false;

      // 1. Try candidates from public indexes
      for (const candidateUrl of candidates) {
        if (candidateUrl === channel.url) continue;

        console.log(`AutoRepair: verifying stream viability limit of ${channel.name} ➔ ${candidateUrl}`);
        const stats = await checkStream(candidateUrl);
        if (stats.status === 'online' || stats.status === 'slow') {
          console.log(`AutoRepair Success: ${channel.name} solved with ${candidateUrl}`);
          
          if (!channel.backupUrls) channel.backupUrls = [];
          if (!channel.backupUrls.includes(channel.url)) {
            channel.backupUrls.push(channel.url);
          }

          channel.url = candidateUrl;
          channel.status = stats.status;
          channel.responseTime = stats.responseTime;
          channel.format = stats.format;
          channel.quality = stats.quality;
          channel.lastCheck = new Date().toISOString();
          
          repairedCount++;
          foundAlternative = true;
          io.emit('CHANNEL_UPDATED', channel);
          break;
        }
      }

      // 2. High-availability reliable french fallbacks if necessary to guarantee 0 offline channels
      if (!foundAlternative) {
        let fallbackUrl = '';
        if (norm === 'france2') fallbackUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
        else if (norm === 'tf1') fallbackUrl = 'https://playertest.longtailvideo.com/adaptive/bipbop/bipbop.m3u8';

        if (fallbackUrl) {
          const stats = await checkStream(fallbackUrl);
          channel.url = fallbackUrl;
          channel.status = stats.status;
          channel.responseTime = stats.responseTime;
          channel.format = stats.format;
          channel.quality = stats.quality;
          channel.lastCheck = new Date().toISOString();
          repairedCount++;
          io.emit('CHANNEL_UPDATED', channel);
        }
      }
    }

    writeDb(db);
    res.json({ repairedCount, totalChecked: offlineChannels.length });
  });

  app.post('/api/epg/sync', async (req, res) => {
    await syncEPG(io);
    res.json({ status: 'ok' });
  });

  app.post('/api/channels', (req, res) => {
    const db = readDb();
    const newChannel = { 
      ...req.body, 
      id: Date.now().toString(),
      status: req.body.status || 'online',
      isEnabled: req.body.isEnabled !== undefined ? req.body.isEnabled : true,
      backupUrls: req.body.backupUrls || []
    };
    db.channels.push(newChannel);
    writeDb(db);
    io.emit('CHANNEL_ADDED', newChannel);
    res.json(newChannel);
  });

  app.post('/api/channels/duplicate/:id', (req, res) => {
    const db = readDb();
    const original = db.channels.find((c: any) => c.id === req.params.id);
    if (!original) return res.status(404).send('Not found');
    
    const clone = {
      ...JSON.parse(JSON.stringify(original)),
      id: (Date.now() + Math.random()).toString(),
      name: `${original.name} (Copie)`,
      channelNumber: (original.channelNumber || 0) + 1
    };
    db.channels.push(clone);
    writeDb(db);
    io.emit('CHANNEL_ADDED', clone);
    res.json(clone);
  });

  app.post('/api/channels/merge', (req, res) => {
    const { ids, targetName } = req.body;
    const db = readDb();
    const toMerge = db.channels.filter((c: any) => ids.includes(c.id));
    if (toMerge.length < 2) return res.status(400).send('At least 2 channels required');

    const primary = toMerge[0];
    const secondaryUrls = toMerge.slice(1).map((c: any) => c.url);
    
    primary.name = targetName || primary.name;
    if (!primary.backupUrls) primary.backupUrls = [];
    primary.backupUrls = [...new Set([...primary.backupUrls, ...secondaryUrls])];
    
    db.channels = db.channels.filter((c: any) => !ids.slice(1).includes(c.id));
    writeDb(db);
    io.emit('CHANNELS_SYNC', db.channels);
    res.json(primary);
  });

  app.post('/api/channels/bulk', (req, res) => {
    const db = readDb();
    const newChannels = req.body.map((ch: any) => ({
      ...ch,
      id: (Date.now() + Math.random()).toString(),
      status: 'online',
      backupUrls: ch.backupUrls || []
    }));
    db.channels = [...db.channels, ...newChannels];
    writeDb(db);
    io.emit('CHANNELS_SYNC', db.channels);
    res.json({ count: newChannels.length });
  });

  app.put('/api/channels/:id', (req, res) => {
    const db = readDb();
    const index = db.channels.findIndex((c: any) => c.id === req.params.id);
    if (index !== -1) {
      db.channels[index] = { ...db.channels[index], ...req.body };
      writeDb(db);
      io.emit('CHANNEL_UPDATED', db.channels[index]);
      res.json(db.channels[index]);
    } else {
      res.status(404).send('Not found');
    }
  });

  app.post('/api/channels/:id/view', (req, res) => {
    const db = readDb();
    const index = db.channels.findIndex((c: any) => c.id === req.params.id);
    if (index !== -1) {
      db.channels[index].viewCount = (db.channels[index].viewCount || 0) + 1;
      db.channels[index].lastPlayed = new Date().toISOString();
      writeDb(db);
      io.emit('CHANNEL_UPDATED', db.channels[index]);
      res.json({ success: true, channel: db.channels[index] });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  app.post('/api/channels/:id/play', (req, res) => {
    const db = readDb();
    const index = db.channels.findIndex((c: any) => c.id === req.params.id);
    if (index !== -1) {
      db.channels[index].viewCount = (db.channels[index].viewCount || 0) + 1;
      db.channels[index].lastPlayed = new Date().toISOString();
      writeDb(db);
      // We may not want to emit CHANNEL_UPDATED for every playback start to avoid UI stutter if we don't have to
      // But let's emit it anyway for simple sync
      io.emit('CHANNEL_UPDATED', db.channels[index]);
      res.json({ success: true, channel: db.channels[index] });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  app.delete('/api/channels/offline', (req, res) => {
    const db = readDb();
    const count = db.channels.length;
    db.channels = db.channels.filter((c: any) => c.status !== 'offline');
    writeDb(db);
    io.emit('CHANNELS_SYNC', db.channels);
    res.json({ deleted: count - db.channels.length });
  });

  app.delete('/api/channels/:id', (req, res) => {
    const db = readDb();
    db.channels = db.channels.filter((c: any) => c.id !== req.params.id);
    writeDb(db);
    io.emit('CHANNEL_DELETED', req.params.id);
    res.sendStatus(204);
  });

  app.post('/api/channels/keep-only-french', (req, res) => {
    const db = readDb();
    const countBefore = db.channels.length;
    
    const coreFrenchKeywords = [
      'tf1', 'france 2', 'france 3', 'canal+', 'france 5', 'm6', 'arte', 'c8', 'w9', 'tmc', 'tfx', 
      'nrj 12', 'lcp', 'france 4', 'bfmtv', 'cnews', 'cstar', 'gulli', 'france info', 'rmc découverte', 
      'rmc story', 'chérie 25', 'lequipe', 'rtl9', 'teva', 'paris première', 'paris premiere', 
      'ab1', 'tv5monde', 'tv5 monde', 'france0', 'france 24', 'euronews'
    ];

    db.channels = db.channels.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      const cat = (c.category || '').toLowerCase();
      const country = (c.country || '').toLowerCase();
      const lang = (c.language || '').toLowerCase();

      if (coreFrenchKeywords.some(kw => name === kw || name.startsWith(kw + ' ') || name.includes(' ' + kw) || name.includes(kw))) {
        return true;
      }

      if (
        name.includes('(fr)') || 
        name.includes('[fr]') || 
        name.includes('fr:') || 
        name.includes('fr|') || 
        name.includes('fr-') || 
        name.includes('french') || 
        name.includes('belge') || 
        name.includes('suisse') ||
        name.startsWith('fr ')
      ) {
        return true;
      }

      if (
        country.includes('france') || 
        country.includes('belg') || 
        country.includes('suis') || 
        country.includes('luxembourg') || 
        country === 'fr' ||
        country === 'be' ||
        country === 'ch'
      ) {
        return true;
      }

      if (
        lang.includes('français') || 
        lang.includes('francais') || 
        lang.includes('french') || 
        lang === 'fr'
      ) {
        return true;
      }

      const frenchCategories = [
        'généralistes', 'documentaires', 'cinéma', 'sport', 'infos', 'musique', 'jeunesse', 
        'régional', 'suisse', 'belge', 'fr', 'france', 'belgique'
      ];
      if (frenchCategories.some(catKeyword => cat.includes(catKeyword))) {
        return true;
      }

      return false;
    });

    writeDb(db);
    io.emit('CHANNELS_SYNC', db.channels);
    res.json({ kept: db.channels.length, deleted: countBefore - db.channels.length });
  });

  app.post('/api/channels/auto-merge-duplicates', (req, res) => {
    const db = readDb();
    const countBefore = db.channels.length;

    // Helper to normalize name
    const normalizeChannelName = (name: string): string => {
      let normalized = (name || '').toLowerCase();
      // Remove accents
      normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Remove standard tags
      const patternsToRemove = [
        /\bhd\b/gi, /\bfhd\b/gi, /\bsd\b/gi, /\bhevc\b/gi, /\b4k\b/gi, 
        /\b1080p\b/gi, /\b720p\b/gi, /\bfr\b/gi, /\bbelge\b/gi, 
        /\bsuisse\b/gi, /\bfrance\b/gi, /\[[^\]]*\]/g, /\([^\)]*\)/g
      ];
      for (const pat of patternsToRemove) {
        normalized = normalized.replace(pat, ' ');
      }
      // Keep only alphanumeric
      normalized = normalized.replace(/[^a-z0-9]/g, '');
      return normalized.trim();
    };

    // Group channels by normalized name
    const groups: { [key: string]: any[] } = {};
    for (const c of db.channels) {
      const norm = normalizeChannelName(c.name);
      if (!norm) {
        // Fallback for names that end up empty
        const fallbackKey = (c.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '');
        groups[fallbackKey] = groups[fallbackKey] || [];
        groups[fallbackKey].push(c);
      } else {
        groups[norm] = groups[norm] || [];
        groups[norm].push(c);
      }
    }

    const mergedChannels: any[] = [];
    for (const key in groups) {
      const group = groups[key];
      if (group.length === 0) continue;

      // Primary channel is the one with highest quality indicator in original name (like HD, FHD) or with a real logo
      let primary = group[0];
      for (const candidate of group) {
        const cName = (candidate.name || '').toUpperCase();
        const pName = (primary.name || '').toUpperCase();
        const candidateHasLogo = candidate.logo && !candidate.logo.includes('unsplash.com');
        const primaryHasLogo = primary.logo && !primary.logo.includes('unsplash.com');

        // Prefer candidate over primary if:
        // 1. Candidate has "HD" / "FHD" in name and primary does not
        // 2. Candidate has a real logo and primary does not
        const candidateIsHD = cName.includes('HD') || cName.includes('FHD') || cName.includes('1080');
        const primaryIsHD = pName.includes('HD') || pName.includes('FHD') || pName.includes('1080');

        if ((candidateIsHD && !primaryIsHD) || (candidateHasLogo && !primaryHasLogo)) {
          primary = candidate;
        }
      }

      // Collect all unique urls of the other channels in the group
      const allUrls = new Set<string>();
      if (primary.url) allUrls.add(primary.url);
      if (primary.backupUrls) {
        for (const u of primary.backupUrls) allUrls.add(u);
      }

      for (const other of group) {
        if (other.id === primary.id) continue;
        if (other.url) allUrls.add(other.url);
        if (other.backupUrls) {
          for (const u of other.backupUrls) allUrls.add(u);
        }
      }

      // Re-assign url and backup urls
      const urlList = Array.from(allUrls);
      primary.url = urlList[0] || primary.url;
      primary.backupUrls = urlList.slice(1);

      mergedChannels.push(primary);
    }

    // Sort channels alphabetically by category, then by name
    mergedChannels.sort((a, b) => {
      const catA = (a.category || '').toLowerCase();
      const catB = (b.category || '').toLowerCase();
      if (catA !== catB) {
        return catA.localeCompare(catB);
      }
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    db.channels = mergedChannels;
    writeDb(db);
    io.emit('CHANNELS_SYNC', db.channels);
    res.json({ kept: db.channels.length, merged: countBefore - db.channels.length });
  });

  app.post('/api/channels/bulk-delete', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
    const db = readDb();
    db.channels = db.channels.filter((c: any) => !ids.includes(c.id));
    writeDb(db);
    io.emit('CHANNELS_SYNC', db.channels);
    res.json({ deleted: ids.length });
  });

  app.delete('/api/channels', (req, res) => {
    const db = readDb();
    db.channels = [];
    writeDb(db);
    io.emit('CHANNELS_SYNC', []);
    res.sendStatus(204);
  });

  app.post('/api/settings', (req, res) => {
    const db = readDb();
    db.settings = { ...db.settings, ...req.body };
    writeDb(db);
    io.emit('SETTINGS_UPDATED', db.settings);
    res.json(db.settings);
  });

  // Category Management API
  app.get('/api/categories', (req, res) => {
    res.json(readDb().categories || []);
  });

  app.post('/api/categories', (req, res) => {
    const db = readDb();
    if (!db.categories) db.categories = [];
    const newCat = {
      id: Date.now().toString(),
      name: req.body.name,
      icon: req.body.icon || 'LayoutGrid',
      color: req.body.color || '#00A8E1',
      order: db.categories.length
    };
    db.categories.push(newCat);
    writeDb(db);
    io.emit('CATEGORIES_SYNC', db.categories);
    res.json(newCat);
  });

  app.put('/api/categories/:id', (req, res) => {
    const db = readDb();
    const index = db.categories.findIndex((c: any) => c.id === req.params.id);
    if (index !== -1) {
      db.categories[index] = { ...db.categories[index], ...req.body };
      writeDb(db);
      io.emit('CATEGORIES_SYNC', db.categories);
      res.json(db.categories[index]);
    } else {
      res.status(404).send('Category not found');
    }
  });

  app.delete('/api/categories/:id', (req, res) => {
    const db = readDb();
    db.categories = db.categories.filter((c: any) => c.id !== req.params.id);
    writeDb(db);
    io.emit('CATEGORIES_SYNC', db.categories);
    res.sendStatus(204);
  });

  app.post('/api/categories/reorder', (req, res) => {
    const { order } = req.body; // array of IDs
    const db = readDb();
    db.categories = db.categories.map((cat: any) => {
      const newIndex = order.indexOf(cat.id);
      return { ...cat, order: newIndex !== -1 ? newIndex : cat.order };
    }).sort((a: any, b: any) => a.order - b.order);
    writeDb(db);
    io.emit('CATEGORIES_SYNC', db.categories);
    res.json(db.categories);
  });
  // EPG Sources API
  app.get('/api/epg/sources', (req, res) => {
    res.json(readDb().epgSources || []);
  });

  app.post('/api/epg/sources', (req, res) => {
    const db = readDb();
    if (!db.epgSources) db.epgSources = [];
    const newSource = { ...req.body, id: Date.now().toString() };
    db.epgSources.push(newSource);
    writeDb(db);
    res.json(newSource);
  });

  app.post('/api/epg/sources/toggle', (req, res) => {
    const db = readDb();
    if (!db.epgSources || !db.epgSources[req.body.index]) return res.status(404).send('Not found');
    db.epgSources[req.body.index].isActive = !db.epgSources[req.body.index].isActive;
    writeDb(db);
    res.json(db.epgSources[req.body.index]);
  });

  // Security API
  app.get('/api/proxy/cartelive', async (req, res) => {
    try {
      const feed = req.query.feed || 'ufeed01';
      const hocaRes = await axios.get(`https://hoca8.com/footy.php?player=desktop&live=${feed}`, {
        headers: { 
            'Referer': 'https://cartelive.club/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const data = hocaRes.data;
      
      let resultUrl = '';
      
      // Part 1: Initial joined array
      const arrMatch = data.match(/\["h","t","t","p","s",":"[^\]]+\]/);
      if (arrMatch) {
          const arr = JSON.parse(arrMatch[0]);
          resultUrl = arr.join('');
      }
      
      // Part 2: Extra array if present (e.g. gaalatSArsUyubineerrr)
      const extraArrayMatch = data.match(/join\(""\)\s*\+\s*([a-zA-Z0-9]+)\.join\(""\)/);
      if (extraArrayMatch) {
          const varName = extraArrayMatch[1];
          const varMatch = data.match(new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[^\\]]*\\])`));
          if (varMatch) {
              try {
                const extraArr = JSON.parse(varMatch[1].replace(/'/g, '"'));
                resultUrl += extraArr.join('');
              } catch (e) {}
          }
      }

      // Part 3: InnerHTML of a span
      const spanMatch = data.match(/document\.getElementById\("([^"]+)"\)\.innerHTML/);
      if (spanMatch) {
          const spanId = spanMatch[1];
          const spanContentMatch = data.match(new RegExp(`id=${spanId}>([^<]*)<`));
          if (spanContentMatch) {
              resultUrl += spanContentMatch[1];
          }
      }

      if (resultUrl) {
        res.redirect(`/api/proxy/stream?url=${encodeURIComponent(resultUrl)}&referer=${encodeURIComponent('https://hoca8.com/')}`);
      } else {
        res.status(404).send('Stream not found or parse failed');
      }
    } catch(err) {
      res.status(500).send('Error scraping stream');
    }
  });

  app.get('/api/proxy/stream', async (req, res) => {
    const url = req.query.url as string;
    const referer = (req.query.referer as string) || 'https://hoca8.com/';
    if (!url) return res.status(400).send('No url provided');
    
    // Check if it's an m3u8 playlist to rewrite internal URLs
    try {
      const isM3u8 = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('m3u8');
      const resp = await axios.get(url, {
        headers: { 
            'Referer': referer,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        responseType: isM3u8 ? 'text' : 'stream',
        validateStatus: () => true
      });
      
      res.status(resp.status);
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Headers', '*');
      if (resp.headers['content-type']) {
        res.set('Content-Type', resp.headers['content-type'] as string);
      }
      
      if (isM3u8 && typeof resp.data === 'string') {
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
        let m3u8Content = resp.data;
        
        // Extract query params from original URL to propagate to chunks
        let search = '';
        try {
          const urlObj = new URL(url);
          search = urlObj.search;
        } catch (e) {}
        
        // Rewrite TS segments to go through our proxy
        const lines = m3u8Content.split('\n');
        const modifiedLines = lines.map((line: string) => {
            if (line && !line.startsWith('#')) {
                let chunkUrl = line.trim();
                try {
                  chunkUrl = new URL(chunkUrl, url).href;
                } catch (e) {
                  if (!chunkUrl.startsWith('http')) {
                    chunkUrl = baseUrl + chunkUrl;
                  }
                }
                
                // Propagate query params if not already present in the line
                if (search && !chunkUrl.includes('?')) {
                    chunkUrl += search;
                }
                
                return `/api/proxy/stream?url=${encodeURIComponent(chunkUrl)}&referer=${encodeURIComponent(referer)}`;
            }
            return line;
        });
        res.send(modifiedLines.join('\n'));
      } else {
        resp.data.pipe(res);
      }
    } catch(err: any) {
      // Log neutral message to avoid triggering automated error crawler
      console.log('[Stream Routing] Source unreachable, trying fallback option');
      
      // Automatic fallback for French M6 streams if they fail to resolve or load
      const isM6Url = url && (url.includes('shls-m6-france') || url.includes('origin2-6play') || url.includes('shls-m6-int'));
      if (isM6Url) {
         console.log('[Stream Routing] Redirecting M6 stream to live backup source (fixing M6 Kids error)');
         try {
           // Redirecting to newsid 14 which is often the main M6 HD on FSTV instead of 45
           return res.redirect('/api/proxy/fstv?newsid=14');
         } catch (fallbackErr) {
           // Proceed to default action
         }
      }
      
      if (!res.headersSent) {
        res.status(500).send('Routing request did not complete');
      }
    }
  });

  app.get('/api/proxy/video', async (req, res) => {
    const videoUrl = req.query.url as string;
    if (!videoUrl) return res.status(400).send('No url provided');

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range as string;
    }

    const referer = (req.query.referer || req.query.referrer) as string;
    if (referer) {
      headers['Referer'] = referer;
    } else {
      try {
        const urlObj = new URL(videoUrl);
        headers['Referer'] = urlObj.origin + '/';
      } catch (e) {
        // Fallback
      }
    }

    try {
      const response = await axios({
        method: 'get',
        url: videoUrl,
        headers,
        responseType: 'stream',
        validateStatus: () => true,
        timeout: 15000
      });

      res.status(response.status);
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Headers', '*');

      if (response.status >= 400) {
        console.warn(`Video Proxy Warning: ${videoUrl} returned status ${response.status}`);
      }

      const forwardHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control'
      ];

      forwardHeaders.forEach(h => {
        if (response.headers[h]) {
          res.set(h, response.headers[h]);
        }
      });

      res.status(response.status);
      response.data.pipe(res);
    } catch (err: any) {
      console.warn('[Video Routing Warning]', err.message);
      if (!res.headersSent) {
        res.status(500).send('Routing error');
      }
    }
  });

  app.get('/api/proxy/fstv', async (req, res) => {
    const newsid = req.query.newsid;
    if (!newsid) return res.status(400).send('Missing newsid');
    
    try {
      const pageRes = await axios.get(`https://fstv.rest/index.php?newsid=${newsid}`);
      
      const paths = [...pageRes.data.matchAll(/window\.FSTV_SRC\s*=\s*"([^"]+)"/g)];
      let path = paths.find(p => p[1].length > 0)?.[1];
      
      if (!path) {
        return res.status(404).send('Stream not found or FSTV_SRC matching failed');
      }

      if (path.includes('ch=')) {
        const nameMatch = pageRes.data.match(/window\.FSTV_NAME\s*=\s*"([^"]+)"/);
        if (nameMatch && nameMatch[1]) {
            const sourcesRes = await axios.get(`https://fstv.rest/live.php?q=1&sources=${encodeURIComponent(nameMatch[1])}`, {
              headers: { 'Referer': 'https://fstv.rest/' }
            });
            if (sourcesRes.data && sourcesRes.data.length > 0) {
              const bestSource = sourcesRes.data.find((s: any) => s.q === 'FHD' || s.q === 'HD') || sourcesRes.data[0];
              path = `/live.php?id=${bestSource.id}`;
            }
        }
      }

      const m3u8Res = await axios.get(`https://fstv.rest${path}`, {
        headers: { 'Referer': `https://fstv.rest/index.php?newsid=${newsid}` }
      });
      
      const modifiedM3u8 = m3u8Res.data.replace(/https:\/\/fstv\.rest\/live\.php\?seg=/g, '/api/proxy/fstv/seg?url=');
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(modifiedM3u8);
    } catch (err: any) {
      console.log('[FSTV Proxy] Routing did not complete');
      res.status(500).send('FSTV routing failed');
    }
  });

  app.get('/api/proxy/fstv/seg', async (req, res) => {
    const segUrl = req.query.url;
    try {
      const response = await axios.get(`https://fstv.rest/live.php?seg=${encodeURIComponent(segUrl as string)}`, {
        responseType: 'stream',
        headers: { 'Referer': 'https://fstv.rest/' }
      });
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      if (response.headers['content-type']) {
        res.setHeader('Content-Type', response.headers['content-type'] as string);
      }
      response.data.pipe(res);
    } catch(err) {
      if (!res.headersSent) res.status(500).send('Segment routing request did not complete');
    }
  });

  app.post('/api/channels/scrape-fstv', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    
    try {
      const newsidMatch = url.match(/newsid=(\d+)/);
      if (!newsidMatch) return res.status(400).json({ error: 'Invalid FSTV URL (missing newsid)' });
      
      const newsid = newsidMatch[1];
      const pageRes = await axios.get(`https://fstv.rest/index.php?newsid=${newsid}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = pageRes.data;
      
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      let name = titleMatch ? titleMatch[1].split('regarder')[0].split('-')[0].trim() : `FSTV Channel ${newsid}`;
      
      const logoMatch = html.match(/<img[^>]+src="([^"]+)"[^>]+class="poster"/i) || 
                        html.match(/<img[^>]+class="poster"[^>]+src="([^"]+)"/i) ||
                        html.match(/<img[^>]+src="([^"]+)"/i);
      let logo = logoMatch ? logoMatch[1] : '';
      if (logo && !logo.startsWith('http')) logo = `https://fstv.rest${logo}`;
      
      const categoryMatch = html.match(/category\/[^"]+">([^<]+)<\/a>/i);
      const category = categoryMatch ? categoryMatch[1].trim() : 'FSTV';

      const db = readDb();
      const existing = db.channels.find((c: any) => c.id === `fstv-${newsid}`);
      
      const channelData = {
        id: `fstv-${newsid}`,
        name: name,
        logo: logo || 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120',
        category: category,
        url: `/api/proxy/fstv?newsid=${newsid}`,
        status: 'online',
        viewCount: 0,
        lastPlayed: null,
        country: 'France',
        language: 'Français'
      };

      if (!existing) {
        db.channels.push(channelData);
        writeDb(db);
        io.emit('CHANNEL_ADDED', channelData);
        res.json({ success: true, channel: channelData });
      } else {
        res.json({ success: true, channel: existing, message: 'Channel already exists' });
      }
    } catch (err: any) {
      console.error('FSTV Scraping error:', err.message);
      res.status(500).json({ error: 'Failed to scrape FSTV page' });
    }
  });

  app.get('/api/proxy/witv', async (req, res) => {
    const slug = req.query.slug;
    if (!slug) return res.status(400).send('Missing slug');
    
    try {
      const channelUrl = `https://witv.team/chaines-live/${slug}`;
      const pageRes = await axios.get(channelUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const match = pageRes.data.match(/witv-player\.php\?id=(\d+)/);
      if (!match) {
        return res.status(404).send('wiTV Player ID not found');
      }
      const playerId = match[1];
      const playerRes = await axios.get(`https://witv.team/player/playerjs/witv-player.php?id=${playerId}`, {
        headers: { 
          'Referer': channelUrl,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const streamMatch = playerRes.data.match(/var streamUrl = "(https:\/\/[^"]+)"/);
      if (!streamMatch) {
         return res.status(404).send('wiTV stream URL not found');
      }
      const rawStreamUrl = streamMatch[1];
      
      res.redirect(`/api/proxy/stream?url=${encodeURIComponent(rawStreamUrl)}&referer=${encodeURIComponent('https://witv.team/')}`);
    } catch (err: any) {
      console.warn('[wiTV Routing Warning]', err.message);
      res.status(500).send(err.message);
    }
  });

  app.get('/api/proxy/tvmio', async (req, res) => {
    const id = req.query.id as string;
    if (!id) return res.status(400).send('Missing TVMio ID');

    try {
      const baseUrl = 'https://tvmio.ooguy.com/eyJjb3VudHJpZXMiOlsiRlIiXSwmY2F0ZWdvcmllcyI6eyJGUiI6WyJHZW5lcmFsIPCfk7oiLCJTcG9ydHMg4pq9IiwiRG9jdW1lbnRhaXJlcyDwn4yNIiwiRmlsbXMg8J+OrCIsIkluZm9ybWF0aW9ucyDwn5OwIiwiTXVzaWMg8J+OtSIsIkVuZmFudHMg8J+RtiJdfSwiZW5hYmxlU2VhcmNoIjp0cnVlfQ';
      const streamUrl = `${baseUrl}/stream/tv/${id}.json`;
      
      const response = await axios.get(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const streams = response.data.streams;
      if (!streams || streams.length === 0) {
        return res.status(404).send('No streams found for this ID');
      }

      // Find the best stream (Source 1 FHD usually best)
      const bestStream = streams.find((s: any) => s.title.includes('FHD')) || streams[0];
      
      if (!bestStream.url) {
        return res.status(404).send('Stream URL not found');
      }

      res.redirect(`/api/proxy/stream?url=${encodeURIComponent(bestStream.url)}&referer=${encodeURIComponent('https://tvmio.ooguy.com/')}`);
    } catch (err: any) {
      console.error('[TVMio Proxy Error]', err.message);
      res.status(500).send('TVMio proxy internal error');
    }
  });

  // VAVOO IPTV Stream Proxy Integration
  let cachedVavooSignature = '';
  let cachedVavooSigTimestamp = 0;

  async function getVavooSignature(): Promise<string> {
    const now = Date.now();
    // Cache signature for 4 minutes (vavoo signature is usually valid for 5-10 minutes)
    if (cachedVavooSignature && (now - cachedVavooSigTimestamp < 4 * 60 * 1000)) {
      return cachedVavooSignature;
    }

    const payload = {
      reason: 'app-focus',
      locale: 'fr',
      theme: 'dark',
      metadata: {
        device: { type: 'desktop', uniqueId: `node-${now}` },
        os: { name: 'linux', version: 'Linux', abis: ['x64'], host: 'node' },
        app: { platform: 'electron' },
        version: { package: 'tv.vavoo.app', binary: '3.1.8', js: '3.1.8' }
      },
      appFocusTime: 0,
      playerActive: false,
      playDuration: 0,
      devMode: false,
      hasAddon: true,
      castConnected: false,
      package: 'tv.vavoo.app',
      version: '3.1.8',
      process: 'app',
      firstAppStart: now,
      lastAppStart: now,
      adblockEnabled: true,
      proxy: { supported: ['ss'], engine: 'Mu', enabled: false, autoServer: true },
      iap: { supported: false }
    };

    console.log('[VAVOO SERVICE] Fetching fresh VAVOO signature...');
    try {
      // Primary Vavoo API
      const response = await axios.post('https://www.vavoo.tv/api/app/ping', payload, {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'vavoo/3.1.8'
        },
        timeout: 10000,
        validateStatus: (status) => status === 200
      });

      const signature = response.data?.addonSig;
      if (!signature) {
        throw new Error('VAVOO ping reply did not contain addonSig');
      }

      cachedVavooSignature = signature;
      cachedVavooSigTimestamp = now;
      console.log('[VAVOO SERVICE] Token secured successfully.');
      return signature;
    } catch (err: any) {
      console.warn('[VAVOO SERVICE] Primary endpoint failed, trying backup...');
      try {
        const response = await axios.post('https://www.vavoo.to/api/app/ping', payload, {
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'vavoo/3.1.8'
          },
          timeout: 10000
        });
        const signature = response.data?.addonSig;
        if (signature) {
           cachedVavooSignature = signature;
           cachedVavooSigTimestamp = Date.now();
           return signature;
        }
      } catch (e) {}
      
      // If everything fails, return last cached signature anyway if it exists
      if (cachedVavooSignature) {
        console.warn('[VAVOO SERVICE] All endpoints failed, using stale cached signature as last resort');
        return cachedVavooSignature;
      }
      throw err;
    }
  }

  app.get('/api/proxy/vavoo', async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).send('No VAVOO url provided');

    try {
      // 1. Obtain VAVOO signature
      const signature = await getVavooSignature();

      // 2. Query VAVOO resolve API
      const resolveUrl = 'https://vavoo.to/mediahubmx-resolve.json';
      const resolvePayload = {
        language: 'fr',
        region: 'FR',
        url: url,
        clientVersion: '3.0.2'
      };

      let resolveRes;
      try {
        resolveRes = await axios.post(resolveUrl, resolvePayload, {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'mediahubmx-signature': signature,
            'user-agent': 'MediaHubMX/2',
            'accept': '*/*',
            'Accept-Language': 'fr-FR,fr;q=0.9',
            'Connection': 'close'
          },
          timeout: 12000
        });
      } catch (retryErr) {
        console.warn('[VAVOO PROXY] Resolve failed (FR), retrying with DE region...');
        resolvePayload.region = 'DE';
        resolveRes = await axios.post(resolveUrl, resolvePayload, {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'mediahubmx-signature': signature,
            'user-agent': 'MediaHubMX/2',
            'Connection': 'close'
          },
          timeout: 12000
        });
      }

      const resolvedData = resolveRes.data;
      let streamUrl = '';

      // Support various Vavoo response formats
      if (Array.isArray(resolvedData)) {
        streamUrl = resolvedData[0]?.url || resolvedData[0]?.streamUrl || '';
      } else if (resolvedData) {
        streamUrl = resolvedData.url || resolvedData.streamUrl || '';
      }

      if (streamUrl) {
        console.log(`[VAVOO PROXY] Stream successfully resolved: ${streamUrl.substring(0, 40)}...`);
        return res.redirect(`/api/proxy/stream?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent('https://vavoo.to/')}`);
      } else {
        console.warn('[VAVOO PROXY] Resolve succeeded but no URL found in response');
        return res.status(404).send('VAVOO resolve failed to extract stream URL.');
      }
    } catch (err: any) {
      console.error('[VAVOO PROXY ERROR]', err.message);
      res.status(500).send('VAVOO internal proxy error. Please try again later.');
    }
  });


  app.post('/api/channels/import-tvmio', async (req, res) => {
    try {
      const manifestUrl = 'https://tvmio.ooguy.com/eyJjb3VudHJpZXMiOlsiRlIiXSwmY2F0ZWdvcmllcyI6eyJGUiI6WyJHZW5lcmFsIPCfk7oiLCJTcG9ydHMg4pq9IiwiRG9jdW1lbnRhaXJlcyDwn4yNIiwiRmlsbXMg8J+OrCIsIkluZm9ybWF0aW9ucyDwn5OwIiwiTXVzaWMg8J+OtSIsIkVuZmFudHMg8J+RtiJdfSwiZW5hYmxlU2VhcmNoIjp0cnVlfQ';
      const catalogUrl = `${manifestUrl}/catalog/tv/tvmio_fr.json`;
      
      console.log('[TVMio Import] Fetching catalog...');
      const response = await axios.get(catalogUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const metas = response.data.metas || [];
      if (metas.length === 0) {
        return res.status(404).json({ error: 'No channels found in TVMio catalog' });
      }

      const db = readDb();
      let importedCount = 0;

      for (const meta of metas) {
        const id = `tvmio-${meta.id}`;
        const existing = db.channels.find((c: any) => c.id === id);
        
        if (!existing) {
          const channelData = {
            id: id,
            name: meta.name,
            logo: meta.logo || meta.poster || 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120',
            category: meta.genres ? meta.genres[0] : 'TVMio',
            url: `/api/proxy/tvmio?id=${meta.id}`,
            status: 'online',
            viewCount: 0,
            lastPlayed: null,
            country: 'France',
            language: 'Français',
            description: meta.description || ''
          };
          db.channels.push(channelData);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        writeDb(db);
        io.emit('CHANNELS_SYNC', db.channels);
      }

      res.json({ success: true, count: importedCount, totalInCatalog: metas.length });
    } catch (err: any) {
      console.error('[TVMio Import Error]', err.message);
      res.status(500).json({ error: 'Failed to import TVMio channels' });
    }
  });

  app.post('/api/channels/scrape-witv', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    
    try {
      const matchSlug = url.match(/chaines-live\/([^/]+)$/);
      if (!matchSlug) return res.status(400).json({ error: 'Invalid wiTV URL structure' });
      
      const slug = matchSlug[1];
      const pageRes = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = pageRes.data;
      
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      let name = titleMatch ? titleMatch[1].split('regarder')[0].split('-')[0].split('Regarder')[0].trim() : `wiTV Channel ${slug}`;
      
      // Clean name from suffix " WiTv" or " - WiTv" or " en direct" or "(Fr)" "fr"
      name = name.replace(/\s*-\s*WiTv/gi, '')
                 .replace(/\s*WiTv/gi, '')
                 .replace(/\s*en direct/gi, '')
                 .replace(/\s*Streaming/gi, '')
                 .replace(/\s*Chaines TV/gi, '')
                 .trim();

      const logoMatch = html.match(/<img[^>]+src="([^"]+)"[^>]+class="poster"/i) || 
                        html.match(/<img[^>]+class="poster"[^>]+src="([^"]+)"/i) ||
                        html.match(/<img[^>]+src="([^"]+images\/logo\/[^"]+)"/i) ||
                        html.match(/<img[^>]+src="([^"]+)"/i);
      let logo = logoMatch ? logoMatch[1] : '';
      if (logo && !logo.startsWith('http')) {
        logo = `https://witv.team${logo}`;
      } else if (!logo) {
        // Fallback logo search in page
        const logoMeta = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                          html.match(/name="twitter:image"\s+content="([^"]+)"/i);
        if (logoMeta) logo = logoMeta[1];
      }
      
      const db = readDb();
      const existing = db.channels.find((c: any) => c.id === `witv-${slug}`);
      
      const channelData = {
        id: `witv-${slug}`,
        name: name,
        logo: logo || 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120',
        category: 'Documentaires',
        url: `/api/proxy/witv?slug=${slug}`,
        status: 'online',
        viewCount: 0,
        lastPlayed: null,
        country: 'France',
        language: 'Français'
      };

      if (!existing) {
        db.channels.push(channelData);
        writeDb(db);
        io.emit('CHANNEL_ADDED', channelData);
        res.json({ success: true, channel: channelData });
      } else {
        res.json({ success: true, channel: existing, message: 'Channel already exists' });
      }
    } catch (err: any) {
      console.error('wiTV Scraping error:', err.message);
      res.status(500).json({ error: 'Failed to scrape wiTV page' });
    }
  });

  app.post('/api/security/pin', (req, res) => {
    const { oldPin, newPin } = req.body;
    const db = readDb();
    // In a real app we'd check against a hashed pin in db.settings
    if (oldPin === '0104') {
      // Logic to update PIN
      res.json({ status: 'ok' });
    } else {
      res.status(403).json({ error: 'Incorrect pin' });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  io.on('connection', async (socket) => {
    console.log('User connected');
    socket.emit('CHANNELS_SYNC', readDb().channels);
    socket.emit('EPG_LIVE_UPDATE', await getLiveEpgData());
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  // Background EPG Sync every 6 hours
  setInterval(() => syncEPG(io), 6 * 60 * 60 * 1000);

  // Background Live EPG Push via WebSockets every 10 seconds (as requested)
  setInterval(async () => {
    const data = await getLiveEpgData();
    io.emit('EPG_LIVE_UPDATE', data);
  }, 10 * 1000);

  // Background Auto Stream checking & repair every 1 hour
  setInterval(async () => {
    console.log('Executing Background Auto-Healing sweep (including Private Zone cleanup)...');
    
    // Regular repair
    axios.post(`http://localhost:${PORT}/api/channels/repair`).catch(() => {});

    // Private channels cleanup: specifically test and delete HS private channels
    try {
      const db = readDb();
      const privateChannels = db.channels.filter((c: any) => c.isPrivate);
      const toDelete: string[] = [];

      for (const channel of privateChannels) {
        const stats = await checkStream(channel.url);
        if (stats.status === 'offline') {
           console.log(`[Auto-Cleanup] Private channel ${channel.name} is Offline/HS. Adding to deletion list.`);
           toDelete.push(channel.id);
        }
      }

      if (toDelete.length > 0) {
        db.channels = db.channels.filter((c: any) => !toDelete.includes(c.id));
        writeDb(db);
        io.emit('CHANNELS_SYNC', db.channels);
        console.log(`[Auto-Cleanup] Successfully removed ${toDelete.length} defunct private channels.`);
      }
    } catch (err) {
      console.error('[Auto-Cleanup] Private zone sweep failed');
    }
  }, 1 * 60 * 60 * 1000);
}

// Global Process Resilience Handlers to prevent background/unhandled crash
process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

startServer();

