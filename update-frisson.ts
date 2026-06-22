import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const frissonIndex = db.channels.findIndex((c: any) => c.name === "Ciné+ Frisson");
if (frissonIndex > -1) {
  // Let's use the .b version as the primary, as .s might be having issues.
  db.channels[frissonIndex].url = "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F39202609374011e03db8d9"; // CINE+ FRISSON FHD .b
  db.channels[frissonIndex].backupUrls = [
    "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F1649216218f2fbdc734689", // CINE+ FRISSON (BACKUP) .s
    "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F3654122461b46665c82b8f", // CINE+ FRISSON .c
    "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F336074375a15a0dca0457", // CINE FRISSON HD .b
    "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F4419846843b1345797858"  // old primary
  ];
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log('Updated Ciné+ Frisson URLs.');
} else {
  console.log('Ciné+ Frisson not found.');
}
