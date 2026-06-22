const axios = require('axios');

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
        return null;
    }
}

async function testResolve(channelUrl) {
    const signature = await getVavooSignature();
    if (!signature) {
        console.log('Failed to get signature');
        return;
    }

    const resolveUrl = 'https://vavoo.to/mediahubmx-resolve.json';
    const payload = {
        language: 'fr',
        region: 'US',
        url: channelUrl,
        clientVersion: '3.0.2'
    };

    try {
        console.log(`Resolving: ${channelUrl}`);
        const res = await axios.post(resolveUrl, payload, {
            headers: {
                'mediahubmx-signature': signature,
                'user-agent': 'MediaHubMX/2'
            },
            timeout: 15000
        });
        console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data));
        }
    }
}

const urlToTest = process.argv[2] || 'https://vavoo.to/vavoo-iptv/play/226410614460a38e6f63e1';
testResolve(urlToTest);
