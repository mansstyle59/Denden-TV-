const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'db.json');

async function fetchM3U(url, prefix) {
  try {
    console.log(`Fetching from ${url}...`);
    const response = await axios.get(url);
    const content = response.data;
    const lines = content.split('\n');

    const channels = [];
    let currentChannel = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('#EXTINF:')) {
        const commaIndex = trimmedLine.lastIndexOf(',');
        const name = commaIndex !== -1 ? trimmedLine.substring(commaIndex + 1).trim() : 'Unknown';
        
        let logo = '';
        const logoMatch = trimmedLine.match(/tvg-logo="([^"]+)"/);
        if (logoMatch) logo = logoMatch[1];

        let group = '';
        const groupMatch = trimmedLine.match(/group-title="([^"]+)"/);
        if (groupMatch) group = groupMatch[1];

        currentChannel = {
          id: prefix + '-' + Math.random().toString(36).substr(2, 9),
          name,
          logo,
          category: 'Adulte',
          status: 'online',
          isPrivate: true,
          country: group || 'Adulte'
        };
      } else if (trimmedLine && !trimmedLine.startsWith('#')) {
        if (currentChannel) {
          currentChannel.url = trimmedLine;
          channels.push(currentChannel);
          currentChannel = null;
        }
      }
    }
    return channels;
  } catch (err) {
    console.error(`Error fetching ${url}:`, err.message);
    return [];
  }
}

async function run() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  
  // Remove all existing private channels AND any manual adult channels
  db.channels = db.channels.filter(c => 
    !c.isPrivate && 
    !c.name.toLowerCase().includes('xxx') &&
    !c.name.toLowerCase().includes('adult')
  );
  
  console.log('Database updated: all XXX/adult channels removed.');
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

run();
