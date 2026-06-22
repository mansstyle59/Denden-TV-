import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://fstv.rest/live.php?q=1&sources=' + encodeURIComponent('Ciné+ Family'), {
      headers: { 'Referer': 'https://fstv.rest/' }
    });
    console.log(res.data);
  } catch (err) {
    if (err.response) {
      console.log('Status:', err.response.status, err.response.data);
    } else console.error(err.message);
  }
}
test();
