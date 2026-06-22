
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
db.channels.forEach(ch => console.log(ch.name));
