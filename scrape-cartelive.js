import axios from 'axios';
axios.get('https://cartelive.club/player/2/1')
  .then(res => {
    console.log(res.data);
  })
  .catch(console.error);
