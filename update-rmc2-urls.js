import fs from 'fs';
try {
  let data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  let changed = false;
  
  const rmc2Name = 'RMC Sport 2';
  if (!data.channels.some(c => c.name === rmc2Name)) {
    data.channels.push({
      id: 'rmc-2-cartelive',
      name: rmc2Name,
      category: '2', // Sports
      url: '/api/proxy/cartelive?feed=ufeed18',
      fallbackUrl: '',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/RMC_Sport_2_logo.png/1200px-RMC_Sport_2_logo.png',
      status: 'online',
      responseTime: 100,
      format: 'HLS (.m3u8)',
      quality: 'HD'
    });
    changed = true;
  }
  
  if (changed) fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
} catch(e) {}
