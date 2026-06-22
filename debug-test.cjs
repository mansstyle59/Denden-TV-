const axios = require('axios');

async function test() {
  const url = 'http://38.91.107.130:8080/CH-1/index.m3u8'; // Example
  try {
    const res = await axios.get(url, { timeout: 10000 });
    console.log('Success:', res.status);
  } catch (err) {
    console.log('Error:', err.message);
    if (err.response) console.log('Status:', err.response.status);
  }
}

test();
