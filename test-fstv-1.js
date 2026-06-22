import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://fstv.rest/index.php?newsid=73');
    console.log(res.data);
  } catch (err) {
    console.error(err.message);
  }
}
test();
