const axios = require('axios');
const fs = require('fs');

async function test() {
  try {
    const baseUrl = 'https://tvmio.ooguy.com/eyJjb3VudHJpZXMiOlsiRlIiXSwiY2F0ZWdvcmllcyI6eyJGUiI6WyJHZW5lcmFsIPCfk7oiLCJTcG9ydHMg4pq9IiwiRG9jdW1lbnRhaXJlcyDwn4yNIiwiRmlsbXMg8J+OrCIsIkluZm9ybWF0aW9ucyDwn5OwIiwiTXVzaWMg8J+OtSIsIkVuZmFudHMg8J+RtiJdfSwiZW5hYmxlU2VhcmNoIjp0cnVlfQ';
    const url = baseUrl + '/catalog/tv/tvmio-fr.json';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    fs.writeFileSync('catalog.json', JSON.stringify(response.data, null, 2));
    console.log('Saved catalog.json');
  } catch (e) {
    console.error(e.message);
  }
}
test();
