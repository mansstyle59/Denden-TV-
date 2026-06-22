
import fs from 'fs';
import path from 'path';

const m3u8Path = path.join(process.cwd(), 'public', 'plutotv_fr.m3u8');
const outputPath = path.join(process.cwd(), 'src', 'plutoChannels.ts');

const content = fs.readFileSync(m3u8Path, 'utf8');
const lines = content.split('\n');

const channels = [];

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('#EXTINF')) {
    const extinf = lines[i];
    const url = lines[i + 1];
    
    // Regex to extract info
    const idMatch = extinf.match(/tvg-id="([^"]+)"/);
    const logoMatch = extinf.match(/tvg-logo="([^"]+)"/);
    const categoryMatch = extinf.match(/group-title="([^"]+)"/);
    const nameMatch = extinf.match(/, (.+)$/);
    
    const id = idMatch ? idMatch[1] : '';
    const name = nameMatch ? nameMatch[1] : '';
    const logo = logoMatch ? logoMatch[1] : '';
    const category = categoryMatch ? categoryMatch[1] : '';
    
    if (id && url) {
      channels.push({
        id,
        name,
        logo,
        category,
        url,
        isEnabled: true
      });
    }
    i++; // Skip the URL line
  }
}

const fileContent = `import { Channel } from './types';

export const PLUTO_CHANNELS: Channel[] = ${JSON.stringify(channels, null, 2)};
`;

fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log('Successfully updated', channels.length, 'French channels in src/plutoChannels.ts');
