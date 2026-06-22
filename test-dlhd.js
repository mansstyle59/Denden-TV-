import axios from 'axios';
axios.get('https://dlhd.pk/watch.php?id=470')
  .then(res => {
    console.log(res.data);
  })
  .catch(console.error);
