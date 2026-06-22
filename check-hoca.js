import axios from 'axios';

async function checkHoca() {
  try {
    const res = await axios.get('https://hoca8.com/footy.php?player=desktop&live=ufeed01', {
      headers: {
        'Referer': 'https://cartelive.club/'
      }
    });
    console.log(res.data);
  } catch (e) {
    console.error(e.message);
  }
}
checkHoca();
