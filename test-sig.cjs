const axios = require('axios');

async function testSig() {
  try {
    const res = await axios.get('https://www.vavoo.to/vavoo/config', {
        headers: { 'user-agent': 'VAVOO/2.6' }
    });
    console.log('Signature:', res.data?.signature);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

testSig();
