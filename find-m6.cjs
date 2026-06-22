const axios = require('axios');

async function findM6() {
  const VAVOO_URL = 'https://www2.vavoo.to/live2/index?p=vavoo&token=';
  try {
    console.log('Fetching Vavoo channels...');
    const response = await axios.get(VAVOO_URL);
    const channels = response.data;
    const m6Channels = channels.filter(c => c.name && c.name.toUpperCase().includes('M6'));
    console.log(JSON.stringify(m6Channels, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

findM6();
