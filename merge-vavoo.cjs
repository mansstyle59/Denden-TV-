const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DB_PATH = path.join(process.cwd(), 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

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

async function run() {
  try {
    console.log('Obtaining VAVOO signature...');
    const pingRes = await axios.post('https://www.vavoo.tv/api/app/ping', getPingPayload());
    const signature = pingRes.data?.addonSig;
    if (!signature) throw new Error('Could not obtain signature!');

    console.log('Loading VAVOO IPTV catalog for France...');
    const catalogUrl = 'https://vavoo.to/mediahubmx-catalog.json';
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'mediahubmx-signature': signature,
      'user-agent': 'MediaHubMX/2',
      'Connection': 'close'
    };

    let cursor = null;
    const targets = ['canal', 'ciné +'];
    const newChannels = [];

    while (true) {
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
            const nameLower = item.name.toLowerCase();
            if (targets.some(t => nameLower.includes(t))) {
               // Check if already in db
               if (!db.channels.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                 console.log('Adding:', item.name);
                 newChannels.push({
                   name: item.name,
                   logo: item.logo || '',
                   category: item.group || 'Vavoo',
                   url: `/api/proxy/vavoo?url=${encodeURIComponent(item.url)}`,
                   id: Date.now().toString() + Math.random(),
                   status: 'online',
                   backupUrls: [],
                   format: 'Inconnu',
                   quality: 'FHD',
                   country: 'France'
                 });
               }
            }
          }
        }
      }

      const nextCursor = catRes.data?.nextCursor;
      if (!nextCursor) break;
      cursor = nextCursor;
      if (newChannels.length > 50) break; // Arbitrary limit
    }

    db.channels.push(...newChannels);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log(`Added ${newChannels.length} new channels.`);

  } catch(e) {
    console.error('Error:', e.message);
  }
}

run();
