import fs from 'fs';
import path from 'path';
import axios from 'axios';

const DB_PATH = path.join(process.cwd(), 'db.json');

const TARGET_CHANNELS_TO_ENSURE = [
  {
    name: "TF1",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/tf1-fr.png",
    id: "1781886076265.2324"
  },
  {
    name: "France 2",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-2-fr.png",
    id: "fstv-42"
  },
  {
    name: "France 3",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-3-fr.png",
    id: "fstv-43"
  },
  {
    name: "Canal+",
    category: "Cinéma & Séries",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/canal-plus-fr.png",
    id: "fstv-44"
  },
  {
    name: "M6",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/m6-fr.png",
    id: "fstv-45"
  },
  {
    name: "CANAL+ SPORT",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/canal-plus-sport-fr.png",
    id: "vavoo-canalplus-sport"
  },
  {
    name: "BOX OFFICE 1",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-1"
  },
  {
    name: "BOX OFFICE 2",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-2"
  },
  {
    name: "BOX OFFICE 3",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-3"
  },
  {
    name: "BOX OFFICE 4",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-4"
  },
  {
    name: "BOX OFFICE 5",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-5"
  },
  {
    name: "BOX OFFICE 6",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-6"
  },
  {
    name: "BOX OFFICE 7",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-7"
  },
  {
    name: "BOX OFFICE 8",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-8"
  },
  {
    name: "BOX OFFICE 9",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-9"
  },
  {
    name: "BOX OFFICE 10",
    category: "Cinéma & Séries",
    logo: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=300",
    id: "vavoo-box-office-10"
  },
  {
    name: "FOOT+",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/canal-plus-foot-fr.png",
    id: "vavoo-foot-plus"
  },
  {
    name: "CANAL+ FOOT",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/canal-plus-foot-fr.png",
    id: "vavoo-canalplus-foot"
  },
  {
    name: "ORANGE FRANCEBOX 1",
    category: "Cinéma & Séries",
    logo: "/orange-tv-logo.svg",
    id: "vavoo-orange-francebox-1"
  },
  {
    name: "ORANGE FRANCEBOX 2",
    category: "Cinéma & Séries",
    logo: "/orange-tv-logo.svg",
    id: "vavoo-orange-francebox-2"
  },
  {
    name: "ORANGE FRANCEBOX 3",
    category: "Cinéma & Séries",
    logo: "/orange-tv-logo.svg",
    id: "vavoo-orange-francebox-3"
  },
  {
    name: "ORANGE FRANCEBOX 4",
    category: "Cinéma & Séries",
    logo: "/orange-tv-logo.svg",
    id: "vavoo-orange-francebox-4"
  },
  {
    name: "ORANGE FRANCEBOX 5",
    category: "Cinéma & Séries",
    logo: "/orange-tv-logo.svg",
    id: "vavoo-orange-francebox-5"
  },
  {
    name: "CANAL+ BOX OFFICE",
    category: "Cinéma & Séries",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/canal-plus-box-office-fr.png",
    id: "vavoo-canalplus-box-office"
  },
  {
    name: "AMAZON PRIME 1",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/media/prime-video.png",
    id: "vavoo-amazon-prime-1"
  },
  {
    name: "AMAZON PRIME 2",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/media/prime-video.png",
    id: "vavoo-amazon-prime-2"
  },
  {
    name: "AMAZON PRIME 3",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/media/prime-video.png",
    id: "vavoo-amazon-prime-3"
  },
  {
    name: "AMAZON PRIME 4",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/media/prime-video.png",
    id: "vavoo-amazon-prime-4"
  },
  {
    name: "AMAZON PRIME 5",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/media/prime-video.png",
    id: "vavoo-amazon-prime-5"
  },
  {
    name: "AMAZON PRIME 6",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/media/prime-video.png",
    id: "vavoo-amazon-prime-6"
  },
  {
    name: "AMAZON PRIME 7",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/media/prime-video.png",
    id: "vavoo-amazon-prime-7"
  },
  {
    name: "AMAZON PRIME 8",
    category: "Sport",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/media/prime-video.png",
    id: "vavoo-amazon-prime-8"
  },
  {
    name: "DISNEY+",
    category: "Jeunesse",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/misc/media/disney-plus.png",
    id: "vavoo-disney-plus"
  },
  {
    name: "DISNEY CHANNEL",
    category: "Jeunesse",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/disney-channel-fr.png",
    id: "vavoo-disney-channel"
  },
  {
    name: "DISNEY CHANNEL+1",
    category: "Jeunesse",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/disney-channel-fr.png",
    id: "vavoo-disney-channel-1"
  },
  {
    name: "DISNEY CINEMA",
    category: "Cinéma & Séries",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-kingdom/obsolete/sky-cinema-disney-uk.png",
    id: "vavoo-disney-cinema"
  },
  {
    name: "DISNEY JUNIOR",
    category: "Jeunesse",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/disney-jr-fr.png",
    id: "vavoo-disney-junior"
  },
  {
    name: "DISNEY XD",
    category: "Jeunesse",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-states/disney-xd-us.png",
    id: "vavoo-disney-xd"
  },
  {
    name: "TIPIK",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/belgium/tipik-be.png",
    id: "vavoo-tipik"
  },
  {
    name: "La Trois",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/belgium/la-trois-be.png",
    id: "vavoo-la-trois"
  },
  {
    name: "W9",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/w9-fr.png",
    id: "vavoo-w9"
  },
  {
    name: "C8",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/c8-fr.png",
    id: "vavoo-c8"
  },
  {
    name: "France 4",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-4-fr.png",
    id: "vavoo-france-4"
  },
  {
    name: "France 5",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/france-5-fr.png",
    id: "vavoo-france-5"
  },
  {
    name: "BFM TV",
    category: "Information",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/bfmtv-fr.png",
    id: "vavoo-bfmtv"
  },
  {
    name: "CNews",
    category: "Information",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/cnews-fr.png",
    id: "vavoo-cnews"
  },
  {
    name: "LCI",
    category: "Information",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/lci-fr.png",
    id: "vavoo-lci"
  },
  {
    name: "L'Équipe",
    category: "Généralistes",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e9/L_Equipe_Logo.svg",
    id: "vavoo-lequipe"
  },
  {
    name: "Chérie 25",
    category: "Généralistes",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/cherie-25-fr.png",
    id: "vavoo-cherie25"
  },
  {
    name: "LCP",
    category: "Information",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/lcp-fr.png",
    id: "vavoo-lcp"
  },
  {
    name: "Franceinfo",
    category: "Information",
    logo: "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/franceinfo-fr.png",
    id: "vavoo-franceinfo"
  }
];

