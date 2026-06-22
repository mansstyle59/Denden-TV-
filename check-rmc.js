import axios from 'axios';

async function checkRMC() {
  const feeds = ['ufeed17', 'ufeed18'];
  for (const feed of feeds) {
    try {
      const res = await axios.get(`https://hoca8.com/footy.php?player=desktop&live=${feed}`, {
        headers: {
          'Referer': 'https://cartelive.club/'
        }
      });
      console.log(`Feed: ${feed} contains RMC? ${res.data.includes('RMC') || res.data.includes('sport')}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}
checkRMC();
