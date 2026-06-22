const axios = require('axios');

async function testLocalProxy() {
  const url = 'http://localhost:3000/api/proxy/vavoo?url=https%3A%2F%2Fvavoo.to%2Fvavoo-iptv%2Fplay%2F226410614460a38e6f63e1';
  try {
    console.log('Testing local proxy for M6...');
    const res = await axios.get(url, { 
      maxRedirects: 0,
      validateStatus: (status) => status >= 300 && status < 400
    });
    console.log('Success! Redirected to:', res.headers.location);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
       console.error('Status:', err.response.status);
       console.error('Data:', err.response.data);
    }
  }
}

testLocalProxy();