function getPingPayload() {
  const currentTimestamp = Date.now();
  return {
    reason: 'app-focus',
    locale: 'fr',
    theme: 'dark',
    metadata: {
      device: { type: 'desktop', uniqueId: `node-${currentTimestamp}` },
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
    firstAppStart: currentTimestamp,
    lastAppStart: currentTimestamp,
    ipLocation: null,
    adblockEnabled: true,
    proxy: { supported: ['ss'], engine: 'Mu', enabled: false, autoServer: true },
    iap: { supported: false }
  };
}

function normalizeName(name) {
  if (!name) return '';
  let str = String(name)
    .toLowerCase()
    .normalize('NFD')                     // Split letter from its accent
    .replace(/[\u0300-\u036f]/g, '');      // Strip accent marks

  // Replace 'canal+' or 'canal +' with 'canalplus'
  str = str.replace(/canal\s*\+/gi, 'canalplus');

  // Strip Vavoo sender suffixes like ' .c', ' .s', ' .b', ' .d' (usually a dot or space followed by a single letter b/c/s/d/o at the end of string or before another word boundary)
  str = str.replace(/\s+\.?[bcsd]\b/gi, ' ');

  // Strip certain words like 'hd', 'fhd', 'ultra hd', '4k', 'sd', 'backup', 'fr', 'french', 'shls', 'prod', 'dub', 'ch', 'tv', 'de', 'live'
  str = str.replace(/\b(hd|fhd|4k|sd|uhd|backup|fr|french|shls|prod|dub|ch|tv|de|live)\b/gi, '');

  // Remove all non-alphanumeric characters
  str = str.replace(/[^a-z0-9]/gi, '');

  return str.trim();
}

function areChannelsMatching(vcNorm, dbNorm) {
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
}

async function run() {
  try {
    console.log('Loading database...');
    if (!fs.existsSync(DB_PATH)) {
      console.log('No db.json found!');
      return;
    }
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let channels = db.channels || [];
    console.log(`Initial channels count in db.json: ${channels.length}`);

    // Ensure our target channels exist in db.json
    let addedCount = 0;
    for (const target of TARGET_CHANNELS_TO_ENSURE) {
      const normTarget = normalizeName(target.name);
      
      const exists = channels.some(c => {
        const normC = normalizeName(c.name);
        return normC === normTarget;
      });

      if (!exists) {
        const newChan = {
          id: target.id,
          name: target.name,
          logo: target.logo,
          category: target.category,
          url: "", // will be populated by VAVOO
          status: "online",
          viewCount: 0,
          lastPlayed: new Date().toISOString(),
          country: "France",
          language: "Français",
          responseTime: 100,
          format: "HLS (.m3u8)",
          quality: "HD",
          backupUrls: []
        };
        channels.push(newChan);
        addedCount++;
        console.log(`Added missing target channel template: ${target.name}`);
      }
    }
    console.log(`Registered ${addedCount} missing target channels to db.json.`);

    console.log('Obtaining VAVOO signature...');
    const pingRes = await axios.post('https://www.vavoo.tv/api/app/ping', getPingPayload());
    const signature = pingRes.data?.addonSig;
    if (!signature) {
      console.error('Could not obtain signature!');
      return;
    }

    console.log('Loading entire VAVOO IPTV catalog...');
    const catalogUrl = 'https://vavoo.to/mediahubmx-catalog.json';
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'mediahubmx-signature': signature,
      'user-agent': 'MediaHubMX/2',
      'accept': '*/*',
      'Accept-Language': 'fr',
      'Connection': 'close'
    };

    let cursor = null;
    let pageCount = 0;
    const vavooChannels = [];

    while (true) {
      pageCount++;
      const catRes = await axios.post(catalogUrl, {
        language: 'fr',
        region: 'US',
        catalogId: 'iptv',
        id: 'iptv',
        adult: false,
        search: '',
        sort: '',
        filter: {},
        cursor,
        clientVersion: '3.0.2'
      }, { headers, timeout: 15000 });

      const items = catRes.data?.items || [];
      if (items.length === 0) break;

      for (const item of items) {
        if (item.type === 'iptv' && item.url) {
          const grp = String(item.group || '').toLowerCase();
          if (grp.includes('france') || grp.includes('french')) {
            vavooChannels.push(item);
          }
        }
      }

      const nextCursor = catRes.data?.nextCursor;
      if (!nextCursor) break;
      cursor = nextCursor;
      if (pageCount >= 40) break;
    }

    console.log(`Loaded ${vavooChannels.length} France channels from VAVOO.`);

    // Match and update URLs/backupUrls
    let matchedCount = 0;
    for (const channel of channels) {
      const dbNorm = normalizeName(channel.name);
      if (!dbNorm) continue;

      // Find VAVOO matches
      const matches = vavooChannels.filter(vc => {
        const vcNorm = normalizeName(vc.name);
        return areChannelsMatching(vcNorm, dbNorm);
      });

      if (matches.length > 0) {
        // Sort matches to prioritize FHD / HD
        matches.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          if (aName.includes('fhd') && !bName.includes('fhd')) return -1;
          if (!aName.includes('fhd') && bName.includes('fhd')) return 1;
          if (aName.includes('hd') && !bName.includes('hd')) return -1;
          if (!aName.includes('hd') && bName.includes('hd')) return 1;
          return 0;
        });

        // Map them to proxy VAVOO URLs
        const vavooProxyUrls = matches.map(m => `/api/proxy/vavoo?url=${encodeURIComponent(m.url)}`);

        // Set dominant VAVOO URL as primary stream url so that is completely working!
        channel.url = vavooProxyUrls[0];
        channel.status = "online";
        channel.responseTime = 120;
        channel.quality = matches[0].name.toUpperCase().includes('FHD') ? 'FHD' : 'HD';
        channel.lastCheck = new Date().toISOString();

        // Populate backupUrls safely (all other copies)
        channel.backupUrls = channel.backupUrls || [];
        // Filter out old or redundant vavoo urls
        channel.backupUrls = channel.backupUrls.filter(url => !url.includes('/api/proxy/vavoo'));
        
        // Add backup vavoo channels
        if (vavooProxyUrls.length > 1) {
          channel.backupUrls.unshift(...vavooProxyUrls.slice(1));
        }

        matchedCount++;
        console.log(`Matched "${channel.name}" (${channel.id}) -> Set primary VAVOO stream + added ${vavooProxyUrls.length - 1} backup sources.`);
      }
    }

    console.log(`\nSuccessfully matched and updated ${matchedCount} / ${channels.length} channels with direct VAVOO URLs!`);

    db.channels = channels;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log('Database written back to db.json');

  } catch(e) {
    console.error('Error in VAVOO builder:', e.message);
  }
}

run();
