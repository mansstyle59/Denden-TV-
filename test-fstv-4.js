import axios from 'axios';

async function testConfig() {
  try {
    const newsid = 73;
    const pageRes = await axios.get(`https://fstv.rest/index.php?newsid=${newsid}`);
    const match = pageRes.data.match(/window\.FSTV_SRC\s*=\s*"(.*?)"/);
    if (match && match[1]) {
      const path = match[1];
      console.log('Path:', path);
      
      const m3u8Res = await axios.get(`https://fstv.rest${path}`, {
        headers: { 'Referer': `https://fstv.rest/index.php?newsid=${newsid}` }
      });
      console.log('M3u8:\n', m3u8Res.data.substring(0, 500));
      
      const lines = m3u8Res.data.split('\n');
      const tsUrlLine = lines.find(l => l.startsWith('https://'));
      if (tsUrlLine) {
        console.log('Fetching TS snippet via direct FSTV proxy:', tsUrlLine);
        const segmentRes = await axios.get(tsUrlLine, {
          responseType: 'arraybuffer',
          headers: { 'Referer': 'https://fstv.rest/' }
        });
        console.log('TS snippet size:', segmentRes.data.length);
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}
testConfig();
