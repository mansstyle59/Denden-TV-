import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://fstv.rest/live.php?id=39202609374011e03db8d9-806d5141e4d55a', {
      headers: { 'Referer': 'https://fstv.rest/index.php?newsid=73' }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.message);
  }
}
test();
