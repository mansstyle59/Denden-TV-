const axios = require('axios');

async function testPublic() {
  const url = 'https://vavoo.to/live2/play3/2264106144.m3u8'; // M6
  try {
    const res = await axios.get(url, { timeout: 10000 });
    console.log('Success:', res.status);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

testPublic();
