import axios from 'axios';
axios.get('http://localhost:3000/api/proxy/cartelive')
.then(res => console.log('success!', res.data.substring(0, 100)))
.catch(err => console.error(err.message));
