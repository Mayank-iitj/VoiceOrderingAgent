const fetch = require('node-fetch');

async function testTTS() {
  const url = 'https://api.smallest.ai/waves/v1/tts';
  const apiKey = 'sk_d10a5326d16e34c42072473128c8832f'; // User's key

  const payloads = [
    { text: "Hello", voice_id: "sophia" },
    { text: "Hello", voice_id: "meher" }
  ];

  for (const payload of payloads) {
    console.log("Trying payload:", JSON.stringify(payload));
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    if (!res.ok) {
      console.log("Error body:", await res.text());
    } else {
      console.log("Success! Headers:", res.headers.raw());
      return;
    }
  }
}
testTTS().catch(console.error);
