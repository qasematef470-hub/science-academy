const fs = require('fs');
const lines = fs.readFileSync('build-crash2.txt', 'utf16le').split('\\n');
const lastLines = lines.slice(-200).join('\\n');
fs.writeFileSync('build-crash2-tail.txt', lastLines, 'utf8');
