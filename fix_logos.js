import fs from 'fs';

const filesToUpdate = [
  'src/components/AdminPanel.tsx',
  'src/components/VideoPlayer.tsx',
  'src/components/EPGGuide.tsx',
  'src/components/HomePremium.tsx',
  'src/components/ChannelGrid.tsx',
  'src/App.tsx'
];

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/src=\{channel\.logo\}/g, 'src={channel.logo || undefined}');
    content = content.replace(/src=\{ch\.logo\}/g, 'src={ch.logo || undefined}');
    content = content.replace(/src=\{showChannelActions\.channel\.logo\}/g, 'src={showChannelActions.channel.logo || undefined}');
    fs.writeFileSync(file, content);
  }
}
