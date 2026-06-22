var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = require("http");
var import_socket = require("socket.io");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_axios = __toESM(require("axios"), 1);
var import_zlib = __toESM(require("zlib"), 1);
var import_xml2js = require("xml2js");
var PORT = 3e3;
var DB_PATH = import_path.default.join(process.cwd(), "db.json");
var EPG_CACHE_PATH = import_path.default.join(process.cwd(), "epg_cache.json");
var INITIAL_DATA = {
  channels: [],
  categories: [
    { id: "1", name: "G\xE9n\xE9ralistes", icon: "LayoutGrid", color: "#00A8E1", order: 0 },
    { id: "2", name: "Cin\xE9ma & S\xE9ries", icon: "Film", color: "#8b5cf6", order: 1 },
    { id: "4", name: "Information", icon: "Globe", color: "#0ea5e9", order: 2 },
    { id: "5", name: "Documentaires", icon: "BookOpen", color: "#6366f1", order: 3 },
    { id: "6", name: "Jeunesse", icon: "Baby", color: "#f59e0b", order: 4 },
    { id: "7", name: "Loisirs & D\xE9couverte", icon: "Compass", color: "#10b981", order: 5 },
    { id: "8", name: "Musique", icon: "Music", color: "#ec4899", order: 6 },
    { id: "9", name: "International & Local", icon: "MapPin", color: "#6b7280", order: 7 }
  ],
  movies: [],
  settings: {
    language: "fr",
    videoQuality: "auto",
    parentalLock: false,
    pin: "0104",
    theme: "dark"
  },
  epgCache: {}
};
function readDb() {
  try {
    let data;
    if (!import_fs.default.existsSync(DB_PATH)) {
      import_fs.default.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2));
      data = INITIAL_DATA;
    } else {
      data = JSON.parse(import_fs.default.readFileSync(DB_PATH, "utf-8"));
    }
    if (data && data.channels) {
      const originalCount = data.channels.length;
      let channels = data.channels.filter((c) => {
        if (!c) return false;
        const urlStr = c.url || "";
        const nameStr = c.name || "";
        return !urlStr.includes("test-streams.mux.dev") || nameStr.toLowerCase().includes("france 2");
      });
      const uniqueChannels = [];
      const idSet = /* @__PURE__ */ new Set();
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
      data.channels = uniqueChannels;
      if (data.channels.length !== originalCount) {
        import_fs.default.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
      }
    }
    return data;
  } catch (err) {
    console.error("Error reading DB:", err);
    return INITIAL_DATA;
  }
}
function writeDb(data) {
  try {
    import_fs.default.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing DB:", err);
  }
}
async function checkStream(url) {
  const start = Date.now();
  let format = "Inconnu";
  if (url.includes(".m3u8")) format = "HLS (.m3u8)";
  else if (url.includes(".ts")) format = "MPEG-TS (.ts)";
  else if (url.includes(".mp4")) format = "MPEG-4 (.mp4)";
  const fullUrl = url.startsWith("/") ? `http://localhost:3000${url}` : url;
  try {
    const response = await import_axios.default.get(fullUrl, {
      timeout: 5e3,
      headers: { "Range": "bytes=0-1024", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      validateStatus: (status2) => status2 < 400 || status2 === 416
    });
    const responsetime = Date.now() - start;
    const status = responsetime > 2500 ? "slow" : "online";
    const quality = responsetime < 1200 ? "HD" : "SD";
    return {
      status,
      responseTime: responsetime,
      format,
      quality
    };
  } catch (err) {
    return {
      status: "offline",
      responseTime: 0,
      format,
      quality: "Hors Service"
    };
  }
}
function normalizeChannelName(name) {
  if (!name || typeof name !== "string") return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(fhd|hd|sd|4k|hevc|vip|backup|ts|usa|es|direct)\b/g, "").replace(/\b(fr|be|ch)(:|\s*$)/g, "").replace(/[^a-z0-9]/g, "").trim();
}
function parseXMLTVDate(dateStr) {
  if (!dateStr) return /* @__PURE__ */ new Date();
  try {
    const cleanStr = dateStr.replace(/\s+/g, "");
    const year = parseInt(cleanStr.substring(0, 4));
    const month = parseInt(cleanStr.substring(4, 6)) - 1;
    const day = parseInt(cleanStr.substring(6, 8));
    const hour = parseInt(cleanStr.substring(8, 10));
    const minute = parseInt(cleanStr.substring(10, 12));
    const second = parseInt(cleanStr.substring(12, 14)) || 0;
    let offsetMinutes = 0;
    const plusIdx = dateStr.indexOf("+");
    const minusIdx = dateStr.indexOf("-");
    const offsetIndex = plusIdx !== -1 ? plusIdx : minusIdx;
    if (offsetIndex !== -1) {
      const sign = dateStr.charAt(offsetIndex) === "+" ? 1 : -1;
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
    console.error("Failed to parse XMLTV date:", dateStr, err);
    return /* @__PURE__ */ new Date();
  }
}
function getXMLTVText(el) {
  if (!el) return "";
  if (Array.isArray(el)) {
    if (el.length === 0) return "";
    return getXMLTVText(el[0]);
  }
  if (typeof el === "object") {
    return el._ || el.value || "";
  }
  return String(el);
}
var cachedProgrammes = [];
var indexedProgrammes = {};
function loadEpgCache() {
  try {
    if (import_fs.default.existsSync(EPG_CACHE_PATH)) {
      cachedProgrammes = JSON.parse(import_fs.default.readFileSync(EPG_CACHE_PATH, "utf-8"));
      console.log(`Loaded ${cachedProgrammes.length} programs from local EPG cache.`);
      reindexProgrammes();
    }
  } catch (err) {
    console.error("Error loading EPG cache from disk:", err);
  }
}
function saveEpgCache() {
  try {
    import_fs.default.writeFileSync(EPG_CACHE_PATH, JSON.stringify(cachedProgrammes, null, 2));
    console.log(`Saved ${cachedProgrammes.length} programs to local EPG cache.`);
  } catch (err) {
    console.error("Error saving EPG cache to disk:", err);
  }
}
function reindexProgrammes() {
  const index = {};
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
  for (const norm in index) {
    index[norm].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }
  indexedProgrammes = index;
  console.log(`Re-indexed EPG database: mapped ${Object.keys(indexedProgrammes).length} channels.`);
}
async function syncEPG(io) {
  const db = readDb();
  console.log("Initiating EPG synchronization sync...");
  let newProgrammes = [];
  for (const source of db.epgSources) {
    if (!source.isActive) continue;
    try {
      console.log(`Fetching EPG source: ${source.name} (${source.url})`);
      const response = await import_axios.default.get(source.url, { responseType: "arraybuffer", timeout: 25e3 });
      let xml;
      if (source.url.endsWith(".gz")) {
        xml = import_zlib.default.gunzipSync(response.data).toString();
      } else {
        xml = response.data.toString();
      }
      console.log(`Parsing XML elements for ${source.name}...`);
      const result = await (0, import_xml2js.parseStringPromise)(xml);
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
          let icon = "";
          if (prog.icon && Array.isArray(prog.icon) && prog.icon[0] && prog.icon[0].$) {
            icon = prog.icon[0].$.src || "";
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
        source.lastSync = (/* @__PURE__ */ new Date()).toISOString();
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
  io.emit("EPG_SYNCED", { lastSync: (/* @__PURE__ */ new Date()).toISOString() });
}
async function fetchAndIndexIptvOrg() {
  const index = {};
  const urls = [
    "https://iptv-org.github.io/iptv/countries/fr.m3u",
    "https://iptv-org.github.io/iptv/categories/sports.m3u",
    "https://iptv-org.github.io/iptv/categories/news.m3u"
  ];
  for (const url of urls) {
    try {
      console.log(`IPTV AutoRepair: indexing from playlist ${url}`);
      const res = await import_axios.default.get(url, { timeout: 15e3 });
      const content = res.data;
      const lines = content.split("\n");
      let currentName = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#EXTINF:")) {
          const commaIndex = trimmed.lastIndexOf(",");
          currentName = commaIndex !== -1 ? trimmed.substring(commaIndex + 1).trim() : "";
        } else if (trimmed && !trimmed.startsWith("#") && currentName) {
          const streamUrl = trimmed;
          const norm = normalizeChannelName(currentName);
          if (norm && streamUrl) {
            if (!index[norm]) index[norm] = [];
            if (!index[norm].includes(streamUrl)) {
              index[norm].push(streamUrl);
            }
          }
          currentName = "";
        }
      }
    } catch (err) {
      console.error(`Failed to index iptv-org category list: ${url}`);
    }
  }
  return index;
}
async function startServer() {
  const app = (0, import_express.default)();
  const server = (0, import_http.createServer)(app);
  const io = new import_socket.Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.post("/api/log-error", (req, res) => {
    console.error("CLIENT ERROR LOGGED:", req.body);
    res.json({ ok: true });
  });
  loadEpgCache();
  setTimeout(async () => {
    const db = readDb();
    const hasSync = db.epgSources?.some((s) => s.lastSync);
    if (!hasSync || cachedProgrammes.length === 0) {
      console.log("No EPG sync found or cache empty, performing initial sync...");
      await syncEPG(io);
    }
  }, 5e3);
  readDb();
  app.get("/api/data", (req, res) => {
    res.json(readDb());
  });
  app.get("/api/movies", (req, res) => {
    const db = readDb();
    res.json(db.movies || []);
  });
  app.post("/api/movies", (req, res) => {
    const db = readDb();
    const movie = req.body;
    movie.id = Date.now().toString();
    if (!db.movies) db.movies = [];
    db.movies.push(movie);
    import_fs.default.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    io.emit("MOVIES_UPDATED", db.movies);
    res.json(movie);
  });
  app.put("/api/movies/:id", (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const updated = req.body;
    db.movies = (db.movies || []).map((m) => m.id === id ? { ...m, ...updated } : m);
    import_fs.default.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    io.emit("MOVIES_UPDATED", db.movies);
    res.json(updated);
  });
  app.delete("/api/movies/:id", (req, res) => {
    const db = readDb();
    const { id } = req.params;
    db.movies = (db.movies || []).filter((m) => m.id !== id);
    import_fs.default.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    io.emit("MOVIES_UPDATED", db.movies);
    res.json({ success: true });
  });
  app.get("/api/stats", (req, res) => {
    const db = readDb();
    const online = db.channels.filter((c) => c.status === "online").length;
    const slow = db.channels.filter((c) => c.status === "slow").length;
    const offline = db.channels.filter((c) => c.status === "offline").length;
    res.json({
      totalChannels: db.channels.length,
      activeChannels: online + slow,
      offlineChannels: offline,
      totalCategories: db.categories.length,
      lastEpgSync: db.epgSources.reduce((latest, s) => {
        if (!s.lastSync) return latest;
        if (!latest) return s.lastSync;
        return new Date(s.lastSync) > new Date(latest) ? s.lastSync : latest;
      }, null),
      healthScore: db.channels.length > 0 ? Math.round((online + slow * 0.5) / db.channels.length * 100) : 0
    });
  });
  function findCorrectEpgProgs(channel) {
    const areProgsMatching = (vcNorm, dbNorm) => {
      if (vcNorm === dbNorm) return true;
      const vcCherie = vcNorm.replace(/cherie?/g, "cheri");
      const dbCherie = dbNorm.replace(/cherie?/g, "cheri");
      if (vcCherie === dbCherie) return true;
      const vcSport = vcNorm.replace(/sports?/g, "sport");
      const dbSport = dbNorm.replace(/sports?/g, "sport");
      if (vcSport === dbSport) return true;
      const vcFam = vcNorm.replace(/family|famiz/gi, "fam");
      const dbFam = dbNorm.replace(/family|famiz/gi, "fam");
      if (vcFam === dbFam) return true;
      return false;
    };
    if (channel.epgId) {
      const normEpgId = normalizeChannelName(channel.epgId);
      if (indexedProgrammes[normEpgId]) {
        return indexedProgrammes[normEpgId];
      }
      const matchedKey2 = Object.keys(indexedProgrammes).find((k) => {
        if (areProgsMatching(k, normEpgId)) return true;
        const strippedK = k.replace(/(fr|be|ch|ca|org)$/i, "");
        return areProgsMatching(strippedK, normEpgId);
      });
      if (matchedKey2) return indexedProgrammes[matchedKey2];
    }
    const normName = normalizeChannelName(channel.name);
    if (!normName) return [];
    if (indexedProgrammes[normName]) {
      return indexedProgrammes[normName];
    }
    let matchedKey = Object.keys(indexedProgrammes).find((k) => {
      const strippedK = k.replace(/(fr|be|ch|ca|org)$/i, "");
      return areProgsMatching(strippedK, normName);
    });
    if (matchedKey) return indexedProgrammes[matchedKey];
    matchedKey = Object.keys(indexedProgrammes).find((k) => {
      const strippedK = k.replace(/\d+$/, "").replace(/(fr|be|ch|ca|org|hd|fhd|sd)$/g, "");
      return areProgsMatching(strippedK, normName);
    });
    if (matchedKey) return indexedProgrammes[matchedKey];
    return [];
  }
  function generateFallbackEpgForChannel(channelName, category, now) {
    const progs = [];
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    let titles = [];
    let descs = [];
    let cats = [];
    let progDuration = 45;
    const normName = channelName.toLowerCase();
    if (normName.includes("disney junior")) {
      titles = [
        "Bluey",
        "La Maison de Mickey",
        "Mickey et ses amis : Top D\xE9part !",
        "Spidey et ses amis extraordinaires",
        "Docteur La Peluche",
        "Alice et la P\xE2tisserie des Merveilles",
        "Sofia la Princesse",
        "T.O.T.S. : Service Volant de Livraison de B\xE9b\xE9s",
        "Gigantosaurus",
        "Ariel : Nouvelle Vague",
        "Kiya et les H\xE9ros de Kimoja",
        "Eur\xE9ka !",
        "SuperKitties",
        "Puppy Dog Pals",
        "Le Monde de Nemo : Petits Poissons"
      ];
      descs = [
        "Suivez l'adorable et in\xE9puisable petite chienne Bluey, qui d\xE9borde d'imagination dans son quotidien.",
        "Mickey et tous ses amis s'organisent au club pour surmonter de rigolos casse-t\xEAtes \xE9ducatifs.",
        "Pr\xE9parez-vous \xE0 chauffer les moteurs avec Mickey, Minnie, Donald, Daisy et Dingo pour des courses endiabl\xE9es.",
        "Peter Parker, Gwen Stacy et Miles Morales unissent leurs forces de super-h\xE9ros pour sauver la ville.",
        "Dottie s'occupe de soigner et de r\xE9parer ses jouets cass\xE9s avec l'aide d'animaux rigolos en peluche.",
        "La jeune Alice, arri\xE8re-petite-fille de l'h\xE9ro\xEFne originale, concocte d'incroyables g\xE2teaux enchant\xE9s.",
        "Sofia apprend \xE0 s'adapter \xE0 la vie de ch\xE2teau et \xE0 devenir une v\xE9ritable princesse courageuse et honn\xEAte.",
        "Pip le pingouin et Freddy le flamant rose forment une \xE9quipe de livraison charg\xE9e de choyer les b\xE9b\xE9s animaux.",
        "Suivez l'aventure pr\xE9historique de quatre jeunes dinosaures courageux qui explorent un monde sauvage.",
        "Les aventures magiques et sous-marines d'Ariel, la courageuse petite sir\xE8ne de huit ans."
      ];
      cats = ["Ludo-\xE9ducatif", "Dessin anim\xE9", "Jeunesse", "S\xE9rie d'Animation"];
      progDuration = 25;
    } else if (normName.includes("nickelodeon")) {
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
        "Plongez dans les aventures sous-marines hilarantes de Bob l'\xE9ponge et de ses dr\xF4les d'amis \xE0 Bikini Bottom.",
        "Lincoln Loud tente de survivre au quotidien au sein d'une famille chaotique comptant dix s\u0153urs.",
        "Ronnie Anne et sa famille s'installent en ville pour de nouvelles aventures pleines d'\xE9nergie.",
        "Retrouvez Patrick \xC9toile dans son propre show t\xE9l\xE9vis\xE9 d\xE9lirant anim\xE9 depuis la maison familiale.",
        "Les ann\xE9es de jeunesse de nos personnages pr\xE9f\xE9r\xE9s dans un incroyable camp d'\xE9t\xE9 de Bikini Bottom.",
        "Kid Danger et Captain Man font \xE9quipe pour combattre le crime tout en gardant leur identit\xE9 secr\xE8te."
      ];
      cats = ["Dessin anim\xE9", "S\xE9rie Jeunesse", "Com\xE9die", "Aventure"];
      progDuration = 30;
    } else if (normName.includes("cartoon network")) {
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
        "Les aventures loufoques et d\xE9jant\xE9es des c\xE9l\xE8bres Teen Titans dans leur tour de garde.",
        "Le quotidien d\xE9lirant et surr\xE9aliste d'un chat bleu de douze ans et de sa famille un peu folle.",
        "Finn et Jake le chien parcourent la Terre de Ooo pour vivre des qu\xEAtes magiques extraordinaires.",
        "Mordecai et Rigby tentent d'\xE9viter le travail quotidien par des combines improbables.",
        "Trois fr\xE8res ours font tout pour s'int\xE9grer parmi les humains dans la baie de San Francisco."
      ];
      cats = ["S\xE9rie Anim\xE9e", "Com\xE9die", "Action - Aventure", "Jeunesse"];
      progDuration = 30;
    } else if (normName.includes("boomerang")) {
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
        "Retrouvez les stars l\xE9gendaires de la Warner dans de tout nouveaux cartoons hilarants et rythm\xE9s.",
        "Le chat et la souris les plus c\xE9l\xE8bres de l'histoire du dessin anim\xE9 continuent leur poursuite infernale.",
        "La brigade de Scooby-Doo r\xE9sout des \xE9nigmes effrayantes aux c\xF4t\xE9s de c\xE9l\xE9brit\xE9s mondiales.",
        "Un raton laveur rus\xE9 se fait passer pour un chat de salon angora pour vivre dans le luxe absolu.",
        "Les tribulations et b\xEAtises d'une petite fille intr\xE9pide et d'un vieil ours bienveillant."
      ];
      cats = ["Dessin anim\xE9", "Classiques", "Humour", "Jeunesse"];
      progDuration = 30;
    } else if (normName.includes("tiji")) {
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
        "Ernest et C\xE9lestine"
      ];
      descs = [
        "D\xE9couvrez l'importance de l'amiti\xE9 universelle \xE0 travers les aventures magiques de adorables poneys.",
        "Sam et son \xE9quipe de pompiers courageux veillent constamment \xE0 la s\xE9curit\xE9 des habitants de Pontypandy.",
        "Suivez les aventures pleines d'\xE9nergie du petit lapin Simon qui explore le monde avec entrain.",
        "Maya l'abeille quitte sa ruche natale pour explorer la prairie et faire de formidables rencontres.",
        "Les c\xE9l\xE8bres aventures de Barbie et sa bande d'amis dans un univers color\xE9 et bienveillant."
      ];
      cats = ["Ludo-\xE9ducatif", "Pour les petits", "Dessin anim\xE9", "S\xE9rie Enfants"];
      progDuration = 20;
    } else if (normName.includes("disney")) {
      titles = [
        "La Maison de Mickey",
        "Minnie Toons",
        "Phin\xE9as et Ferb",
        "Les Green \xE0 la campagne",
        "Miraculous : Les aventures de Ladybug et Chat Noir",
        "Elena d'Avalor",
        "La Bande \xE0 Picsou",
        "Souvenirs de Gravity Falls",
        "Kim Possible",
        "H\xF4tel Transylvanie : La s\xE9rie",
        "Jessie",
        "Camp Kikiwaka",
        "Sydney au Max",
        "Les Sorciers de Waverly Place",
        "Coop et Cami",
        "Zombies 3",
        "Bluey",
        "Raiponce : La s\xE9rie",
        "Star Butterfly",
        "Lilo & Stitch : La s\xE9rie",
        "High School Musical : La S\xE9rie"
      ];
      descs = [
        "Retrouvez Mickey, Minnie, Donald et tous leurs amis pour des aventures \xE9ducatives et amusantes.",
        "Minnie et Daisy g\xE8rent leur propre boutique de n\u0153uds de papillon avec humour et style.",
        "Deux demi-fr\xE8res d\xE9cident de faire de chaque jour de leurs vacances d'\xE9t\xE9 une aventure m\xE9morable.",
        "Cricket Green, un gar\xE7on de la campagne espi\xE8gle mais optimiste, d\xE9m\xE9nage en ville avec sa famille.",
        "Les aventures \xE0 Paris de Marinette et Adrien, qui se transforment en Ladybug et Chat Noir.",
        "La princesse Elena doit apprendre \xE0 gouverner son royaume magique d'Avalor avec courage.",
        "Picsou et ses neveux parcourent le monde \xE0 la recherche de tr\xE9sors et de myst\xE8res.",
        "Dipper de retour avec sa s\u0153ur jumelle Mabel pour explorer les myst\xE8res paranormaux de la ville.",
        "Kim Possible g\xE8re sa vie d'adolescente ordinaire tout en sauvant r\xE9guli\xE8rement le monde du Dr. Drakken.",
        "Mavis et ses amis vivent des aventures hilarantes dans le c\xE9l\xE8bre h\xF4tel pour monstres.",
        "Une adolescente texane d\xE9m\xE9nage \xE0 New York et devient la nounou de quatre enfants d'une famille ais\xE9e.",
        "Emma, Ravi et Zuri quittent New York pour passer l'\xE9t\xE9 dans le camp de vacances rustique Kikiwaka.",
        "Sydney, une coll\xE9gienne de 12 ans, fait face aux d\xE9fis de l'adolescence aux c\xF4t\xE9s de son p\xE8re c\xE9libataire.",
        "Alex Russo et ses fr\xE8res d\xE9couvrent leurs pouvoirs magiques tout en essayant de mener une vie normale."
      ];
      cats = ["Dessin anim\xE9", "S\xE9rie Jeunesse", "S\xE9rie Anim\xE9e", "Com\xE9die"];
      progDuration = 30;
    } else if (category.includes("Sport") || normName.includes("bein") || normName.includes("rmc") || normName.includes("canal")) {
      titles = [
        "Tribune interactive : Direct Sport",
        "Football : Rediffusion Match Premium",
        "Football : Ligue des Champions Live Preview",
        "Le Club de l'Apr\xE8s-midi",
        "Multi-Ligue : Best of Week-end",
        "Sport Extr\xEAme & Adr\xE9naline",
        "Direct Football : Zone Mixte",
        "Retro Sport : L\xE9gendes du pass\xE9e",
        "Inside : Au c\u0153ur des vestiaires",
        "Documentaire : L'\xE9pop\xE9e des Bleus",
        "Midi Sport : L'actualit\xE9 des transferts",
        "Formule 1 : Les meilleurs moments",
        "Tennis Championship : Finale Historique",
        "Sport Info 24h"
      ];
      descs = [
        "Le rendez-vous incontournable pour d\xE9battre et analyser toute l'actualit\xE9 sportive en temps r\xE9el.",
        "Retour sur l'un des matchs les plus excitants de la saison avec les commentaires de nos experts.",
        "Analyse technique d\xE9taill\xE9e, interviews exclusives et tactiques de jeux avant les grands chocs europ\xE9ens.",
        "Les sp\xE9cialistes analysent l'actualit\xE9 des championnats et l'\xE9volution des athl\xE8tes.",
        "Un condens\xE9 explosif de tous les buts et moments forts de la derni\xE8re journ\xE9e de championnat.",
        "Sensations fortes garanties avec les plus grands exploits en surf, snowboard et sports m\xE9caniques.",
        "D\xE9briefings chauds, interviews exclusives et r\xE9actions de l'entra\xEEneur \xE0 l'issue de la rencontre.",
        "Revivez les moments mythiques et les exploits l\xE9gendaires des athl\xE8tes qui ont marqu\xE9 l'histoire du sport.",
        "Un aper\xE7u unique de la pr\xE9paration physique et mentale de nos champions avant les grandes comp\xE9titions."
      ];
      cats = ["Magazine Sportif", "Football", "Sport", "Documentaire Sport"];
      progDuration = 60;
    } else if (category.includes("Cin\xE9ma") || normName.includes("cine") || normName.includes("film") || normName.includes("canal+")) {
      titles = [
        "Film : Le Destin Ultime",
        "S\xE9rie : Ombres Suspectes (S1 Ep3)",
        "Film : Com\xE9die de Printemps",
        "Inside Cinema : Actualit\xE9s & Sorties",
        "Film d'Action : Course Contre la Montre",
        "S\xE9rie Thriller : V\xE9rit\xE9 Cach\xE9e (S2 Ep5)",
        "Cin\xE9-Club : Les Chefs-d'\u0153uvre Oubli\xE9s",
        "Film Populaire : Le Vent d'Hiver",
        "Court-M\xE9trage de l'Avenir",
        "Film Drame : La Vie Secr\xE8te de Claire",
        "S\xE9rie : Ombres Suspectes (S1 Ep4)",
        "Film : Le Retour du H\xE9ros"
      ];
      descs = [
        "Un thriller palpitant o\xF9 suspense et action se m\xEAlent dans une intrigue haletante et impr\xE9visible.",
        "Le d\xE9vou\xE9 d\xE9tective s'approche de la v\xE9rit\xE9 mais se heurte \xE0 de nouvelles menaces de l'organisation secr\xE8te.",
        "Une com\xE9die romantique hilarante sur les quiproquos sentimentaux d'une bande d'amis parisiens.",
        "Le magazine incontournable des cin\xE9philes : critiques, secrets de tournage et interviews exclusives de stars.",
        "Une course poursuite effr\xE9n\xE9e sur l'autoroute de tous les dangers avec un casting d'acteurs d'exception.",
        "L'inspecteur principal doit collaborer avec son rival pour \xE9lucider l'un des myst\xE8res les plus complexes.",
        "Analyse approfondie et projection des films d'auteurs d'\xE9poque par des critiques chevronn\xE9s.",
        "Une fesque romanesque et bouleversante d'une famille confront\xE9e aux \xE9preuves du temps."
      ];
      cats = ["Film", "S\xE9rie TV", "Thriller", "Cin\xE9-Club", "Com\xE9die"];
      progDuration = 90;
    } else if (category.includes("Documentaires") || normName.includes("discovery") || normName.includes("science") || normName.includes("histoire")) {
      titles = [
        "Civilisations Perdues : L'Empire Inca",
        "Nature Sauvage : Les Pr\xE9dateurs d'Afrique",
        "Science Ultime : Les Secrets de la Physique",
        "M\xE9caniques de l'\xC9meute : G\xE9nies de l'Ing\xE9nierie",
        "Les Myst\xE8res de l'Espace",
        "M\xE9moire d'Histoire : La Campagne d'Italie",
        "Plan\xE8te Verte : Les Rivi\xE8res Volantes",
        "Reportage : Au C\u0153ur de la Pr\xE9fecture",
        "Aux Fronti\xE8res de la Technologie",
        "Documentaire : L'\xE9volution du Climat",
        "Grandes Enqu\xEAtes : Cyber-menaces"
      ];
      descs = [
        "Partons \xE0 la d\xE9couverte des cit\xE9s englouties et des rituels mystiques de la fascinante civilisation Inca.",
        "Une plong\xE9e intime et immersive dans le quotidien implacable des gu\xE9pards de la savane africaine.",
        "Une exploration vulgaris\xE9e des th\xE9ories les plus folles de la physique quantique et de la relativit\xE9.",
        "Enqu\xEAte sur la construction robotique et sur les g\xE9ants m\xE9talliques qui r\xE9volutionnent le transport.",
        "Gros plan sur les trous noirs et les myst\xE8res les plus obscurs de notre syst\xE8me galactique.",
        "Une reconstitution in\xE9dite \xE9tay\xE9e de lettres d'archives et de t\xE9moignages de v\xE9t\xE9rans de guerre."
      ];
      cats = ["Documentaire", "Histoire", "Sciences et R\xE9v\xE9lations", "Nature & D\xE9couvertes"];
      progDuration = 45;
    } else if (category.includes("Musique") || normName.includes("music") || normName.includes("m6 music") || normName.includes("nrj")) {
      titles = [
        "Hits du Moment : Le Top 50",
        "Acoustic Live Session",
        "Electro Lounge Club",
        "Vintage Music : Les Ann\xE9es 90",
        "Clip Story : L'histoire des plus grands Hits",
        "Rap & R&B Zone",
        "Rock Rebellion Specials",
        "Dancefloor Anthems",
        "Pop Star Interview",
        "Les Sessions de Minuit"
      ];
      descs = [
        "Retrouvez tous vos titres pr\xE9f\xE9r\xE9s et les plus grands hits internationaux du moment en non-stop.",
        "Artistes d'exception se pr\xEAtent au jeu de l'interpr\xE9tation acoustique exclusive sur notre sc\xE8ne.",
        "Un encha\xEEnement rythm\xE9 des meilleurs clips d'electro lounge et deep house pour se d\xE9tendre.",
        "Retour sur les d\xE9cennies de la soul, du grunge et du hip-hop qui ont r\xE9volutionn\xE9 la musique populaire.",
        "L'histoire secr\xE8te et les anecdotes les plus incroyables derri\xE8re le tournage des clips cultes."
      ];
      cats = ["Musique", "Clips Non-Stop", "Vari\xE9t\xE9s", "\xC9mission Musicale"];
      progDuration = 45;
    } else {
      titles = [
        "Le Journal de 13h : L'actualit\xE9 en Direct",
        "S\xE9rie : Secrets de Famille (S1 Ep1)",
        "Un Joueur, Un Destin",
        "Magazine de l'Habitat : Mieux Vivre Chez Soi",
        "M\xE9t\xE9o Nationale",
        "S\xE9rie : Secrets de Famille (S1 Ep2)",
        "Le Journal de 20h : L'\xE9dition Sp\xE9ciale",
        "Grand Film du Soir : La Proph\xE9tie",
        "D\xE9bat R\xE9publicain : Repenser l'Avenir",
        "Late Show : Rendez-vous Insolite",
        "C'est l'Heure du Caf\xE9"
      ];
      descs = [
        "Retrouvez toutes les actualit\xE9s nationales et internationales d\xE9crypt\xE9es en direct par nos r\xE9dactions.",
        "Une saga palpitante pleine de myst\xE8res familiaux et de drames cach\xE9s au c\u0153ur d'une bourgade.",
        "Portrait intime d'une grande figure politique ou culturelle ayant marqu\xE9 l'histoire collective.",
        "Conseils pratiques d'experts, id\xE9es de d\xE9coration et astuces quotidiennes pour votre habitat.",
        "Grand \xE9cran du soir : Une intrigue \xE0 couper le souffle, r\xE9compens\xE9e aux plus prestigieux festivals."
      ];
      cats = ["Actualit\xE9s", "S\xE9rie TV", "Magazine", "Cin\xE9ma", "D\xE9bat"];
      progDuration = 45;
    }
    let currentStart = startOfDay.getTime();
    let index = 0;
    const endLimitTime = startOfDay.getTime() + 48 * 60 * 60 * 1e3;
    while (currentStart < endLimitTime) {
      const t = titles[index % titles.length];
      const d = descs[index % descs.length];
      const c = cats[index % cats.length];
      const startTimeStamp = currentStart;
      const endTimeStamp = currentStart + progDuration * 6e4;
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
  async function getLiveEpgData() {
    const now = /* @__PURE__ */ new Date();
    const response = {};
    const db = readDb();
    const ptvData = await scrapeProgrammeTv();
    for (const channel of db.channels) {
      const norm = normalizeChannelName(channel.name);
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
      let ptvMatches = ptvData[norm];
      if (!ptvMatches) {
        const entries = Object.entries(ptvData);
        const bestMatch = entries.find(([key]) => key === norm) || entries.find(([key]) => key.startsWith(norm + "series") || key.startsWith(norm + "films")) || entries.find(([key]) => key.includes(norm));
        ptvMatches = bestMatch ? bestMatch[1] : null;
      }
      response[channel.id] = {
        current,
        next,
        programmeTv: ptvMatches || null,
        schedule: progs.filter((p) => new Date(p.endTime) > now).slice(0, 50)
      };
    }
    return response;
  }
  let programmeTvCache = null;
  let isScrapingProgrammeTv = false;
  async function scrapeProgrammeTv() {
    const now = Date.now();
    const CACHE_DURATION = 15 * 60 * 1e3;
    if (programmeTvCache && now - programmeTvCache.timestamp < CACHE_DURATION) {
      return programmeTvCache.data;
    }
    if (isScrapingProgrammeTv) {
      return programmeTvCache ? programmeTvCache.data : {};
    }
    isScrapingProgrammeTv = true;
    (async () => {
      try {
        console.log("Background scraping tv-programme.com for live EPG...");
        const response = await import_axios.default.get("https://tv-programme.com/tv-direct", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          timeout: 15e3
        });
        const html = response.data;
        const programs = {};
        const unescape = (str) => {
          return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'");
        };
        const articles = html.split(/<article class="tvp-tv-direct-card-item">/);
        articles.shift();
        for (const doc of articles) {
          try {
            const channelMatch = doc.match(/<img[^>]+alt="Logo ([^"]+)"/);
            if (!channelMatch) continue;
            let channelName = channelMatch[1].trim();
            if (channelName === "C8") channelName = "C8";
            const normName = normalizeChannelName(channelName);
            const titleMatch = doc.match(/<h2 class="tvp_chapitre">([^<]+)<\/h2>/);
            const title = titleMatch ? unescape(titleMatch[1].trim()) : "";
            const imageMatch = doc.match(/<img([^>]*)>/g);
            let image = null;
            if (imageMatch) {
              for (const img of imageMatch) {
                if (img.includes("tvp-tv-direct-card-image")) {
                  const srcMatch = img.match(/src="([^"]+)"/);
                  if (srcMatch) image = srcMatch[1];
                }
              }
            }
            const progressMatch = doc.match(/<progress[^>]+value="([^"]+)"/);
            const progress = progressMatch ? parseFloat(progressMatch[1]) : 0;
            const timeMatch = doc.match(/<time class="tvp-tv-direct-card-time-start"[^>]*>([^<]+)<\/time>/);
            const time = timeMatch ? timeMatch[1].trim() : "";
            programs[normName] = {
              title,
              time,
              progress,
              image,
              link: null,
              // If needed we could parse href
              channelName
            };
          } catch (e) {
          }
        }
        try {
          const d = /* @__PURE__ */ new Date();
          const beFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", hour: "numeric", hour12: false });
          let hour = parseInt(beFormatter.format(d), 10);
          console.log(`Background scraping mon-programme-tv.be for live EPG (hour ${hour})...`);
          const beResponse = await import_axios.default.get(`https://www.mon-programme-tv.be/mon-programme-television/aujourdhui/${hour}.html`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 1e4
          });
          const beHtml = beResponse.data;
          const channels = beHtml.split('<div class="grille-channel">');
          channels.shift();
          for (const channelHtml of channels) {
            let channelName = "";
            const imgMatch = channelHtml.match(/<img[^>]+alt="([^"]+)"/i);
            if (imgMatch) {
              channelName = imgMatch[1].replace("Programmation t\xE9l\xE9 de ", "").replace("Programme t\xE9l\xE9 de ", "").replace("Programme TV de ", "").replace("Programme t\xE9l\xE9 ", "").replace("Programme TV ", "").trim();
            }
            if (!channelName) continue;
            const normName = normalizeChannelName(channelName);
            if (programs[normName]) continue;
            const boxes = channelHtml.split('<div class="box ').slice(1);
            if (boxes.length > 0) {
              const box = boxes[0];
              const titleMatch = box.match(/class="title"[^>]*>([^<]+)<\//);
              const title = titleMatch ? unescape(titleMatch[1].trim()) : "";
              const timeMatch = box.match(/class="hour"[^>]*>([^<]+)<\//);
              const time = timeMatch ? timeMatch[1].trim() : "";
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
        } catch (beErr) {
          console.error("mon-programme-tv.be scraping failed:", beErr.message);
        }
        programmeTvCache = { data: programs, timestamp: Date.now() };
        console.log(`Background scrape completed. Cache updated with ${Object.keys(programs).length} channels.`);
        const liveEpgData = await getLiveEpgData();
        io.emit("EPG_LIVE_UPDATE", liveEpgData);
      } catch (err) {
        console.error("Background scrape of programme-tv.net failed:", err.message);
      } finally {
        isScrapingProgrammeTv = false;
      }
    })();
    return programmeTvCache ? programmeTvCache.data : {};
  }
  app.get("/api/epg/live/programme-tv", async (req, res) => {
    const data = await scrapeProgrammeTv();
    res.json(data);
  });
  app.get("/api/epg/live", async (req, res) => {
    res.json(await getLiveEpgData());
  });
  app.get("/api/epg/guide", (req, res) => {
    const now = /* @__PURE__ */ new Date();
    const endLimit = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    const response = {};
    const db = readDb();
    for (const channel of db.channels) {
      const progs = findCorrectEpgProgs(channel);
      response[channel.id] = progs.filter((p) => {
        const start = new Date(p.startTime);
        const end = new Date(p.endTime);
        return end >= now && start <= endLimit;
      });
    }
    res.json(response);
  });
  app.post("/api/channels/check", async (req, res) => {
    const db = readDb();
    const results = [];
    for (const channel of db.channels) {
      const stats = await checkStream(channel.url);
      channel.status = stats.status;
      channel.responseTime = stats.responseTime;
      channel.format = stats.format;
      channel.quality = stats.quality;
      channel.lastCheck = (/* @__PURE__ */ new Date()).toISOString();
      results.push({
        id: channel.id,
        status: stats.status,
        responseTime: stats.responseTime,
        format: stats.format,
        quality: stats.quality
      });
      io.emit("CHANNEL_UPDATED", channel);
    }
    writeDb(db);
    res.json(results);
  });
  app.post("/api/channels/import-preset", async (req, res) => {
    const { url, categoryType } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      console.log(`Starting automated preset import from: ${url}`);
      const response = await import_axios.default.get(url, { timeout: 15e3 });
      const m3uContent = response.data;
      const lines = m3uContent.split("\n");
      const parsedChannels = [];
      let currentChannel = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXTINF:")) {
          const logoMatch = line.match(/tvg-logo="([^"]+)"/) || line.match(/logo="([^"]+)"/);
          const groupMatch = line.match(/group-title="([^"]+)"/) || line.match(/category="([^"]+)"/);
          const commaIndex = line.lastIndexOf(",");
          const name = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : "Cha\xEEne IPTV";
          let resolvedLogo = logoMatch ? logoMatch[1] : "";
          if (!resolvedLogo && name) {
            const cleanNameForIcon = name.toLowerCase().replace(/[^a-z0-9]/g, "");
            resolvedLogo = `https://raw.githubusercontent.com/iptv-org/database/master/data/icons/${cleanNameForIcon}.png`;
          }
          currentChannel = {
            name,
            logo: resolvedLogo || "https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120",
            category: groupMatch ? groupMatch[1] : categoryType || "G\xE9n\xE9raliste",
            backupUrls: []
          };
        } else if (line && !line.startsWith("#") && currentChannel) {
          currentChannel.url = line;
          parsedChannels.push(currentChannel);
          currentChannel = null;
        }
      }
      const db = readDb();
      let importedCount = 0;
      for (const parsed of parsedChannels) {
        const duplicate = db.channels.find((c) => c.name.toLowerCase() === parsed.name.toLowerCase());
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
            lastCheck: (/* @__PURE__ */ new Date()).toISOString()
          });
          importedCount++;
        }
      }
      writeDb(db);
      io.emit("CHANNELS_SYNC", db.channels);
      res.json({ count: importedCount, total: db.channels.length });
    } catch (err) {
      console.error("Import preset failure:", err.message);
      res.status(500).json({ error: "Failed to parse or download the remote IPTV catalog." });
    }
  });
  app.post("/api/playlists/parse", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      console.log(`Parsing playlist URL from controller: ${url}`);
      const response = await import_axios.default.get(url, {
        timeout: 12e3,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const m3uContent = response.data;
      if (typeof m3uContent !== "string") {
        throw new Error("La r\xE9ponse de la playlist n'est pas au format texte.");
      }
      const lines = m3uContent.split("\n");
      const parsedChannels = [];
      let currentChannel = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXTINF:")) {
          const logoMatch = line.match(/tvg-logo="([^"]+)"/) || line.match(/logo="([^"]+)"/);
          const groupMatch = line.match(/group-title="([^"]+)"/) || line.match(/category="([^"]+)"/);
          const commaIndex = line.lastIndexOf(",");
          const name = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : "Cha\xEEne IPTV";
          let resolvedLogo = logoMatch ? logoMatch[1] : "";
          if (!resolvedLogo && name) {
            const cleanNameForIcon = name.toLowerCase().replace(/[^a-z0-9]/g, "");
            resolvedLogo = `https://raw.githubusercontent.com/iptv-org/database/master/data/icons/${cleanNameForIcon}.png`;
          }
          currentChannel = {
            name,
            logo: resolvedLogo || "https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120",
            category: groupMatch ? groupMatch[1] : "Import\xE9",
            backupUrls: []
          };
        } else if (line && !line.startsWith("#") && currentChannel) {
          currentChannel.url = line;
          parsedChannels.push(currentChannel);
          currentChannel = null;
        }
      }
      res.json({ channels: parsedChannels });
    } catch (err) {
      console.error("Playlist parse failure:", err.message);
      res.status(500).json({ error: `Impossible d'analyser la playlist: ${err.message}` });
    }
  });
  app.post("/api/channels/repair", async (req, res) => {
    const db = readDb();
    let repairedCount = 0;
    const offlineChannels = db.channels.filter((c) => c.status === "offline" || !c.status);
    if (offlineChannels.length === 0) {
      return res.json({ repairedCount: 0, totalChecked: 0, message: "Tous les flux sont OK" });
    }
    console.log(`Self-Healing AutoRepair: Processing ${offlineChannels.length} streams...`);
    const iptvOrgIndex = await fetchAndIndexIptvOrg();
    for (const channel of offlineChannels) {
      const norm = normalizeChannelName(channel.name);
      const candidates = iptvOrgIndex[norm] || [];
      let foundAlternative = false;
      for (const candidateUrl of candidates) {
        if (candidateUrl === channel.url) continue;
        console.log(`AutoRepair: verifying stream viability limit of ${channel.name} \u2794 ${candidateUrl}`);
        const stats = await checkStream(candidateUrl);
        if (stats.status === "online" || stats.status === "slow") {
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
          channel.lastCheck = (/* @__PURE__ */ new Date()).toISOString();
          repairedCount++;
          foundAlternative = true;
          io.emit("CHANNEL_UPDATED", channel);
          break;
        }
      }
      if (!foundAlternative) {
        let fallbackUrl = "";
        if (norm === "france2") fallbackUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
        else if (norm === "tf1") fallbackUrl = "https://playertest.longtailvideo.com/adaptive/bipbop/bipbop.m3u8";
        if (fallbackUrl) {
          const stats = await checkStream(fallbackUrl);
          channel.url = fallbackUrl;
          channel.status = stats.status;
          channel.responseTime = stats.responseTime;
          channel.format = stats.format;
          channel.quality = stats.quality;
          channel.lastCheck = (/* @__PURE__ */ new Date()).toISOString();
          repairedCount++;
          io.emit("CHANNEL_UPDATED", channel);
        }
      }
    }
    writeDb(db);
    res.json({ repairedCount, totalChecked: offlineChannels.length });
  });
  app.post("/api/epg/sync", async (req, res) => {
    await syncEPG(io);
    res.json({ status: "ok" });
  });
  app.post("/api/channels", (req, res) => {
    const db = readDb();
    const newChannel = {
      ...req.body,
      id: Date.now().toString(),
      status: req.body.status || "online",
      isEnabled: req.body.isEnabled !== void 0 ? req.body.isEnabled : true,
      backupUrls: req.body.backupUrls || []
    };
    db.channels.push(newChannel);
    writeDb(db);
    io.emit("CHANNEL_ADDED", newChannel);
    res.json(newChannel);
  });
  app.post("/api/channels/duplicate/:id", (req, res) => {
    const db = readDb();
    const original = db.channels.find((c) => c.id === req.params.id);
    if (!original) return res.status(404).send("Not found");
    const clone = {
      ...JSON.parse(JSON.stringify(original)),
      id: (Date.now() + Math.random()).toString(),
      name: `${original.name} (Copie)`,
      channelNumber: (original.channelNumber || 0) + 1
    };
    db.channels.push(clone);
    writeDb(db);
    io.emit("CHANNEL_ADDED", clone);
    res.json(clone);
  });
  app.post("/api/channels/merge", (req, res) => {
    const { ids, targetName } = req.body;
    const db = readDb();
    const toMerge = db.channels.filter((c) => ids.includes(c.id));
    if (toMerge.length < 2) return res.status(400).send("At least 2 channels required");
    const primary = toMerge[0];
    const secondaryUrls = toMerge.slice(1).map((c) => c.url);
    primary.name = targetName || primary.name;
    if (!primary.backupUrls) primary.backupUrls = [];
    primary.backupUrls = [.../* @__PURE__ */ new Set([...primary.backupUrls, ...secondaryUrls])];
    db.channels = db.channels.filter((c) => !ids.slice(1).includes(c.id));
    writeDb(db);
    io.emit("CHANNELS_SYNC", db.channels);
    res.json(primary);
  });
  app.post("/api/channels/bulk", (req, res) => {
    const db = readDb();
    const newChannels = req.body.map((ch) => ({
      ...ch,
      id: (Date.now() + Math.random()).toString(),
      status: "online",
      backupUrls: ch.backupUrls || []
    }));
    db.channels = [...db.channels, ...newChannels];
    writeDb(db);
    io.emit("CHANNELS_SYNC", db.channels);
    res.json({ count: newChannels.length });
  });
  app.put("/api/channels/:id", (req, res) => {
    const db = readDb();
    const index = db.channels.findIndex((c) => c.id === req.params.id);
    if (index !== -1) {
      db.channels[index] = { ...db.channels[index], ...req.body };
      writeDb(db);
      io.emit("CHANNEL_UPDATED", db.channels[index]);
      res.json(db.channels[index]);
    } else {
      res.status(404).send("Not found");
    }
  });
  app.post("/api/channels/:id/view", (req, res) => {
    const db = readDb();
    const index = db.channels.findIndex((c) => c.id === req.params.id);
    if (index !== -1) {
      db.channels[index].viewCount = (db.channels[index].viewCount || 0) + 1;
      db.channels[index].lastPlayed = (/* @__PURE__ */ new Date()).toISOString();
      writeDb(db);
      io.emit("CHANNEL_UPDATED", db.channels[index]);
      res.json({ success: true, channel: db.channels[index] });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });
  app.post("/api/channels/:id/play", (req, res) => {
    const db = readDb();
    const index = db.channels.findIndex((c) => c.id === req.params.id);
    if (index !== -1) {
      db.channels[index].viewCount = (db.channels[index].viewCount || 0) + 1;
      db.channels[index].lastPlayed = (/* @__PURE__ */ new Date()).toISOString();
      writeDb(db);
      io.emit("CHANNEL_UPDATED", db.channels[index]);
      res.json({ success: true, channel: db.channels[index] });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });
  app.delete("/api/channels/offline", (req, res) => {
    const db = readDb();
    const count = db.channels.length;
    db.channels = db.channels.filter((c) => c.status !== "offline");
    writeDb(db);
    io.emit("CHANNELS_SYNC", db.channels);
    res.json({ deleted: count - db.channels.length });
  });
  app.delete("/api/channels/:id", (req, res) => {
    const db = readDb();
    db.channels = db.channels.filter((c) => c.id !== req.params.id);
    writeDb(db);
    io.emit("CHANNEL_DELETED", req.params.id);
    res.sendStatus(204);
  });
  app.post("/api/channels/keep-only-french", (req, res) => {
    const db = readDb();
    const countBefore = db.channels.length;
    const coreFrenchKeywords = [
      "tf1",
      "france 2",
      "france 3",
      "canal+",
      "france 5",
      "m6",
      "arte",
      "c8",
      "w9",
      "tmc",
      "tfx",
      "nrj 12",
      "lcp",
      "france 4",
      "bfmtv",
      "cnews",
      "cstar",
      "gulli",
      "france info",
      "rmc d\xE9couverte",
      "rmc story",
      "ch\xE9rie 25",
      "lequipe",
      "rtl9",
      "teva",
      "paris premi\xE8re",
      "paris premiere",
      "ab1",
      "tv5monde",
      "tv5 monde",
      "france0",
      "france 24",
      "euronews"
    ];
    db.channels = db.channels.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const cat = (c.category || "").toLowerCase();
      const country = (c.country || "").toLowerCase();
      const lang = (c.language || "").toLowerCase();
      if (coreFrenchKeywords.some((kw) => name === kw || name.startsWith(kw + " ") || name.includes(" " + kw) || name.includes(kw))) {
        return true;
      }
      if (name.includes("(fr)") || name.includes("[fr]") || name.includes("fr:") || name.includes("fr|") || name.includes("fr-") || name.includes("french") || name.includes("belge") || name.includes("suisse") || name.startsWith("fr ")) {
        return true;
      }
      if (country.includes("france") || country.includes("belg") || country.includes("suis") || country.includes("luxembourg") || country === "fr" || country === "be" || country === "ch") {
        return true;
      }
      if (lang.includes("fran\xE7ais") || lang.includes("francais") || lang.includes("french") || lang === "fr") {
        return true;
      }
      const frenchCategories = [
        "g\xE9n\xE9ralistes",
        "documentaires",
        "cin\xE9ma",
        "sport",
        "infos",
        "musique",
        "jeunesse",
        "r\xE9gional",
        "suisse",
        "belge",
        "fr",
        "france",
        "belgique"
      ];
      if (frenchCategories.some((catKeyword) => cat.includes(catKeyword))) {
        return true;
      }
      return false;
    });
    writeDb(db);
    io.emit("CHANNELS_SYNC", db.channels);
    res.json({ kept: db.channels.length, deleted: countBefore - db.channels.length });
  });
  app.post("/api/channels/auto-merge-duplicates", (req, res) => {
    const db = readDb();
    const countBefore = db.channels.length;
    const normalizeChannelName2 = (name) => {
      let normalized = (name || "").toLowerCase();
      normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const patternsToRemove = [
        /\bhd\b/gi,
        /\bfhd\b/gi,
        /\bsd\b/gi,
        /\bhevc\b/gi,
        /\b4k\b/gi,
        /\b1080p\b/gi,
        /\b720p\b/gi,
        /\bfr\b/gi,
        /\bbelge\b/gi,
        /\bsuisse\b/gi,
        /\bfrance\b/gi,
        /\[[^\]]*\]/g,
        /\([^\)]*\)/g
      ];
      for (const pat of patternsToRemove) {
        normalized = normalized.replace(pat, " ");
      }
      normalized = normalized.replace(/[^a-z0-9]/g, "");
      return normalized.trim();
    };
    const groups = {};
    for (const c of db.channels) {
      const norm = normalizeChannelName2(c.name);
      if (!norm) {
        const fallbackKey = (c.name || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "");
        groups[fallbackKey] = groups[fallbackKey] || [];
        groups[fallbackKey].push(c);
      } else {
        groups[norm] = groups[norm] || [];
        groups[norm].push(c);
      }
    }
    const mergedChannels = [];
    for (const key in groups) {
      const group = groups[key];
      if (group.length === 0) continue;
      let primary = group[0];
      for (const candidate of group) {
        const cName = (candidate.name || "").toUpperCase();
        const pName = (primary.name || "").toUpperCase();
        const candidateHasLogo = candidate.logo && !candidate.logo.includes("unsplash.com");
        const primaryHasLogo = primary.logo && !primary.logo.includes("unsplash.com");
        const candidateIsHD = cName.includes("HD") || cName.includes("FHD") || cName.includes("1080");
        const primaryIsHD = pName.includes("HD") || pName.includes("FHD") || pName.includes("1080");
        if (candidateIsHD && !primaryIsHD || candidateHasLogo && !primaryHasLogo) {
          primary = candidate;
        }
      }
      const allUrls = /* @__PURE__ */ new Set();
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
      const urlList = Array.from(allUrls);
      primary.url = urlList[0] || primary.url;
      primary.backupUrls = urlList.slice(1);
      mergedChannels.push(primary);
    }
    mergedChannels.sort((a, b) => {
      const catA = (a.category || "").toLowerCase();
      const catB = (b.category || "").toLowerCase();
      if (catA !== catB) {
        return catA.localeCompare(catB);
      }
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
    db.channels = mergedChannels;
    writeDb(db);
    io.emit("CHANNELS_SYNC", db.channels);
    res.json({ kept: db.channels.length, merged: countBefore - db.channels.length });
  });
  app.post("/api/channels/bulk-delete", (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
    const db = readDb();
    db.channels = db.channels.filter((c) => !ids.includes(c.id));
    writeDb(db);
    io.emit("CHANNELS_SYNC", db.channels);
    res.json({ deleted: ids.length });
  });
  app.delete("/api/channels", (req, res) => {
    const db = readDb();
    db.channels = [];
    writeDb(db);
    io.emit("CHANNELS_SYNC", []);
    res.sendStatus(204);
  });
  app.post("/api/settings", (req, res) => {
    const db = readDb();
    db.settings = { ...db.settings, ...req.body };
    writeDb(db);
    io.emit("SETTINGS_UPDATED", db.settings);
    res.json(db.settings);
  });
  app.get("/api/categories", (req, res) => {
    res.json(readDb().categories || []);
  });
  app.post("/api/categories", (req, res) => {
    const db = readDb();
    if (!db.categories) db.categories = [];
    const newCat = {
      id: Date.now().toString(),
      name: req.body.name,
      icon: req.body.icon || "LayoutGrid",
      color: req.body.color || "#00A8E1",
      order: db.categories.length
    };
    db.categories.push(newCat);
    writeDb(db);
    io.emit("CATEGORIES_SYNC", db.categories);
    res.json(newCat);
  });
  app.put("/api/categories/:id", (req, res) => {
    const db = readDb();
    const index = db.categories.findIndex((c) => c.id === req.params.id);
    if (index !== -1) {
      db.categories[index] = { ...db.categories[index], ...req.body };
      writeDb(db);
      io.emit("CATEGORIES_SYNC", db.categories);
      res.json(db.categories[index]);
    } else {
      res.status(404).send("Category not found");
    }
  });
  app.delete("/api/categories/:id", (req, res) => {
    const db = readDb();
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
    writeDb(db);
    io.emit("CATEGORIES_SYNC", db.categories);
    res.sendStatus(204);
  });
  app.post("/api/categories/reorder", (req, res) => {
    const { order } = req.body;
    const db = readDb();
    db.categories = db.categories.map((cat) => {
      const newIndex = order.indexOf(cat.id);
      return { ...cat, order: newIndex !== -1 ? newIndex : cat.order };
    }).sort((a, b) => a.order - b.order);
    writeDb(db);
    io.emit("CATEGORIES_SYNC", db.categories);
    res.json(db.categories);
  });
  app.get("/api/epg/sources", (req, res) => {
    res.json(readDb().epgSources || []);
  });
  app.post("/api/epg/sources", (req, res) => {
    const db = readDb();
    if (!db.epgSources) db.epgSources = [];
    const newSource = { ...req.body, id: Date.now().toString() };
    db.epgSources.push(newSource);
    writeDb(db);
    res.json(newSource);
  });
  app.post("/api/epg/sources/toggle", (req, res) => {
    const db = readDb();
    if (!db.epgSources || !db.epgSources[req.body.index]) return res.status(404).send("Not found");
    db.epgSources[req.body.index].isActive = !db.epgSources[req.body.index].isActive;
    writeDb(db);
    res.json(db.epgSources[req.body.index]);
  });
  app.get("/api/proxy/cartelive", async (req, res) => {
    try {
      const feed = req.query.feed || "ufeed01";
      const hocaRes = await import_axios.default.get(`https://hoca8.com/footy.php?player=desktop&live=${feed}`, {
        headers: {
          "Referer": "https://cartelive.club/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const data = hocaRes.data;
      let resultUrl = "";
      const arrMatch = data.match(/\["h","t","t","p","s",":"[^\]]+\]/);
      if (arrMatch) {
        const arr = JSON.parse(arrMatch[0]);
        resultUrl = arr.join("");
      }
      const extraArrayMatch = data.match(/join\(""\)\s*\+\s*([a-zA-Z0-9]+)\.join\(""\)/);
      if (extraArrayMatch) {
        const varName = extraArrayMatch[1];
        const varMatch = data.match(new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[^\\]]*\\])`));
        if (varMatch) {
          try {
            const extraArr = JSON.parse(varMatch[1].replace(/'/g, '"'));
            resultUrl += extraArr.join("");
          } catch (e) {
          }
        }
      }
      const spanMatch = data.match(/document\.getElementById\("([^"]+)"\)\.innerHTML/);
      if (spanMatch) {
        const spanId = spanMatch[1];
        const spanContentMatch = data.match(new RegExp(`id=${spanId}>([^<]*)<`));
        if (spanContentMatch) {
          resultUrl += spanContentMatch[1];
        }
      }
      if (resultUrl) {
        res.redirect(`/api/proxy/stream?url=${encodeURIComponent(resultUrl)}&referer=${encodeURIComponent("https://hoca8.com/")}`);
      } else {
        res.status(404).send("Stream not found or parse failed");
      }
    } catch (err) {
      res.status(500).send("Error scraping stream");
    }
  });
  app.get("/api/proxy/stream", async (req, res) => {
    const url = req.query.url;
    const referer = req.query.referer || "https://hoca8.com/";
    if (!url) return res.status(400).send("No url provided");
    try {
      const isM3u8 = url.toLowerCase().includes(".m3u8") || url.toLowerCase().includes("m3u8");
      const resp = await import_axios.default.get(url, {
        headers: {
          "Referer": referer,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        responseType: isM3u8 ? "text" : "stream",
        validateStatus: () => true
      });
      res.status(resp.status);
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Headers", "*");
      if (resp.headers["content-type"]) {
        res.set("Content-Type", resp.headers["content-type"]);
      }
      if (isM3u8 && typeof resp.data === "string") {
        const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
        let m3u8Content = resp.data;
        let search = "";
        try {
          const urlObj = new URL(url);
          search = urlObj.search;
        } catch (e) {
        }
        const lines = m3u8Content.split("\n");
        const modifiedLines = lines.map((line) => {
          if (line && !line.startsWith("#")) {
            let chunkUrl = line.trim();
            try {
              chunkUrl = new URL(chunkUrl, url).href;
            } catch (e) {
              if (!chunkUrl.startsWith("http")) {
                chunkUrl = baseUrl + chunkUrl;
              }
            }
            if (search && !chunkUrl.includes("?")) {
              chunkUrl += search;
            }
            return `/api/proxy/stream?url=${encodeURIComponent(chunkUrl)}&referer=${encodeURIComponent(referer)}`;
          }
          return line;
        });
        res.send(modifiedLines.join("\n"));
      } else {
        resp.data.pipe(res);
      }
    } catch (err) {
      console.log("[Stream Routing] Source unreachable, trying fallback option");
      const isM6Url = url && (url.includes("shls-m6-france") || url.includes("origin2-6play") || url.includes("shls-m6-int"));
      if (isM6Url) {
        console.log("[Stream Routing] Redirecting M6 stream to live backup source (fixing M6 Kids error)");
        try {
          return res.redirect("/api/proxy/fstv?newsid=14");
        } catch (fallbackErr) {
        }
      }
      if (!res.headersSent) {
        res.status(500).send("Routing request did not complete");
      }
    }
  });
  app.get("/api/proxy/video", async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("No url provided");
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }
    const referer = req.query.referer || req.query.referrer;
    if (referer) {
      headers["Referer"] = referer;
    } else {
      try {
        const urlObj = new URL(videoUrl);
        headers["Referer"] = urlObj.origin + "/";
      } catch (e) {
      }
    }
    try {
      const response = await (0, import_axios.default)({
        method: "get",
        url: videoUrl,
        headers,
        responseType: "stream",
        validateStatus: () => true,
        timeout: 15e3
      });
      res.status(response.status);
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Headers", "*");
      if (response.status >= 400) {
        console.warn(`Video Proxy Warning: ${videoUrl} returned status ${response.status}`);
      }
      const forwardHeaders = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "cache-control"
      ];
      forwardHeaders.forEach((h) => {
        if (response.headers[h]) {
          res.set(h, response.headers[h]);
        }
      });
      res.status(response.status);
      response.data.pipe(res);
    } catch (err) {
      console.warn("[Video Routing Warning]", err.message);
      if (!res.headersSent) {
        res.status(500).send("Routing error");
      }
    }
  });
  app.get("/api/proxy/fstv", async (req, res) => {
    const newsid = req.query.newsid;
    if (!newsid) return res.status(400).send("Missing newsid");
    try {
      const pageRes = await import_axios.default.get(`https://fstv.rest/index.php?newsid=${newsid}`);
      const paths = [...pageRes.data.matchAll(/window\.FSTV_SRC\s*=\s*"([^"]+)"/g)];
      let path2 = paths.find((p) => p[1].length > 0)?.[1];
      if (!path2) {
        return res.status(404).send("Stream not found or FSTV_SRC matching failed");
      }
      if (path2.includes("ch=")) {
        const nameMatch = pageRes.data.match(/window\.FSTV_NAME\s*=\s*"([^"]+)"/);
        if (nameMatch && nameMatch[1]) {
          const sourcesRes = await import_axios.default.get(`https://fstv.rest/live.php?q=1&sources=${encodeURIComponent(nameMatch[1])}`, {
            headers: { "Referer": "https://fstv.rest/" }
          });
          if (sourcesRes.data && sourcesRes.data.length > 0) {
            const bestSource = sourcesRes.data.find((s) => s.q === "FHD" || s.q === "HD") || sourcesRes.data[0];
            path2 = `/live.php?id=${bestSource.id}`;
          }
        }
      }
      const m3u8Res = await import_axios.default.get(`https://fstv.rest${path2}`, {
        headers: { "Referer": `https://fstv.rest/index.php?newsid=${newsid}` }
      });
      const modifiedM3u8 = m3u8Res.data.replace(/https:\/\/fstv\.rest\/live\.php\?seg=/g, "/api/proxy/fstv/seg?url=");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.send(modifiedM3u8);
    } catch (err) {
      console.log("[FSTV Proxy] Routing did not complete");
      res.status(500).send("FSTV routing failed");
    }
  });
  app.get("/api/proxy/fstv/seg", async (req, res) => {
    const segUrl = req.query.url;
    try {
      const response = await import_axios.default.get(`https://fstv.rest/live.php?seg=${encodeURIComponent(segUrl)}`, {
        responseType: "stream",
        headers: { "Referer": "https://fstv.rest/" }
      });
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      if (response.headers["content-type"]) {
        res.setHeader("Content-Type", response.headers["content-type"]);
      }
      response.data.pipe(res);
    } catch (err) {
      if (!res.headersSent) res.status(500).send("Segment routing request did not complete");
    }
  });
  app.post("/api/channels/scrape-fstv", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    try {
      const newsidMatch = url.match(/newsid=(\d+)/);
      if (!newsidMatch) return res.status(400).json({ error: "Invalid FSTV URL (missing newsid)" });
      const newsid = newsidMatch[1];
      const pageRes = await import_axios.default.get(`https://fstv.rest/index.php?newsid=${newsid}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const html = pageRes.data;
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      let name = titleMatch ? titleMatch[1].split("regarder")[0].split("-")[0].trim() : `FSTV Channel ${newsid}`;
      const logoMatch = html.match(/<img[^>]+src="([^"]+)"[^>]+class="poster"/i) || html.match(/<img[^>]+class="poster"[^>]+src="([^"]+)"/i) || html.match(/<img[^>]+src="([^"]+)"/i);
      let logo = logoMatch ? logoMatch[1] : "";
      if (logo && !logo.startsWith("http")) logo = `https://fstv.rest${logo}`;
      const categoryMatch = html.match(/category\/[^"]+">([^<]+)<\/a>/i);
      const category = categoryMatch ? categoryMatch[1].trim() : "FSTV";
      const db = readDb();
      const existing = db.channels.find((c) => c.id === `fstv-${newsid}`);
      const channelData = {
        id: `fstv-${newsid}`,
        name,
        logo: logo || "https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120",
        category,
        url: `/api/proxy/fstv?newsid=${newsid}`,
        status: "online",
        viewCount: 0,
        lastPlayed: null,
        country: "France",
        language: "Fran\xE7ais"
      };
      if (!existing) {
        db.channels.push(channelData);
        writeDb(db);
        io.emit("CHANNEL_ADDED", channelData);
        res.json({ success: true, channel: channelData });
      } else {
        res.json({ success: true, channel: existing, message: "Channel already exists" });
      }
    } catch (err) {
      console.error("FSTV Scraping error:", err.message);
      res.status(500).json({ error: "Failed to scrape FSTV page" });
    }
  });
  app.get("/api/proxy/witv", async (req, res) => {
    const slug = req.query.slug;
    if (!slug) return res.status(400).send("Missing slug");
    try {
      const channelUrl = `https://witv.team/chaines-live/${slug}`;
      const pageRes = await import_axios.default.get(channelUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const match = pageRes.data.match(/witv-player\.php\?id=(\d+)/);
      if (!match) {
        return res.status(404).send("wiTV Player ID not found");
      }
      const playerId = match[1];
      const playerRes = await import_axios.default.get(`https://witv.team/player/playerjs/witv-player.php?id=${playerId}`, {
        headers: {
          "Referer": channelUrl,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const streamMatch = playerRes.data.match(/var streamUrl = "(https:\/\/[^"]+)"/);
      if (!streamMatch) {
        return res.status(404).send("wiTV stream URL not found");
      }
      const rawStreamUrl = streamMatch[1];
      res.redirect(`/api/proxy/stream?url=${encodeURIComponent(rawStreamUrl)}&referer=${encodeURIComponent("https://witv.team/")}`);
    } catch (err) {
      console.warn("[wiTV Routing Warning]", err.message);
      res.status(500).send(err.message);
    }
  });
  app.get("/api/proxy/tvmio", async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).send("Missing TVMio ID");
    try {
      const baseUrl = "https://tvmio.ooguy.com/eyJjb3VudHJpZXMiOlsiRlIiXSwmY2F0ZWdvcmllcyI6eyJGUiI6WyJHZW5lcmFsIPCfk7oiLCJTcG9ydHMg4pq9IiwiRG9jdW1lbnRhaXJlcyDwn4yNIiwiRmlsbXMg8J+OrCIsIkluZm9ybWF0aW9ucyDwn5OwIiwiTXVzaWMg8J+OtSIsIkVuZmFudHMg8J+RtiJdfSwiZW5hYmxlU2VhcmNoIjp0cnVlfQ";
      const streamUrl = `${baseUrl}/stream/tv/${id}.json`;
      const response = await import_axios.default.get(streamUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const streams = response.data.streams;
      if (!streams || streams.length === 0) {
        return res.status(404).send("No streams found for this ID");
      }
      const bestStream = streams.find((s) => s.title.includes("FHD")) || streams[0];
      if (!bestStream.url) {
        return res.status(404).send("Stream URL not found");
      }
      res.redirect(`/api/proxy/stream?url=${encodeURIComponent(bestStream.url)}&referer=${encodeURIComponent("https://tvmio.ooguy.com/")}`);
    } catch (err) {
      console.error("[TVMio Proxy Error]", err.message);
      res.status(500).send("TVMio proxy internal error");
    }
  });
  let cachedVavooSignature = "";
  let cachedVavooSigTimestamp = 0;
  async function getVavooSignature() {
    const now = Date.now();
    if (cachedVavooSignature && now - cachedVavooSigTimestamp < 4 * 60 * 1e3) {
      return cachedVavooSignature;
    }
    const payload = {
      reason: "app-focus",
      locale: "fr",
      theme: "dark",
      metadata: {
        device: { type: "desktop", uniqueId: `node-${now}` },
        os: { name: "linux", version: "Linux", abis: ["x64"], host: "node" },
        app: { platform: "electron" },
        version: { package: "tv.vavoo.app", binary: "3.1.8", js: "3.1.8" }
      },
      appFocusTime: 0,
      playerActive: false,
      playDuration: 0,
      devMode: false,
      hasAddon: true,
      castConnected: false,
      package: "tv.vavoo.app",
      version: "3.1.8",
      process: "app",
      firstAppStart: now,
      lastAppStart: now,
      adblockEnabled: true,
      proxy: { supported: ["ss"], engine: "Mu", enabled: false, autoServer: true },
      iap: { supported: false }
    };
    console.log("[VAVOO SERVICE] Fetching fresh VAVOO signature...");
    try {
      const response = await import_axios.default.post("https://www.vavoo.tv/api/app/ping", payload, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "vavoo/3.1.8"
        },
        timeout: 1e4,
        validateStatus: (status) => status === 200
      });
      const signature = response.data?.addonSig;
      if (!signature) {
        throw new Error("VAVOO ping reply did not contain addonSig");
      }
      cachedVavooSignature = signature;
      cachedVavooSigTimestamp = now;
      console.log("[VAVOO SERVICE] Token secured successfully.");
      return signature;
    } catch (err) {
      console.warn("[VAVOO SERVICE] Primary endpoint failed, trying backup...");
      try {
        const response = await import_axios.default.post("https://www.vavoo.to/api/app/ping", payload, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "vavoo/3.1.8"
          },
          timeout: 1e4
        });
        const signature = response.data?.addonSig;
        if (signature) {
          cachedVavooSignature = signature;
          cachedVavooSigTimestamp = Date.now();
          return signature;
        }
      } catch (e) {
      }
      if (cachedVavooSignature) {
        console.warn("[VAVOO SERVICE] All endpoints failed, using stale cached signature as last resort");
        return cachedVavooSignature;
      }
      throw err;
    }
  }
  app.get("/api/proxy/vavoo", async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).send("No VAVOO url provided");
    try {
      const signature = await getVavooSignature();
      const resolveUrl = "https://vavoo.to/mediahubmx-resolve.json";
      const resolvePayload = {
        language: "fr",
        region: "FR",
        url,
        clientVersion: "3.0.2"
      };
      let resolveRes;
      try {
        resolveRes = await import_axios.default.post(resolveUrl, resolvePayload, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "mediahubmx-signature": signature,
            "user-agent": "MediaHubMX/2",
            "accept": "*/*",
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Connection": "close"
          },
          timeout: 12e3
        });
      } catch (retryErr) {
        console.warn("[VAVOO PROXY] Resolve failed (FR), retrying with DE region...");
        resolvePayload.region = "DE";
        resolveRes = await import_axios.default.post(resolveUrl, resolvePayload, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "mediahubmx-signature": signature,
            "user-agent": "MediaHubMX/2",
            "Connection": "close"
          },
          timeout: 12e3
        });
      }
      const resolvedData = resolveRes.data;
      let streamUrl = "";
      if (Array.isArray(resolvedData)) {
        streamUrl = resolvedData[0]?.url || resolvedData[0]?.streamUrl || "";
      } else if (resolvedData) {
        streamUrl = resolvedData.url || resolvedData.streamUrl || "";
      }
      if (streamUrl) {
        console.log(`[VAVOO PROXY] Stream successfully resolved: ${streamUrl.substring(0, 40)}...`);
        return res.redirect(`/api/proxy/stream?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent("https://vavoo.to/")}`);
      } else {
        console.warn("[VAVOO PROXY] Resolve succeeded but no URL found in response");
        return res.status(404).send("VAVOO resolve failed to extract stream URL.");
      }
    } catch (err) {
      console.error("[VAVOO PROXY ERROR]", err.message);
      res.status(500).send("VAVOO internal proxy error. Please try again later.");
    }
  });
  app.post("/api/channels/import-tvmio", async (req, res) => {
    try {
      const manifestUrl = "https://tvmio.ooguy.com/eyJjb3VudHJpZXMiOlsiRlIiXSwmY2F0ZWdvcmllcyI6eyJGUiI6WyJHZW5lcmFsIPCfk7oiLCJTcG9ydHMg4pq9IiwiRG9jdW1lbnRhaXJlcyDwn4yNIiwiRmlsbXMg8J+OrCIsIkluZm9ybWF0aW9ucyDwn5OwIiwiTXVzaWMg8J+OtSIsIkVuZmFudHMg8J+RtiJdfSwiZW5hYmxlU2VhcmNoIjp0cnVlfQ";
      const catalogUrl = `${manifestUrl}/catalog/tv/tvmio_fr.json`;
      console.log("[TVMio Import] Fetching catalog...");
      const response = await import_axios.default.get(catalogUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const metas = response.data.metas || [];
      if (metas.length === 0) {
        return res.status(404).json({ error: "No channels found in TVMio catalog" });
      }
      const db = readDb();
      let importedCount = 0;
      for (const meta of metas) {
        const id = `tvmio-${meta.id}`;
        const existing = db.channels.find((c) => c.id === id);
        if (!existing) {
          const channelData = {
            id,
            name: meta.name,
            logo: meta.logo || meta.poster || "https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120",
            category: meta.genres ? meta.genres[0] : "TVMio",
            url: `/api/proxy/tvmio?id=${meta.id}`,
            status: "online",
            viewCount: 0,
            lastPlayed: null,
            country: "France",
            language: "Fran\xE7ais",
            description: meta.description || ""
          };
          db.channels.push(channelData);
          importedCount++;
        }
      }
      if (importedCount > 0) {
        writeDb(db);
        io.emit("CHANNELS_SYNC", db.channels);
      }
      res.json({ success: true, count: importedCount, totalInCatalog: metas.length });
    } catch (err) {
      console.error("[TVMio Import Error]", err.message);
      res.status(500).json({ error: "Failed to import TVMio channels" });
    }
  });
  app.post("/api/channels/scrape-witv", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    try {
      const matchSlug = url.match(/chaines-live\/([^/]+)$/);
      if (!matchSlug) return res.status(400).json({ error: "Invalid wiTV URL structure" });
      const slug = matchSlug[1];
      const pageRes = await import_axios.default.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      const html = pageRes.data;
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      let name = titleMatch ? titleMatch[1].split("regarder")[0].split("-")[0].split("Regarder")[0].trim() : `wiTV Channel ${slug}`;
      name = name.replace(/\s*-\s*WiTv/gi, "").replace(/\s*WiTv/gi, "").replace(/\s*en direct/gi, "").replace(/\s*Streaming/gi, "").replace(/\s*Chaines TV/gi, "").trim();
      const logoMatch = html.match(/<img[^>]+src="([^"]+)"[^>]+class="poster"/i) || html.match(/<img[^>]+class="poster"[^>]+src="([^"]+)"/i) || html.match(/<img[^>]+src="([^"]+images\/logo\/[^"]+)"/i) || html.match(/<img[^>]+src="([^"]+)"/i);
      let logo = logoMatch ? logoMatch[1] : "";
      if (logo && !logo.startsWith("http")) {
        logo = `https://witv.team${logo}`;
      } else if (!logo) {
        const logoMeta = html.match(/property="og:image"\s+content="([^"]+)"/i) || html.match(/name="twitter:image"\s+content="([^"]+)"/i);
        if (logoMeta) logo = logoMeta[1];
      }
      const db = readDb();
      const existing = db.channels.find((c) => c.id === `witv-${slug}`);
      const channelData = {
        id: `witv-${slug}`,
        name,
        logo: logo || "https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=120&h=120",
        category: "Documentaires",
        url: `/api/proxy/witv?slug=${slug}`,
        status: "online",
        viewCount: 0,
        lastPlayed: null,
        country: "France",
        language: "Fran\xE7ais"
      };
      if (!existing) {
        db.channels.push(channelData);
        writeDb(db);
        io.emit("CHANNEL_ADDED", channelData);
        res.json({ success: true, channel: channelData });
      } else {
        res.json({ success: true, channel: existing, message: "Channel already exists" });
      }
    } catch (err) {
      console.error("wiTV Scraping error:", err.message);
      res.status(500).json({ error: "Failed to scrape wiTV page" });
    }
  });
  app.post("/api/security/pin", (req, res) => {
    const { oldPin, newPin } = req.body;
    const db = readDb();
    if (oldPin === "0104") {
      res.json({ status: "ok" });
    } else {
      res.status(403).json({ error: "Incorrect pin" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  io.on("connection", async (socket) => {
    console.log("User connected");
    socket.emit("CHANNELS_SYNC", readDb().channels);
    socket.emit("EPG_LIVE_UPDATE", await getLiveEpgData());
    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
  setInterval(() => syncEPG(io), 6 * 60 * 60 * 1e3);
  setInterval(async () => {
    const data = await getLiveEpgData();
    io.emit("EPG_LIVE_UPDATE", data);
  }, 10 * 1e3);
  setInterval(async () => {
    console.log("Executing Background Auto-Healing sweep (including Private Zone cleanup)...");
    import_axios.default.post(`http://localhost:${PORT}/api/channels/repair`).catch(() => {
    });
    try {
      const db = readDb();
      const privateChannels = db.channels.filter((c) => c.isPrivate);
      const toDelete = [];
      for (const channel of privateChannels) {
        const stats = await checkStream(channel.url);
        if (stats.status === "offline") {
          console.log(`[Auto-Cleanup] Private channel ${channel.name} is Offline/HS. Adding to deletion list.`);
          toDelete.push(channel.id);
        }
      }
      if (toDelete.length > 0) {
        db.channels = db.channels.filter((c) => !toDelete.includes(c.id));
        writeDb(db);
        io.emit("CHANNELS_SYNC", db.channels);
        console.log(`[Auto-Cleanup] Successfully removed ${toDelete.length} defunct private channels.`);
      }
    } catch (err) {
      console.error("[Auto-Cleanup] Private zone sweep failed");
    }
  }, 1 * 60 * 60 * 1e3);
}
process.on("uncaughtException", (err) => {
  console.error("CRITICAL UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("CRITICAL UNHANDLED REJECTION at:", promise, "reason:", reason);
});
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
