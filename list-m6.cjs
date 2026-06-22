const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
const m6Channels = db.channels.filter(c => c.name && c.name.toLowerCase().includes('m6'));
console.log(m6Channels.map(c => ({ name: c.name, url: c.url, id: c.id })));
