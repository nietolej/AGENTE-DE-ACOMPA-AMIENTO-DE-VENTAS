const fs = require('fs');
const path = require('path');

function searchFile(filename, query) {
  const filePath = path.join('..', 'export', filename);
  const buffer = fs.readFileSync(filePath);
  let content = buffer.toString('utf8');
  if (content.includes('\0')) {
    content = buffer.toString('utf16le');
  }
  const lines = content.split('\n');
  const matches = lines.filter(l => l.includes(query));
  console.log(`Found in ${filename}: ${matches.length} match(es)`);
  matches.forEach(m => console.log(m.trim()));
}

const query = process.argv[2] || '00004044';
searchFile('facturas_enc.txt', query);
searchFile('cobranzas.txt', query);
