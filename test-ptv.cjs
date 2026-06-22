const axios = require('axios');
async function test() {
  const response = await axios.get('https://tv-programme.com/tv-direct');
  const html = response.data;
  const articles = html.split(/<article class="tvp-tv-direct-card-item">/);
  for(const doc of articles) {
    const match = doc.match(/<img[^>]+alt="Logo([^"]+)"/i);
    if(match && match[1].toLowerCase().includes('ciné')) {
      console.log(match[1].trim());
    }
  }
}
test();
