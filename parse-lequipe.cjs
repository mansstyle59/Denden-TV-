const fs = require('fs');
const html = fs.readFileSync('lequipe_direct.html', 'utf8');

// L'Equipe often has JSON in the script tags
const matches = html.match(/"title":"([^"]+)"/g);
if (matches) {
  matches.slice(0, 30).forEach(m => console.log(m));
} else {
  console.log('No titles found');
}
