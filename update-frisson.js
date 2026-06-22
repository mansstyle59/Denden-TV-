import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const channelIndex = db.channels.findIndex(c => c.name === 'Ciné+ Frisson' || c.name === 'Ciné + Frisson');

if (channelIndex > -1) {
  const channel = db.channels[channelIndex];
  
  channel.url = "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F4419846843b1345797858";
  channel.backupUrls = [
    "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F39202609374011e03db8d9",
    "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F3654122461b46665c82b8f",
    "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F336074375a15a0dca0457",
    "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F438122160b886d305d865",
    "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F1649216218f2fbdc734689"
  ];
  
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log('Successfully updated Ciné+ Frisson sources in db.json!');
} else {
  console.log('Could not find Ciné+ Frisson in db.json');
}
