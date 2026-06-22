import axios from 'axios';
axios.get('https://cartelive.club/player/2/1')
  .then(res => console.log(res.data.slice(0, 1500)))
  .catch(err => console.error(err.message));
