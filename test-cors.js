import axios from 'axios';
axios.get('https://cdn11.zohanayaan.com:1686/hls/wsmkmlfeed01.m3u8?md5=pRZJj3B9Eir0pv-Czo9R2A&expires=1781898278', {
    headers: { 'Origin': 'http://localhost:3000', 'Referer': '' }
})
.then(res => console.log(res.status))
.catch(err => console.log(err.response?.status));
