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

async function run() {
  try {
    console.log('Obtaining VAVOO signature...');
    const pingRes = await axios.post('https://www.vavoo.tv/api/app/ping', getPingPayload());
    const signature = pingRes.data?.addonSig;
    if (!signature) {
      console.error('Could not obtain signature!');
      return;
    }

    console.log('Loading VAVOO IPTV catalog for France...');
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
          const name = String(item.name || '').toLowerCase();
          if (
            grp.includes('france') || grp.includes('french') || 
            grp.includes('belg') || grp.includes('swit') || grp.includes('ch ') ||
            name.includes('be ciné') || name.includes('be cine') || name.includes('betv') || name.includes('be 1')
          ) {
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
    
    // Group and print unique channel names
    const uniqueNames = new Set();
    for (const item of vavooChannels) {
      uniqueNames.add(item.name);
    }
    
    console.log('\n--- Sample Vavoo French Channel Names ---');
    const sortedNames = Array.from(uniqueNames).sort();
    
    // Let's filter names containing "be" but exclude bein, berbere, bet, beyblade
    const filtered = sortedNames.filter(name => {
      const n = name.toLowerCase();
      if (!n.includes('be')) return false;
      if (n.includes('bein')) return false;
      if (n.includes('berber')) return false;
      if (n.includes('bet')) return false;
      if (n.includes('beyblade')) return false;
      return true;
    });
    
    console.log(`Found ${filtered.length} interesting "be" terms:`, filtered);
    
    // Find URLs corresponding to interesting terms
    const matchedItems = vavooChannels.filter(item => {
      const n = item.name.toLowerCase();
      if (!n.includes('be')) return false;
      if (n.includes('bein')) return false;
      if (n.includes('berber')) return false;
      if (n.includes('bet')) return false;
      if (n.includes('beyblade')) return false;
      return true;
    });
    matchedItems.forEach((item, idx) => {
        console.log(`[${idx}] ${item.name} (${item.group}): ${item.url}`);
    });

  } catch(e) {
    console.error('Error listing channels:', e.message);
  }
}

run();
