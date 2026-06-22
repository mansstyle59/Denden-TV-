import axios from 'axios';

async function checkM3U8() {
  const url = 'https://cdn15.zohanayaan.com:1686/hls/wsmkmlfeed01.m3u8?md5=d3anW9hF8yhvOTcyA1TWaw&expires=1781922445';
  try {
    const res = await axios.get(url, {
      headers: {
        'Referer': 'https://hoca8.com/'
      }
    });
    console.log(res.data);
  } catch (e) {
    console.error(e.message);
  }
}
checkM3U8();
