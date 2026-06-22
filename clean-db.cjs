const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
const initialCount = db.channels.length;
db.channels = db.channels.filter(ch => !ch.name.includes("ARG:") && !/CANAL \d/.test(ch.name) && !ch.name.includes("PUERTO MADRYN") && !ch.name.includes("SAN JUAN"));
const removedCount = initialCount - db.channels.length;
fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
console.log(`Removed ${removedCount} incorrect channels.`);
