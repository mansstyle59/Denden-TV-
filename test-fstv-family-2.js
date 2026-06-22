import axios from 'axios';
import fs from 'fs';

async function testConfig() {
  try {
    const html = fs.readFileSync('fstv-72.html', 'utf8');
    const match = html.match(/window\.FSTV_SRC="(\/live\.php[^"]+)"/);
    if (match && match[1]) {
      const path = match[1];
      console.log('Path:', path);
      
      const m3u8Res = await axios.get(`https://fstv.rest${path}`, {
        headers: { 'Referer': `https://fstv.rest/index.php?newsid=72` }
      });
      console.log('M3u8:\n', m3u8Res.data.substring(0, 500));
    } else {
        console.log('No FSTV_SRC matched.');
    }
  } catch (e) {
    console.error(e.message);
  }
}
testConfig();
