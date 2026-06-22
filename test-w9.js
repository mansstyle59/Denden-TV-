import axios from 'axios';
axios.get('https://witv.team/chaines-live/35-w9.html')
  .then(res => {
    console.log(res.data.match(/witv-player\.php\?id=(\d+)/));
  })
  .catch(console.error);
