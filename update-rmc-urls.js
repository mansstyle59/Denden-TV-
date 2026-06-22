import fs from 'fs';
try {
  let data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  let changed = false;
  
  const rmc1Name = 'RMC Sport 1';
  if (!data.channels.some(c => c.name === rmc1Name)) {
    data.channels.push({
      id: 'rmc-1-cartelive',
      name: rmc1Name,
      category: '2', // Sports
      url: '/api/proxy/cartelive?feed=ufeed17',
      fallbackUrl: '',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/RMC_Sport_1_logo.png/1200px-RMC_Sport_1_logo.png',
      status: 'online',
      responseTime: 100,
      format: 'HLS (.m3u8)',
      quality: 'HD'
    });
    changed = true;
  }
  
  if (changed) fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
} catch(e) {}
