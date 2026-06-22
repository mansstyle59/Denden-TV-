
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));

const channelMapping = {
  "TF1": 1,
  "France 2": 2,
  "France 3": 3,
  "France 4": 4,
  "France 5": 5,
  "M6": 6,
  "Arte": 7,
  "LCP": 8,
  "W9": 9,
  "TMC": 10,
  "TFX": 11,
  "Gulli": 12,
  "BFM TV": 13,
  "CNEWS": 14,
  "LCI": 15,
  "Franceinfo": 16,
  "C Star": 17,
  "CMI TV": 18,
  "OFTV": 19,
  "TF1 Séries Films": 20,
  "L'Equipe": 21,
  "6ter": 22,
  "RMC Story": 23,
  "RMC Découverte": 24,
  "Chérie 25": 25
};

db.channels.forEach(ch => {
  // Simple case-insensitive match
  const match = Object.keys(channelMapping).find(name => name.toLowerCase() === ch.name.toLowerCase());
  if (match) {
    ch.channelNumber = channelMapping[match];
    console.log(`Updated ${ch.name} to ${ch.channelNumber}`);
  }
});

fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
