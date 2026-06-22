const fs = require('fs');

const html = fs.readFileSync('tv-prog.html', 'utf-8');

// The website structure usually has things like `.program` or `.channel`
// Let's print out a snippet of the file to understand it.
const match = html.match(/<div[^>]*class=".*?"[^>]*>[\s\S]*?<img[^>]*>/g);
if (match) {
  console.log(match.slice(0, 10).join('\n---\n'));
} else {
  console.log("No match");
}
