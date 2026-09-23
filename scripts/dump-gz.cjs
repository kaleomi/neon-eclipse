
const fs = require('fs');
const target = process.argv[2];
const b = fs.readFileSync(target);
const zlib = require('zlib');
const compressed = zlib.gzipSync(b);
// Print in safe 40-char lines
const s = compressed.toString('base64');
for (let i = 0; i < s.length; i += 40) {
  console.log(s.slice(i, i + 40));
}
