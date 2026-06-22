import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://fstv.rest/index.php?do=cat&category=cinema');
    
    // Attempt to match channel links in the cinema category
    const regex = /<a href="https:\/\/fstv\.rest\/index\.php\?newsid=(\d+)">(.*?)<\/a>/g;
    let match;
    const channels = [];
    while ((match = regex.exec(res.data)) !== null) {
      channels.push({ id: match[1], name: match[2].trim() });
    }
    console.log('Found channels:', channels);

    // Another attempt using just /index.php?newsid=...
    const regex2 = /<a[^>]+href="[^"]*newsid=(\d+)"[^>]*>(.*?)<\/a>/gi;
    let match2;
    const channels2 = [];
    while ((match2 = regex2.exec(res.data)) !== null) {
        channels2.push({ id: match2[1], name: match2[2].replace(/<[^>]+>/g, '').trim() });
    }
    console.log('Found channels alt:', channels2.filter(c => c.name));

  } catch (err) {
    console.error(err.message);
  }
}
test();
