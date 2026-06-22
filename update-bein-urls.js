import fs from 'fs';
try {
  let data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  let changed = false;
  data.channels.forEach(c => {
    if (c.name === 'Bein Sport 1' && !c.url.includes('feed=ufeed01')) {
      c.url = '/api/proxy/cartelive?feed=ufeed01';
      changed = true;
    }
  });
  if (changed) fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
} catch(e) {}
