import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// Update Ciné+ Frisson logo to the official new one
const frissonIndex = db.channels.findIndex(c => c.name.toLowerCase() === 'ciné+ frisson');
if (frissonIndex > -1) {
  db.channels[frissonIndex].logo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Cine%2B_Frisson_2024.png/800px-Cine%2B_Frisson_2024.png';
}

// Find duplicates (case-insensitive name match)
const uniqueNames = new Map();
const toRemove = [];

for (let i = 0; i < db.channels.length; i++) {
  const chan = db.channels[i];
  const nameKey = chan.name.toLowerCase().trim();
  
  if (uniqueNames.has(nameKey)) {
    const existingIndex = uniqueNames.get(nameKey);
    // Merge backup URLs
    const existingChan = db.channels[existingIndex];
    
    // We prefer the one that has a better logo or specific ID if needed, 
    // but just copy backupUrls over
    const allBackups = new Set([...(existingChan.backupUrls || []), ...(chan.backupUrls || []), chan.url]);
    allBackups.delete(existingChan.url); // Remove primary url from backups
    
    existingChan.backupUrls = Array.from(allBackups);
    
    // Mark current for removal
    toRemove.push(i);
  } else {
    uniqueNames.set(nameKey, i);
  }
}

// Remove duplicates starting from end to avoid index shifting
for (let i = toRemove.length - 1; i >= 0; i--) {
  db.channels.splice(toRemove[i], 1);
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

console.log(`Merged ${toRemove.length} duplicates and updated logos.`);
