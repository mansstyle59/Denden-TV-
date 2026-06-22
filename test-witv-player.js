import axios from 'axios';
axios.get('https://witv.team/player/playerjs/witv-player.php?id=9', {
  headers: { 'Referer': 'https://witv.team/chaines-live/7-bein-sport-3-fr.html' }
})
  .then(res => {
    console.log(res.data);
  })
  .catch(err => {
    console.error(err);
  });
