import fs from 'fs';
try {
  let data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  let changed = false;
  
  const cineFrissonName = 'Ciné + Frisson';
  if (!data.channels.some(c => c.name === cineFrissonName)) {
    data.channels.push({
      id: 'cine-frisson-fstv',
      name: cineFrissonName,
      category: '1', // General / Cinema
      url: '/api/proxy/fstv?newsid=73',
      fallbackUrl: '',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Cin%C3%A9%2B_Frisson_Logo_2011.svg/1200px-Cin%C3%A9%2B_Frisson_Logo_2011.svg.png',
      status: 'online',
      responseTime: 100,
      format: 'HLS (.m3u8)',
      quality: 'HD'
    });
    changed = true;
  }
  
  if (changed) fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
} catch(e) {}
