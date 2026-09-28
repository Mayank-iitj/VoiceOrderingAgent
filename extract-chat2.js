const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\MS\\.gemini\\antigravity-ide\\brain\\a33b8675-027e-4884-96cf-49d94382cd9f\\.system_generated\\steps\\213\\content.md', 'utf8');
const scriptMatch = html.match(/<script[^>]*>(window\.__remixContext\s*=|self\.__next_f\s*=).*?<\/script>/);

// Let's just find code blocks or sentences with "baseURL" or "curl"
const snippetMatches = html.match(/(?:curl|baseURL|https:\/\/)[^"'\\]+/g);
if (snippetMatches) {
    const unique = [...new Set(snippetMatches)];
    for(let m of unique) {
        if (m.includes('api') && !m.includes('openai.com')) {
            console.log(m);
        }
    }
}

// Or better, let's just strip HTML tags and print snippets containing API URL
const cleanText = html.replace(/<[^>]+>/g, ' ');
const words = cleanText.split(/\s+/);
for(let i=0; i<words.length; i++) {
    if (words[i].includes('http') && !words[i].includes('openai.com') && !words[i].includes('cloudflare')) {
        console.log("Found URL context:", words.slice(Math.max(0, i-5), i+5).join(' '));
    }
}
