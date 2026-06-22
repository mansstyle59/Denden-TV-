import axios from 'axios';

async function test() {
  const path = '/live.php?ch=vavoo_CINE%2B%20FAMIZ%20FHD%7Cgroup%3Afr';
  try {
    const m3u8Res = await axios.get(`https://fstv.rest${path}`, {
      headers: { 'Referer': `https://fstv.rest/index.php?newsid=72` },
      maxRedirects: 0
    });
    console.log('M3u8:', m3u8Res.data);
  } catch (err) {
    if (err.response) {
       console.log('Status:', err.response.status);
       console.log('Headers:', err.response.headers);
       console.log('Data:', err.response.data);
    } else {
       console.error(err.message);
    }
  }
}
test();
