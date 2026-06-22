const fs = require('fs');

const html = fs.readFileSync('tv-prog.html', 'utf-8');
const programs = {};

const articles = html.split(/<article class="tvp-tv-direct-card-item">/);
articles.shift(); // remove everything before the first article

for (const doc of articles) {
  const channelMatch = doc.match(/<img[^>]+alt="Logo ([^"]+)"/);
  if (!channelMatch) continue;
  const channelName = channelMatch[1].trim();

  const titleMatch = doc.match(/<h2 class="tvp_chapitre">([^<]+)<\/h2>/);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const imageMatch = doc.match(/<img([^>]*)>/g);
  let image = null;
  if (imageMatch) {
    for (const img of imageMatch) {
      if (img.includes('tvp-tv-direct-card-image')) {
        const srcMatch = img.match(/src="([^"]+)"/);
        if (srcMatch) image = srcMatch[1];
      }
    }
  }

  const progressMatch = doc.match(/<progress[^>]+value="([^"]+)"/);
  const progress = progressMatch ? parseFloat(progressMatch[1]) : 0;

  const timeMatch = doc.match(/<time class="tvp-tv-direct-card-time-start"[^>]*>([^<]+)<\/time>/);
  const time = timeMatch ? timeMatch[1].trim() : '';

  programs[channelName] = { title, image, progress, time };
}

console.log(Object.keys(programs).length, "programs found");
console.log("Keys:", Object.keys(programs));
