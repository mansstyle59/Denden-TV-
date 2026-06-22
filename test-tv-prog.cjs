const axios = require('axios');
const fs = require('fs');

async function scrape() {
  try {
    const response = await axios.get('https://tv-programme.com/tv-direct', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    fs.writeFileSync('tv-prog.html', response.data);
    console.log("Downloaded successfully.");
  } catch(e) {
    console.error(e.message);
  }
}
scrape();
