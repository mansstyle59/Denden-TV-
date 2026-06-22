import axios from 'axios';
axios.get('https://cdn11.zohanayaan.com:1686/hls/wsmkmlfeed01.m3u8?md5=pRZJj3B9Eir0pv-Czo9R2A&expires=1781898278', {
    headers: { 'Referer': 'https://hoca8.com/' }
})
.then(res => console.log(res.data.slice(0, 100)))
.catch(err => console.error(err.message));
