const fs = require('fs');
const html = fs.readFileSync('scores.html', 'utf8');

const matches = html.split('<tr class="match">').slice(1);
matches.slice(0, 10).forEach(m => {
    const teams = m.match(/<span class="team">([^<]+)<\/span>/g);
    if (teams && teams.length >= 2) {
        console.log(`${teams[0].replace(/<[^>]+>/g, '')} vs ${teams[1].replace(/<[^>]+>/g, '')}`);
    }
});
