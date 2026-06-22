import fs from 'fs';

const channelsRaw = `
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=106" alt="Serie Club">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=94" alt="SYFY">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=63" alt="TCM Cinéma">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=78" alt="Canal+ Family">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=76" alt="CANAL+ Cinéma">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=75" alt="CANAL+ SÉRIES">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=74" alt="Ciné+ Classic">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=73" alt="Ciné+ Frisson">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=72" alt="Ciné+ Family">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=71" alt="Ciné+ Emotion">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=69" alt="Novelas TV">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=67" alt="OCS CITY">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=65" alt="OCS MAX">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=62" alt="Warner TV">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=96" alt="TF1 Séries Films">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=112" alt="Ciné+ Premier">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=113" alt="Ciné+ Club">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=114" alt="Polar+">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=115" alt="Canal+ Grand Écran">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=123" alt="Canal+ Box Office">
	<a class="short-poster img-box with-mask" href="https://fstv.rest/index.php?newsid=125" alt="Disney Cinema">
`;

try {
  let data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  let changed = false;

  const regex = /newsid=(\d+)" alt="(.*?)"/g;
  let match;
  while ((match = regex.exec(channelsRaw)) !== null) {
    const newsid = match[1];
    const name = match[2].trim();
    
    if (!data.channels.some(c => c.name === name || c.id === 'fstv-' + newsid)) {
        data.channels.push({
            id: 'fstv-' + newsid,
            name: name,
            category: '1', // General / Cinema
            url: '/api/proxy/fstv?newsid=' + newsid,
            fallbackUrl: '',
            logo: '', // We could fetch logos but keep it simple
            status: 'online',
            responseTime: 100,
            format: 'HLS (.m3u8)',
            quality: 'HD'
        });
        changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
    console.log('Updated db.json');
  } else {
    console.log('No new channels found');
  }
} catch(e) {
    console.error(e);
}
