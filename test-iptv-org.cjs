const axios = require('axios');
async function run() {
  const res = await axios.get('https://iptv-org.github.io/iptv/countries/fr.m3u');
  console.log(res.data.substring(0, 1000));
}
run();
