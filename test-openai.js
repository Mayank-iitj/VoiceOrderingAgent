const fetch = require('node-fetch');

async function testOpenAI() {
  const url1 = 'https://aigrants.in/v/gpt/chat/completions';
  const url2 = 'https://aigrants.in/v/gpt/v1/chat/completions';
  const apiKey = process.env.OPENAI_API_KEY;

  for (let url of [url1, url2]) {
    console.log("Testing:", url);
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
  }
}
testOpenAI().catch(console.error);
