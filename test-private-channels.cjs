const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'db.json');

// Mock signature for testing if we can't get one easily
// In a real scenario we'd call getVavooSignature() from server.ts but it's TS and has dependencies
async function getVavooSignature() {
  const now = Date.now();
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

  try {
    const response = await axios.post('https://www.vavoo.tv/api/app/ping', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
    });
    return response.data?.addonSig;
  } catch (err) {
    // Try .to as secondary
    try {
      const response = await axios.post('https://www.vavoo.to/api/app/ping', payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
      });
      return response.data?.addonSig;
    } catch (e) {
      return null;
    }
  }
}

async function checkVavoo(vavooUrl, signature) {
  if (!signature) return true; // Assume okay if we can't test signature now to avoid false deletion
  try {
    const resolveUrl = 'https://vavoo.to/mediahubmx-resolve.json';
    const payload = {
        language: 'fr',
        region: 'US',
        url: vavooUrl,
        clientVersion: '3.0.2'
    };
    const res = await axios.post(resolveUrl, payload, {
      headers: {
        'mediahubmx-signature': signature,
        'user-agent': 'MediaHubMX/2'
      },
      timeout: 10000
    });
    return !!(res.data && (res.data.url || res.data[0]?.url || res.data.streamUrl));
  } catch (err) {
    return false;
  }
}

async function checkUrl(url, signature) {
  if (url.startsWith('/api/proxy/vavoo?url=')) {
    const vavooUrl = decodeURIComponent(url.split('url=')[1]);
    return checkVavoo(vavooUrl, signature);
  }

  let testUrl = url;
  if (url.startsWith('/api/proxy/stream?url=')) {
     testUrl = decodeURIComponent(url.split('url=')[1]);
  }

  if (!testUrl.startsWith('http')) return false;

  try {
    const response = await axios.get(testUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      responseType: 'stream',
      validateStatus: (status) => status < 400
    });
    response.data.destroy();
    return true;
  } catch (err) {
    return false;
  }
}

async function run() {
  if (!fs.existsSync(DB_PATH)) return;

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const privateChannels = db.channels.filter(c => c.isPrivate);
  const otherChannels = db.channels.filter(c => !c.isPrivate);

  console.log(`Validating ${privateChannels.length} private channels...`);
  
  const signature = await getVavooSignature();
  const workingChannels = [];
  const batchSize = 5;
  
  for (let i = 0; i < privateChannels.length; i += batchSize) {
    const batch = privateChannels.slice(i, i + batchSize);
    console.log(`Progress: ${i}/${privateChannels.length}`);
    
    const results = await Promise.all(batch.map(async (c) => {
      const isWorking = await checkUrl(c.url, signature);
      if (!isWorking) console.log(`[HS] ${c.name}`);
      return isWorking ? c : null;
    }));

    workingChannels.push(...results.filter(c => c !== null));
  }

  db.channels = [...otherChannels, ...workingChannels];
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  console.log(`Finished. Total kept: ${workingChannels.length}`);
}

run();

