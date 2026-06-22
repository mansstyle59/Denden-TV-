import axios from 'axios';
import fs from 'fs';

async function test() {
  try {
    const res = await axios.get('https://fstv.rest/index.php?do=cat&category=cinema');
    fs.writeFileSync('fstv-cinema.html', res.data);
    console.log('Saved to fstv-cinema.html');
  } catch (err) {
    console.error(err.message);
  }
}
test();
