import axios from 'axios';

async function testProxyLogic(feed) {
    try {
      const hocaRes = await axios.get(`https://hoca8.com/footy.php?player=desktop&live=${feed}`, {
        headers: { 'Referer': 'https://cartelive.club/' }
      });
      const data = hocaRes.data;
      
      let resultUrl = '';
      const arrMatch = data.match(/\["h","t","t","p","s",":"[^\]]+\]/);
      if (arrMatch) {
          const arr = JSON.parse(arrMatch[0]);
          resultUrl = arr.join('');
      }
      
      // Also check for the extra parts
      const extraArrayMatch = data.match(/join\(""\)\s*\+\s*([a-zA-Z0-9]+)\.join\(""\)/);
      if (extraArrayMatch) {
          const varName = extraArrayMatch[1];
          const varMatch = data.match(new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[^\\]]*\\])`));
          if (varMatch) {
              const extraArr = JSON.parse(varMatch[1].replace(/'/g, '"'));
              resultUrl += extraArr.join('');
          }
      }

      const spanMatch = data.match(/document\.getElementById\("([^"]+)"\)\.innerHTML/);
      if (spanMatch) {
          const spanId = spanMatch[1];
          const spanContentMatch = data.match(new RegExp(`id=${spanId}>([^<]*)<`));
          if (spanContentMatch) {
              resultUrl += spanContentMatch[1];
          }
      }

      console.log(`Feed: ${feed} -> Result URL: ${resultUrl}`);
    } catch(err) {
      console.error(`Error for ${feed}: ${err.message}`);
    }
}

async function run() {
    await testProxyLogic('ufeed01');
    await testProxyLogic('ufeed02');
    await testProxyLogic('ufeed03');
}
run();
