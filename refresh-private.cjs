const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'db.json');

async function fetchAdultos2() {
  const M3U_URL = 'https://raw.githubusercontent.com/WMF2020/IPTV/master/ADULTOS2';
  try {
    console.log(`Fetching from ${M3U_URL}...`);
    const response = await axios.get(M3U_URL);
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
          id: 'xxx-adultos2-' + Math.random().toString(36).substr(2, 9),
          name,
          logo,
          category: 'Adultes',
          status: 'online',
          isPrivate: true,
          country: group || 'Adultes'
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
    console.error('Error fetching ADULTOS2:', err.message);
    return [];
  }
}

async function fetchIptvOrgAdults() {
  const M3U_URL = 'https://iptv-org.github.io/iptv/categories/xxx.m3u';
  try {
    console.log(`Fetching from ${M3U_URL}...`);
    const response = await axios.get(M3U_URL);
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
          id: 'xxx-iptvorg-' + Math.random().toString(36).substr(2, 9),
          name,
          logo,
          category: 'Adultes',
          status: 'online',
          isPrivate: true,
          country: group || 'Adultes'
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
    console.error('Error fetching iptv-org Adults:', err.message);
    return [];
  }
}

async function fetchVavooAdults() {
  const VAVOO_URL = 'https://www2.vavoo.to/live2/index?p=vavoo&token=';
  try {
    console.log('Fetching Vavoo Adults...');
    const response = await axios.get(VAVOO_URL);
    let allChannels = response.data;
    if (!Array.isArray(allChannels)) return [];

    const adultChannels = allChannels.filter(c => {
      const g = (c.group || '').toUpperCase();
      const n = (c.name || '').toUpperCase();
      return g.includes('ADULT') || g.includes('XXX') || g.includes('EROTIK') || g.includes('VAVOO-CH') ||
             n.includes('XXX') || n.includes('HUSTLER') || n.includes('PENTHOUSE') || n.includes('PLAYBOY');
    }).map(c => ({
      id: 'vavoo-' + (c.id || Math.random().toString(36).substr(2, 9)),
      name: c.name,
      logo: c.logo || '',
      category: 'Adultes',
      url: `/api/proxy/vavoo?url=${encodeURIComponent(c.url)}`,
      status: 'online',
      isPrivate: true,
      country: c.group || 'VAVOO'
    }));
    return adultChannels;
  } catch (err) {
    console.error('Error fetching Vavoo:', err.message);
    return [];
  }
}

async function run() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  db.channels = db.channels.filter(c => !c.isPrivate);
  
  const adultos2 = await fetchAdultos2();
  const iptvorg = await fetchIptvOrgAdults();
  const vavoo = await fetchVavooAdults();
  
  const allPrivate = [...adultos2, ...iptvorg, ...vavoo];
  console.log(`Fetched total ${allPrivate.length} private channels.`);
  
  if (allPrivate.length > 0) {
    db.channels.push(...allPrivate);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log('Database updated.');
  }
}

run();
