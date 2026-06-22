import axios from 'axios';

const urls = [
  'https://cartelive.club/player/2/1',
  'https://cartelive.club/player/2/2',
  'https://cartelive.club/player/2/3'
];

async function scrape() {
  for (const url of urls) {
    try {
      const res = await axios.get(url);
      const match = res.data.match(/src="([^"]+\.m3u8[^"]*)"/);
      console.log(`URL: ${url}, Found: ${match ? match[1] : 'Not found'}`);
    } catch (e) {
      console.error(`Error for ${url}: ${e.message}`);
    }
  }
}

scrape();
