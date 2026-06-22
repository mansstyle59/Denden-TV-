import axios from 'axios';
axios.get('https://huhu.to/')
  .then(res => {
    console.log(res.data.substring(0, 500));
  })
  .catch(console.error);
