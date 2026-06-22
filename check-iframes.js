import axios from 'axios';

const urls = [
  'https://cartelive.club/player/2/1',
  'https://cartelive.club/player/2/2',
  'https://cartelive.club/player/2/3'
];

async function check() {
  for (const url of urls) {
    try {
      const res = await axios.get(url);
      const match = res.data.match(/src="([^"]+hoca8\.com[^"]+)"/);
      console.log(`URL: ${url} -> Iframe: ${match ? match[1] : 'Not found'}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}
check();
