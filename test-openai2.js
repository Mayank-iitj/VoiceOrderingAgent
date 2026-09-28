const fetch = require('node-fetch');

async function testOpenAI() {
  const urls = [
    'https://aigrants.in/api/v1/chat/completions',
    'https://api.aigrants.in/v1/chat/completions',
    'https://api.aigrants.in/v/gpt/chat/completions',
    'https://aigrants.in/v/gpt/api/chat/completions'
  ];
  const apiKey = process.env.OPENAI_API_KEY;

  for (let url of urls) {
    console.log("Testing:", url);
    try {
        const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "gpt-5-nano",
            messages: [{role: "user", content: "Hello!"}]
        })
        });
        console.log("Status:", res.status);
        console.log("Body:", await res.text());
        if (res.ok) return;
    } catch (e) {
        console.log("Error:", e.message);
    }
  }
}
testOpenAI().catch(console.error);
