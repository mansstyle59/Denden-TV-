import fs from 'fs';
import path from 'path';
import axios from 'axios';

const DB_PATH = path.join(process.cwd(), 'db.json');

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
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.\-(+]/g, ' ')
    .replace(/\b(hd|fhd|4k|sd|uhd|backup|fr|french|plus|1|shls|prod|dub)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  try {
    console.log('Loading database...');
    if (!fs.existsSync(DB_PATH)) {
      console.log('No db.json found!');
      return;
    }
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const channels = db.channels || [];
    console.log(`Loaded ${channels.length} channels from db.json`);

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

    // Match and update
    let matchedCount = 0;
    for (const channel of channels) {
      const dbNorm = normalizeName(channel.name);
      if (!dbNorm) continue;

      // Find VAVOO matches
      const matches = vavooChannels.filter(vc => {
        const vcNorm = normalizeName(vc.name);
        return vcNorm === dbNorm || vcNorm.startsWith(dbNorm) || dbNorm.startsWith(vcNorm);
      });

      if (matches.length > 0) {
        // Sort matches to prioritize HD / FHD / FHD+ or whatever
        matches.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          if (aName.includes('fhd') && !bName.includes('fhd')) return -1;
          if (!aName.includes('fhd') && bName.includes('fhd')) return 1;
          if (aName.includes('hd') && !bName.includes('hd')) return -1;
          if (!aName.includes('hd') && bName.includes('hd')) return 1;
          return 0;
        });

        // Initialize backupUrls if they do not exist
        if (!channel.backupUrls) {
          channel.backupUrls = [];
        }

        // Generate VAVOO backup URLs
        const newBackupUrls = matches.map(m => `/api/proxy/vavoo?url=${encodeURIComponent(m.url)}`);
        
        // Remove existing /api/proxy/vavoo urls from existing backupUrls to avoid duplicates
        channel.backupUrls = channel.backupUrls.filter(url => !url.includes('/api/proxy/vavoo'));

        // Push new VAVOO backup Urls at the beginning of backup array or end
        // Let's place them in backupUrls!
        channel.backupUrls.push(...newBackupUrls);
        
        matchedCount++;
        console.log(`Matched "${channel.name}" (${channel.id}) -> added ${newBackupUrls.length} VAVOO backup sources.`);
      }
    }

    console.log(`\nSuccessfully matched ${matchedCount} / ${channels.length} channels with VAVOO!`);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log('Database written back to db.json');

  } catch(e) {
    console.error('Error in updater:', e.message);
  }
}

run();
