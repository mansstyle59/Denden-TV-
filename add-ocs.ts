import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const channelsToAdd = [
  {
    id: "fstv-ocs-max",
    name: "OCS Max",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/37/OCS_2024.svg",
    category: "Cinéma & Séries",
    url: "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F2561627199a0669a101b1e",
    status: "online",
    viewCount: 0,
    lastPlayed: new Date().toISOString(),
    country: "France",
    language: "Français",
    responseTime: 120,
    format: "Inconnu",
    quality: "FHD",
    lastCheck: new Date().toISOString(),
    backupUrls: [
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F151053255430b682f860", // HD
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F42064702927b26fcd04aa", // .s
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F636734800c64cceb42cf"  // .c
    ]
  },
  {
    id: "fstv-ocs-city",
    name: "OCS City",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/37/OCS_2024.svg",
    category: "Cinéma & Séries",
    url: "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F16821288295ca040e30e9d",
    status: "online",
    viewCount: 0,
    lastPlayed: new Date().toISOString(),
    country: "France",
    language: "Français",
    responseTime: 120,
    format: "Inconnu",
    quality: "HD",
    lastCheck: new Date().toISOString(),
    backupUrls: [
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F191621715269241a8f3a34", // .b
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F33703203809f0bf2cb5472", // .c
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F32165406387bf6d528994"  // .s
    ]
  },
  {
    id: "fstv-ocs-choc",
    name: "OCS Choc",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/37/OCS_2024.svg",
    category: "Cinéma & Séries",
    url: "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F13407393374bf726974d70",
    status: "online",
    viewCount: 0,
    lastPlayed: new Date().toISOString(),
    country: "France",
    language: "Français",
    responseTime: 120,
    format: "Inconnu",
    quality: "FHD",
    lastCheck: new Date().toISOString(),
    backupUrls: [
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F1215276492f2faf82424fc", // HD
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F41289307848049a8370b8e", // .s
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F7689644035cd50c34c4d1"  // .c
    ]
  },
  {
    id: "fstv-ocs-geants",
    name: "OCS Géants",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/37/OCS_2024.svg",
    category: "Cinéma & Séries",
    url: "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F146336370435eceaf43e56",
    status: "online",
    viewCount: 0,
    lastPlayed: new Date().toISOString(),
    country: "France",
    language: "Français",
    responseTime: 120,
    format: "Inconnu",
    quality: "FHD",
    lastCheck: new Date().toISOString(),
    backupUrls: [
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F73922229901e8c2feeb4f", // HD
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F14177505627dd342e32501", // .s
      "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F14515894382c3f886d3da3"  // .c
    ]
  },
  {
    id: "fstv-cine-plus-ocs",
    name: "Ciné+ OCS",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Cin%C3%A9%2BOCS_2024.svg",
    category: "Cinéma & Séries",
    url: "/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F1241349700d812a2e9224f",
    status: "online",
    viewCount: 0,
    lastPlayed: new Date().toISOString(),
    country: "France",
    language: "Français",
    responseTime: 120,
    format: "Inconnu",
    quality: "HD",
    lastCheck: new Date().toISOString(),
    backupUrls: []
  }
];

let updated = 0;
for (const chan of channelsToAdd) {
  const existingIndex = db.channels.findIndex((c: any) => c.name === chan.name || c.id === chan.id);
  if (existingIndex > -1) {
    db.channels[existingIndex] = { ...db.channels[existingIndex], ...chan };
    updated++;
  } else {
    // Insert after "Ciné+ Frisson" or at end
    const frissonIndex = db.channels.findIndex((c: any) => c.name.includes("Frisson"));
    if (frissonIndex > -1) {
      db.channels.splice(frissonIndex + 1, 0, chan);
    } else {
      db.channels.push(chan);
    }
    updated++;
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log(`Successfully added/updated ${updated} OCS channels in db.json!`);
