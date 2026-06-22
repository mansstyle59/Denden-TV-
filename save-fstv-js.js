import axios from 'axios';
import fs from 'fs';

async function test() {
  try {
    const res = await axios.get('https://fstv.rest/templates/french-live/js/fstv-player.js?v=13');
    fs.writeFileSync('fstv-player.js', res.data);
    console.log('Saved to fstv-player.js');
  } catch (err) {
    console.error(err.message);
  }
}
test();
