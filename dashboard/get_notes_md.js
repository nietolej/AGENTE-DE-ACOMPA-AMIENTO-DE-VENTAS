const fs = require('fs');
const path = require('path');

async function run() {
  const filePath = path.join('..', 'export', 'cobranzas.txt');
  const buffer = fs.readFileSync(filePath);
  
  let content = buffer.toString('utf8');
  if (content.includes('\0')) {
    content = buffer.toString('utf16le');
  }

  const lines = content.split('\n');
  const headers = lines[0].split('|').map(h => h.trim());
  
  const facturasCxc = new Map();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = line.split('|');
    const row = {};
    headers.forEach((h, idx) => row[h] = values[idx]?.trim());
    
    if (row.codmovcli === '00000088') {
      const numdoc = row.numdoc;
      if (!facturasCxc.has(numdoc)) {
        facturasCxc.set(numdoc, { nota: numdoc, emision: row.emision, vence: row.vence, deuda_original: 0, abonado: 0, saldo: 0, movimientos: [] });
      }
      const fac = facturasCxc.get(numdoc);
      const importe = parseFloat(row.importe || '0');
      fac.movimientos.push({ tipo: row.tipo, importe, emision: row.emision });
      
      if (importe > 0) {
        fac.deuda_original += importe;
        fac.saldo += importe;
      } else {
        fac.abonado += Math.abs(importe);
        fac.saldo += importe;
      }
    }
  }
  
  const pendientes = Array.from(facturasCxc.values()).filter(f => f.saldo > 0.01);
  pendientes.sort((a, b) => a.vence.localeCompare(b.vence));
  
  let md = "# Notas Pendientes - REPUESTOS ASIATICOS ACARIGUA, C.A.\n\n";
  md += "| Nro. Documento | Emisión | Vencimiento | Deuda Original ($) | Abonado ($) | Saldo Pendiente ($) |\n";
  md += "|---|---|---|---|---|---|\n";
  
  pendientes.forEach(p => {
    md += `| ${p.nota} | ${p.emision} | ${p.vence} | $${p.deuda_original.toFixed(2)} | $${p.abonado.toFixed(2)} | **$${p.saldo.toFixed(2)}** |\n`;
  });
  
  const total = pendientes.reduce((s, p) => s + p.saldo, 0);
  md += `\n**Deuda Total Actual:** $${total.toFixed(2).replace(/\\d(?=(\\d{3})+\\.)/g, '$&,')}\n`;
  
  const targetPath = path.join('C:', 'Users', 'USUARIO', '.gemini', 'antigravity-ide', 'brain', 'ab857189-b624-4b34-92f8-df7e25cdafa1', 'estado_cuenta_00000088.md');
  fs.writeFileSync(targetPath, md, 'utf8');
  console.log('Artifact created at ' + targetPath);
}

run().catch(console.error);
