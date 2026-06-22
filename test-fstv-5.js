import fs from 'fs';
const text = fs.readFileSync('test-fstv-1.out', 'utf8');
const match = text.match(/window\.FSTV_SRC="(\/live\.php[^"]+)"/);
console.log('Match:', match[1]);
