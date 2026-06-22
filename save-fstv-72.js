import axios from 'axios';
import fs from 'fs';

async function test() {
  try {
    const res = await axios.get('https://fstv.rest/index.php?newsid=72');
    fs.writeFileSync('fstv-72.html', res.data);
    console.log('Saved to fstv-72.html');
  } catch (err) {
    console.error(err.message);
  }
}
test();
