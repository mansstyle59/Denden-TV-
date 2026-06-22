import axios from 'axios';

async function testSegment() {
  const url = 'https://cdn15.zohanayaan.com:1686/hls/wsmkmlfeed01-8368.ts';
  try {
    const res = await axios.get(url, {
      headers: {
        'Referer': 'https://hoca8.com/'
      }
    });
    console.log('Status without tokens:', res.status);
  } catch (e) {
    console.log('Error without tokens:', e.response?.status || e.message);
  }
}
testSegment();
