import axios from 'axios';
axios.get('https://hoca8.com/footy.php?player=desktop&live=ufeed01',{headers:{referer:'https://cartelive.club/'}})
  .then(res => {
    console.log(res.data);
  })
  .catch(console.error);
