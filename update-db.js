import fs from 'fs';
const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
const bein = data.channels.find(c => c.name === 'Bein Sport 1');
if (bein) {
  bein.url = '/api/proxy/cartelive';
} else {
  data.channels.push({
    id: 'bein-1-cartelive',
    name: 'Bein Sport 1',
    category: '2',
    url: '/api/proxy/cartelive',
    fallbackUrl: '',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/BeIN_SPORTS_1_-_Logo_2017.svg/1024px-BeIN_SPORTS_1_-_Logo_2017.svg.png',
    status: 'online',
    responseTime: 100,
    format: 'HLS (.m3u8)',
    quality: 'HD'
  });
}
fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
