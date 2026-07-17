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
const pagosLines = readTxt('pagos_detalle.txt');

const tasas = new Map();
const headersPagos = pagosLines[0].split('|').map(h => h.trim());
for (let i = 1; i < pagosLines.length; i++) {
  const line = pagosLines[i];
  if (!line.trim()) continue;
  const vals = line.split('|');
  const emision = vals[3]?.trim();
  const tasa = parseFloat(vals[8]?.trim() || '0');
  if (tasa > 0 && emision) {
    tasas.set(emision, tasa);
  }
}

const headersCob = cobranzasLines[0].split('|').map(h => h.trim());
let missingRates = 0;
let totalBolivaresDocs = 0;

for (let i = 1; i < cobranzasLines.length; i++) {
  const line = cobranzasLines[i];
  if (!line.trim()) continue;
  const vals = line.split('|');
  const numdoc = vals[1]?.trim();
  const emision = vals[4]?.trim();
  if (numdoc && numdoc.startsWith('000')) {
    totalBolivaresDocs++;
    if (!tasas.has(emision)) {
      missingRates++;
    }
  }
}

console.log(`Total Bolivares docs: ${totalBolivaresDocs}`);
console.log(`Missing rates for those days: ${missingRates}`);
