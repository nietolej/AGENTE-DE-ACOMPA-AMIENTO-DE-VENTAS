const fs = require('fs');
const path = require('path');

function readTxt(filename) {
  const filePath = path.join('..', 'export', filename);
  const buffer = fs.readFileSync(filePath);
  let content = buffer.toString('utf8');
  if (content.includes('\0')) {
    content = buffer.toString('utf16le');
  }
  return content.split('\n');
}

const cobranzasLines = readTxt('cobranzas.txt');
const headers = cobranzasLines[0].split('|').map(h => h.trim());

const yearCounts = {};

for (let i = 1; i < cobranzasLines.length; i++) {
  const line = cobranzasLines[i];
  if (!line.trim()) continue;
  const vals = line.split('|');
  const row = {};
  headers.forEach((h, idx) => row[h] = vals[idx]?.trim());
  
  if (row.tipo === 'CA' || row.tipo === 'AB') {
    if (row.emision && row.emision.length >= 4) {
      const yr = row.emision.substring(0, 4);
      yearCounts[yr] = (yearCounts[yr] || 0) + 1;
    }
  }
}

console.log('Pagos por año:', yearCounts);
