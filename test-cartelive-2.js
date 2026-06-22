import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://cartelive.club/player/2/2');
    console.log(res.data);
  } catch (err) {
    console.error(err.message);
  }
}
test();
