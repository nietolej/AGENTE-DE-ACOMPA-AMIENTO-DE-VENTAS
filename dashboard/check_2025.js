const fs = require('fs');
const path = require('path');

function testForwardMonthly() {
  const inventarioPath = path.join(__dirname, 'export/2026/inventario.txt');
  const dirs = ['2023', '2024', '2025', '2026'];
  let allMovs = [];
  
  for (const d of dirs) {
    try {
      const p = path.join(__dirname, 'export', d, 'movimientos.txt');
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      allMovs.push(...lines.slice(1));
    } catch(e) {}
  }

  const inventarioRaw = fs.readFileSync(inventarioPath, 'utf8').split('\n');
  const invHeaders = inventarioRaw[0].split('|').map(h => h.trim());

  const priceMap = new Map();

  for (let i = 1; i < inventarioRaw.length; i++) {
    const line = inventarioRaw[i];
    if (!line.trim()) continue;
    const parts = line.split('|');
    const codart = parts[invHeaders.indexOf('codart')]?.trim().toUpperCase();
    const precio_d = parseFloat(parts[invHeaders.indexOf('precio_d')] || '0');
    
    if (codart) {
      priceMap.set(codart, precio_d);
    }
  }

  // Determine years to process. For this script, let's process 2026.
  const targetYears = ['2026'];
  const valuationSeries = [];

  for (const year of targetYears) {
    // 1. Identify AP for this year
    const stock = new Map();
    const movsYear = allMovs.filter(line => {
      const parts = line.split('|');
      if (parts.length < 6) return false;
      return true; // We'll parse first
    }).map(line => {
      const parts = line.split('|');
      return {
        codart: parts[0]?.trim().toUpperCase(),
        fecha_mov: parts[1]?.trim(),
        tipinv: parts[2]?.trim().toUpperCase(),
        cantidad: parseFloat(parts[3] || '0'),
        numdoc: parts[5]?.trim().toUpperCase()
      };
    }).filter(m => m.codart && m.fecha_mov);

    // Apply AP
    const movsAp = movsYear.filter(m => {
      if (!m.numdoc.startsWith('AP')) return false;
      const apYear = m.fecha_mov.substring(0, 4);
      const apMD = m.fecha_mov.substring(4, 8);
      let effectiveYear = apYear;
      if (apMD === '1231') {
        effectiveYear = (parseInt(apYear) + 1).toString();
      }
      return effectiveYear === year;
    });

    for (const ap of movsAp) {
      const prev = stock.get(ap.codart) || 0;
      if (ap.tipinv === 'EN') stock.set(ap.codart, prev + ap.cantidad);
      else if (ap.tipinv === 'SA') stock.set(ap.codart, prev - ap.cantidad);
    }

    // Enero is just the AP stock
    let valEnero = 0;
    for (const [cod, st] of stock.entries()) {
      if (st > 0) valEnero += st * (priceMap.get(cod) || 0);
    }
    valuationSeries.push({ mes: `${year}-01`, monto: Math.round(valEnero * 100) / 100 });

    // Group non-AP movements of this year by month
    const movsRest = movsYear.filter(m => !m.numdoc.startsWith('AP') && m.fecha_mov.startsWith(year));
    const movsPorMes = new Map();
    for (const m of movsRest) {
      const mes = m.fecha_mov.substring(4, 6); // '01', '02'
      if (!movsPorMes.has(mes)) movsPorMes.set(mes, []);
      let delta = 0;
      if (m.tipinv === 'EN') delta = m.cantidad;
      else if (m.tipinv === 'SA') delta = -m.cantidad;
      movsPorMes.get(mes).push({ codart: m.codart, delta });
    }

    // Calculate Feb through Dec
    const months = ['02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    for (let i = 0; i < months.length; i++) {
      const currentMonth = months[i];
      // To get stock for currentMonth, apply movements of previous month!
      const prevMonth = (i === 0) ? '01' : months[i-1];
      const prevMovs = movsPorMes.get(prevMonth) || [];
      for (const m of prevMovs) {
        const prevStock = stock.get(m.codart) || 0;
        stock.set(m.codart, prevStock + m.delta);
      }
      
      // If we don't have movements for this month AND previous month AND it's past today, 
      // maybe we stop? Or just output 0?
      // Actually, if we just compute it, it carries over.

      let val = 0;
      for (const [cod, st] of stock.entries()) {
        if (st > 0) val += st * (priceMap.get(cod) || 0);
      }
      valuationSeries.push({ mes: `${year}-${currentMonth}`, monto: Math.round(val * 100) / 100 });
    }
  }

  console.log("Forward Option 1 Valuation Series:");
  console.log(valuationSeries);
}

testForwardMonthly();
