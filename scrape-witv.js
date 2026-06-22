import axios from 'axios';

const channels = [
  { name: 'BeIN Sports 3', url: 'https://witv.team/chaines-live/7-bein-sport-3-fr.html' },
  { name: 'M6', url: 'https://witv.team/chaines-live/33-m6.html' },
  { name: 'W9', url: 'https://witv.team/chaines-live/35-w9.html' },
  { name: 'France 2', url: 'https://witv.team/chaines-live/8-france-2.html' },
  { name: 'France 3', url: 'https://witv.team/chaines-live/9-france-3.html' }
];

async function getStreamUrl(channelUrl) {
  const pageRes = await axios.get(channelUrl);
  const match = pageRes.data.match(/witv-player\.php\?id=(\d+)/);
  if (!match) return null;
  const playerId = match[1];
  
  const playerRes = await axios.get(`https://witv.team/player/playerjs/witv-player.php?id=${playerId}`, {
    headers: { 'Referer': channelUrl }
  });
  const streamMatch = playerRes.data.match(/var streamUrl = "(https:\/\/[^"]+)"/);
  return streamMatch ? streamMatch[1] : null;
}

Promise.all(channels.map(async c => ({ name: c.name, stream: await getStreamUrl(c.url) })))
  .then(console.log)
  .catch(console.error);
