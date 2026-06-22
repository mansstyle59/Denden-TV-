const axios = require('axios');

async function scrape() {
  try {
    const response = await axios.get('https://www.programme-tv.net/programme/en-ce-moment.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = response.data;
    
    const rows = html.split(/<div\s+class="gridRow-cards[^"]*">/);
    rows.shift();
    let count = 0;
    for (const row of rows) {
      if (count++ > 5) break;
      const altMatch = row.match(/alt="([^"]+)"/);
      const imageMatch = row.match(/<img[^>]+src="([^"]+)"[^>]+class="pictureTagGenerator-image"/i) ||
                         row.match(/<img[^>]+src="([^"]+)"[^>]*alt="[^"]*"[^>]*class="[^"]*apply-ratio"/i);
      console.log(altMatch ? altMatch[1] : 'null', '=>', imageMatch ? imageMatch[1] : 'null');
    }
  } catch(e) {
    console.error(e.message);
  }
}
scrape();
