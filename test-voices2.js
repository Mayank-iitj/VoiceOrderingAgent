const fetch = require('node-fetch');

async function testVoices() {
  const url = 'https://api.smallest.ai/v1/voices';
  const apiKey = 'sk_d10a5326d16e34c42072473128c8832f';

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text.substring(0, 500));
}
testVoices().catch(console.error);
