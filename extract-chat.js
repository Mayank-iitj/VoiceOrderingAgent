const fs = require('fs');

const data = fs.readFileSync(process.argv[2], 'utf8');

// The ChatGPT share page stores chat state in a script tag.
// We can just extract all text chunks using a regex.
const matches = data.match(/"text":\s*"([^"]+)"/g);
if (matches) {
  matches.forEach(m => {
    // Unescape the JSON string to read it properly
    try {
      const text = JSON.parse(`{${m}}`).text;
      if (text.length > 20) {
        console.log("----");
        console.log(text);
      }
    } catch (e) {}
  });
} else {
    // maybe parts format?
    const parts = data.match(/"parts":\s*\[(.*?)\]/g);
    if (parts) {
        parts.forEach(p => console.log(p));
    }
}
