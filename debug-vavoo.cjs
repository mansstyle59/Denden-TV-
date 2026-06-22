const axios = require('axios');

async function debugVavoo() {
  const VAVOO_URL = 'https://www2.vavoo.to/live2/index?p=vavoo&token=';
  try {
    const res = await axios.get(VAVOO_URL);
    const data = res.data;
    if (!Array.isArray(data)) {
      console.log('Not an array');
      return;
    }
    const groups = new Set(data.map(c => c.group));
    console.log('Groups found:', Array.from(groups).join(', '));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

debugVavoo();
