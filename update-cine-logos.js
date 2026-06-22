import fs from 'fs';

const logos = {
  "Ciné+ Classic": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Cine%2B_Classic_Logo_2021.svg/1024px-Cine%2B_Classic_Logo_2021.svg.png",
  "Ciné+ Frisson": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Cine%2B_Frisson_Logo_2021.svg/1024px-Cine%2B_Frisson_Logo_2021.svg.png",
  "Ciné+ Family": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Cine%2B_Family_Logo_2021.svg/1024px-Cine%2B_Family_Logo_2021.svg.png",
  "Ciné+ Emotion": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Cine%2B_Emotion_Logo_2021.svg/1024px-Cine%2B_Emotion_Logo_2021.svg.png",
  "Ciné+ Premier": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Cine%2B_Premier_Logo_2021.svg/1024px-Cine%2B_Premier_Logo_2021.svg.png",
  "Ciné+ Club": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Cine%2B_Club_Logo_2021.svg/1024px-Cine%2B_Club_Logo_2021.svg.png"
};

try {
  let data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  let changed = false;

  for (let channel of data.channels) {
    if (logos[channel.name] && channel.logo !== logos[channel.name]) {
      channel.logo = logos[channel.name];
      changed = true;
      console.log('Updated logo for', channel.name);
    }
  }

  if (changed) {
    fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
    console.log('Saved db.json');
  } else {
    console.log('No updates needed.');
  }
} catch(e) {
  console.error(e);
}
