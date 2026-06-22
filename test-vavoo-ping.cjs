const axios = require('axios');

async function testPing() {
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
        console.log('Testing VAVOO ping...');
        const response = await axios.post('https://www.vavoo.tv/api/app/ping', payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        console.log('Success!', response.status);
        console.log('Signature:', response.data?.addonSig);
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data));
        }
    }
}

testPing();
