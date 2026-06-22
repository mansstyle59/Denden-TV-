import axios from 'axios';

async function test() {
  try {
    const res = await axios.options('https://fstv.rest/live.php?id=39202609374011e03db8d9-806d5141e4d55a', {
      headers: { 'Origin': 'http://localhost:3000' }
    });
    console.log(res.headers);
  } catch (err) {
    console.error(err);
  }
}
test();
