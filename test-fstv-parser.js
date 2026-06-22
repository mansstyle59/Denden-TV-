import axios from 'axios';
import fs from 'fs';

async function test() {
  const html = fs.readFileSync('fstv-72.html', 'utf8');
  
  const paths = [...html.matchAll(/window\.FSTV_SRC\s*=\s*"([^"]+)"/g)];
  let path = paths.find(p => p[1].length > 0)?.[1];
  
  if (path) {
    if (path.includes('ch=')) {
        const nameMatch = html.match(/window\.FSTV_NAME\s*=\s*"([^"]+)"/);
        if (nameMatch && nameMatch[1]) {
            const sourcesRes = await axios.get(`https://fstv.rest/live.php?q=1&sources=${encodeURIComponent(nameMatch[1])}`, {
              headers: { 'Referer': 'https://fstv.rest/' }
            });
            if (sourcesRes.data && sourcesRes.data.length > 0) {
              const bestSource = sourcesRes.data.find((s) => s.q === 'FHD' || s.q === 'HD') || sourcesRes.data[0];
              path = `/live.php?id=${bestSource.id}`;
            }
        }
    }
    console.log('Final path:', path);
    // Fetch
    const m3u8Res = await axios.get(`https://fstv.rest${path}`, {
        headers: { 'Referer': `https://fstv.rest/index.php?newsid=72` }
    });
    console.log('M3u8 ok, lengths:', m3u8Res.data.length);
  }
}
test();
