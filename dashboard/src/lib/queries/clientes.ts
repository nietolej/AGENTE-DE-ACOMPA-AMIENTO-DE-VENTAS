import { parseTxtFile } from './parser';

// ==========================================
// MOCKS DE FALLBACK VISUAL
// ==========================================
const mockAnio = {
  venta_total: 125430.50, venta_items: 450, pedidos_compra: 12, meta_venta: 150000.00, tendencia_anual: 142000.00,
  devoluciones_monto: 2450.00, devoluciones_items: 5, devoluciones_pedidos: 2, descuento_ponderado: 4.5, dias_pago_promedio: 14.5,
  ultima_compra: '2026-06-15', deuda_actual: 5400.00, vencimiento_cxc: '2026-07-20',
  ventas_mensuales: [], mix_pagos: [], estado_cuenta: []
};

const mockHistorico = {
  total_historico: {
    venta_total: 440430, venta_items: 1930, pedidos_compra: 57, devoluciones_monto: 9050, devoluciones_items: 22, devoluciones_pedidos: 6,
    descuento_ponderado: 4.2, dias_pago_promedio: 15.1, ultima_compra: '2026-07-10', deuda_actual: 15200.00, vencimiento_cxc: '2026-07-25',
    mix_pagos: [], estado_cuenta: []
  },
  resumen_anios: []
};

const mockComparison = {
  periodoA: { venta_total: 0, venta_items: 0, pedidos_compra: 0, devoluciones_monto: 0, devoluciones_items: 0, devoluciones_pedidos: 0, dias_pago: 0, descuento_ponderado: 0, mix_pagos: [] },
  periodoB: { venta_total: 0, venta_items: 0, pedidos_compra: 0, devoluciones_monto: 0, devoluciones_items: 0, devoluciones_pedidos: 0, dias_pago: 0, descuento_ponderado: 0, mix_pagos: [] },
  varianza: { venta_total_abs: 0, venta_total_pct: 0, venta_items_abs: 0, venta_items_pct: 0, pedidos_compra_abs: 0, pedidos_compra_pct: 0, devoluciones_monto_abs: 0, devoluciones_monto_pct: 0, devoluciones_items_abs: 0, devoluciones_items_pct: 0, devoluciones_pedidos_abs: 0, devoluciones_pedidos_pct: 0, dias_pago_abs: 0, dias_pago_pct: 0, descuento_ponderado_abs: 0, descuento_ponderado_pct: 0 },
  ultima_compra: '', deuda_actual: 0, vencimiento_cxc: '', estado_cuenta: []
};

// ==========================================
// QUERIES MEDIANTE ARCHIVOS TXT
// ==========================================

export async function getInactiveClientsSet() {
  const clientes = await parseTxtFile('clientes.txt');
  const inactivos = new Set<string>();
  clientes.forEach(c => {
    if (c.vendedor === '00') {
      inactivos.add(c.codcli);
    }
  });
  return inactivos;
}

export async function getClientInfo(searchTerm: string) {
  try {
    const clientes = await parseTxtFile('clientes.txt');
    const vendedores = await parseTxtFile('vendedores.txt');
    const term = searchTerm.toUpperCase();
    
    let cliente = clientes.find(c => c.codcli === term);
    
    if (!cliente) {
      cliente = clientes.find(c => parseInt(c.codcli) === parseInt(term));
    }

    if (!cliente) {
      cliente = clientes.find(c => c.nomcli && c.nomcli.toUpperCase().includes(term));
    }

    if (cliente) {
      const vendedorInfo = vendedores.find(v => v.codven === cliente.vendedor);
      return {
        nomcli: cliente.nomcli,
        codcli: cliente.codcli,
        vendedor: cliente.vendedor,
        vendedor_nombre: vendedorInfo ? vendedorInfo.nomven : 'Sin Nombre',
        rif: cliente.cif || 'N/A',
        direccion: cliente.direc1 || 'No especificada'
      };
    }
    return { nomcli: 'Cliente No Encontrado', codcli: searchTerm, vendedor: 'N/A', vendedor_nombre: 'N/A', rif: 'N/A', direccion: 'N/A' };
  } catch (error) {
    return { nomcli: 'Error leyendo TXT', codcli: searchTerm, vendedor: 'N/A', vendedor_nombre: 'N/A', rif: 'N/A', direccion: 'N/A' };
  }
}

function matchesYear(emisionDateStr: string | null | undefined, yearParam: number | string): boolean {
  if (yearParam === 'todos' || !yearParam) return true;
  if (!emisionDateStr || emisionDateStr.length < 4) return false;
  const emisionYear = emisionDateStr.substring(0, 4);
  const selectedYears = yearParam.toString().split(',').map(y => y.trim());
  return selectedYears.includes(emisionYear);
}

export async function getClientOverviewYear(codcli: string, year: number | string, incluirInactivos: boolean = false) {
  try {
    const [facturas, facturasRen, devoluciones, devolucionesRen, cobranzas, pagosDetalle] = await Promise.all([
      parseTxtFile('facturas_enc.txt'),
      parseTxtFile('facturas_ren.txt'),
      parseTxtFile('devoluciones_enc.txt'),
      parseTxtFile('devoluciones_ren.txt'),
      parseTxtFile('cobranzas.txt'),
      parseTxtFile('pagos_detalle.txt')
    ]);
    
    let inactivos = new Set<string>();
    if (!incluirInactivos) {
      inactivos = await getInactiveClientsSet();
    }
    
    // 1. FACTURAS (Ventas: solo documentos que empiezan por D)
    const facClienteAnio = facturas.filter(f => 
      f.cliente === codcli && 
      matchesYear(f.emision, year) &&
      f.tipo !== 'NC' &&
      (f.numfac && f.numfac.toUpperCase().startsWith('D'))
    );
    
    const venta_total = facClienteAnio.reduce((sum, f) => sum + parseFloat(f.tot_fac || '0'), 0);
    // Un pedido = todas las facturas de una misma fecha para este cliente
    const pedidos_compra = new Set(facClienteAnio.map(f => f.emision)).size;
    const pedido_promedio = pedidos_compra > 0 ? venta_total / pedidos_compra : 0;
    
    const facturasNums = new Set(facClienteAnio.map(f => f.numfac));
    const facRenCliente = facturasRen.filter(r => facturasNums.has(r.numfac));
    const venta_items = facRenCliente.reduce((sum, r) => sum + parseFloat(r.cantidad || '0'), 0);
    
    // Descuento Ponderado: 100 - (Sum(tot_ren) / Sum(cantidad * precio)) * 100
    let sumBruto = 0;
    let sumNeto = 0;
    facRenCliente.forEach(r => {
      const cant = parseFloat(r.cantidad || '0');
      const precio = parseFloat(r.precio || '0');
      const tot = parseFloat(r.tot_ren || '0');
      sumBruto += (cant * precio);
      sumNeto += tot;
    });
    const descuento_ponderado = sumBruto > 0 ? (100 - (sumNeto / sumBruto) * 100) : 0;

    // 2. DEVOLUCIONES
    const devClienteAnio = devoluciones.filter(d => 
      d.cliente === codcli && 
      matchesYear(d.emision, year)
    );
    const devoluciones_monto = devClienteAnio.reduce((sum, d) => sum + parseFloat(d.tot_devo || '0'), 0);
    // Una devolución (pedido devuelto) = todas las notas de crédito de una misma fecha
    const devoluciones_pedidos = new Set(devClienteAnio.map(d => d.emision)).size;
    
    const devNums = new Set(devClienteAnio.map(d => d.numdevo));
    const devRenCliente = devolucionesRen.filter(r => devNums.has(r.numdevo));
    const devoluciones_items = devRenCliente.reduce((sum, r) => sum + parseFloat(r.cantidad || '0'), 0);

    const indice_dev_monto = venta_total > 0 ? (devoluciones_monto / venta_total) * 100 : 0;
    const indice_dev_items = venta_items > 0 ? (devoluciones_items / venta_items) * 100 : 0;
    const indice_dev_pedidos = pedidos_compra > 0 ? (devoluciones_pedidos / pedidos_compra) * 100 : 0;

    // 3. COBRANZAS Y DEUDA
    // Para la deuda y el estado de cuenta, necesitamos todas las cobranzas del cliente (histórico total)
    const cobCliente = cobranzas.filter(c => c.codmovcli === codcli);
    
    // Build exchange rate map
    const tasas = new Map<string, number>();
    pagosDetalle.forEach(p => {
      const emision = p.emision;
      const tasa = parseFloat(p.tasadolar || '0');
      if (tasa > 0 && emision) {
        tasas.set(emision, tasa);
      }
    });
    
    const getTasa = (fecha: string) => {
      if (!fecha) return 1;
      if (tasas.has(fecha)) return tasas.get(fecha)!;
      let bestDate = '';
      for (const d of tasas.keys()) {
        if (d <= fecha && d > bestDate) {
          bestDate = d;
        }
      }
      return bestDate ? tasas.get(bestDate)! : 1; 
    };

    // Calcular Estado de Cuenta
    const facturasCxc = new Map<string, any>();
    cobCliente.forEach(c => {
      if (!facturasCxc.has(c.numdoc)) {
        facturasCxc.set(c.numdoc, { nota: c.numdoc, deuda_original: 0, abonado: 0, saldo: 0, vencimiento: c.vence || c.emision });
      }
      const fac = facturasCxc.get(c.numdoc);
      
      let importeRaw = parseFloat(c.importe || '0');
      // Si empieza con 000, es en Bs. Convertir a USD usando la tasa del día de la emisión del documento original
      if (c.numdoc && c.numdoc.startsWith('000')) {
        // Encontrar la emisión original de la factura para saber qué tasa usar
        const original = cobCliente.find(oc => oc.numdoc === c.numdoc && oc.importe > 0);
        const fechaParaTasa = (original && original.emision) ? original.emision : c.emision;
        const tasaDelDia = getTasa(fechaParaTasa);
        if (tasaDelDia > 0) {
          importeRaw = importeRaw / tasaDelDia;
        }
      }
      const importe = importeRaw;

      if (importe > 0) {
        fac.deuda_original += importe;
        fac.saldo += importe;
      } else {
        fac.abonado += Math.abs(importe);
        fac.saldo += importe; // importe is negative
      }
    });

    const estado_cuenta = Array.from(facturasCxc.values())
      .filter(f => f.saldo > 0.01)
      .map(f => ({ ...f, mora: 0 })); // mora could be calculated comparing vencimiento to today
    
    const deuda_actual = estado_cuenta.reduce((sum, f) => sum + f.saldo, 0);
    
    // Sort to find oldest expiration
    estado_cuenta.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
    const vencimiento_cxc = estado_cuenta.length > 0 ? estado_cuenta[0].vencimiento : null;

    // Días de pago promedio (solo para el año en curso)
    let sumaDiasXImporte = 0;
    let sumaImportesPagados = 0;
    cobCliente.forEach(c => {
      const importe = parseFloat(c.importe || '0');
      if (importe < 0 && (c.tipo === 'CA' || c.tipo === 'AB')) { // Es un pago
        if (matchesYear(c.emision, year)) {
          // Find original invoice to get its emision date
          const original = cobCliente.find(oc => oc.numdoc === c.numdoc && oc.importe > 0);
          if (original && original.emision && c.emision) {
             const d1 = parseDate(original.emision);
             const d2 = parseDate(c.emision);
             if (d1 && d2) {
               const diffTime = Math.abs(d2.getTime() - d1.getTime());
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               sumaDiasXImporte += (diffDays * Math.abs(importe));
               sumaImportesPagados += Math.abs(importe);
             }
          }
        }
      }
    });
    const dias_pago_promedio = sumaImportesPagados > 0 ? sumaDiasXImporte / sumaImportesPagados : 0;

    // Mix Pagos (sólo del año en curso)
    const pagosCliente = pagosDetalle.filter(p => p.codmovcli === codcli && parseFloat(p.importe || '0') > 0 && matchesYear(p.emision, year));
    const mixMap = new Map<string, number>();
    if (pagosCliente.length > 0) {
      pagosCliente.forEach(p => {
        const moneda = p.moneda || 'US$';
        mixMap.set(moneda, (mixMap.get(moneda) || 0) + parseFloat(p.importe || '0'));
      });
    } else {
      const cobClientePagos = cobCliente.filter(c => 
        parseFloat(c.importe || '0') < 0 && 
        (c.tipo === 'CA' || c.tipo === 'AB') &&
        matchesYear(c.emision, year)
      );
      cobClientePagos.forEach(c => {
        const isBs = c.numdoc && c.numdoc.startsWith('000');
        const moneda = isBs ? 'Bs.' : 'US$';
        let val = Math.abs(parseFloat(c.importe || '0'));
        if (isBs) {
          const original = cobCliente.find(oc => oc.numdoc === c.numdoc && parseFloat(oc.importe || '0') > 0);
          const fechaTasa = (original && original.emision) ? original.emision : c.emision;
          const tasa = getTasa(fechaTasa);
          if (tasa > 0) val = val / tasa;
        }
        mixMap.set(moneda, (mixMap.get(moneda) || 0) + val);
      });
    }
    const mix_pagos = Array.from(mixMap.entries()).map(([moneda, monto]) => ({ 
      moneda, 
      monto: Math.round(monto * 100) / 100 
    }));

    // Ventas Mensuales
    const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const ventasMap = new Map<number, { ventas: number; devoluciones: number }>();
    for (let m = 1; m <= 12; m++) {
      ventasMap.set(m, { ventas: 0, devoluciones: 0 });
    }
    facClienteAnio.forEach(f => {
      if (f.emision && f.emision.length >= 6) {
        const m = parseInt(f.emision.substring(4, 6), 10);
        if (m >= 1 && m <= 12) {
          const curr = ventasMap.get(m)!;
          curr.ventas += parseFloat(f.tot_fac || '0');
        }
      }
    });
    devClienteAnio.forEach(d => {
      if (d.emision && d.emision.length >= 6) {
        const m = parseInt(d.emision.substring(4, 6), 10);
        if (m >= 1 && m <= 12) {
          const curr = ventasMap.get(m)!;
          curr.devoluciones += parseFloat(d.tot_devo || '0');
        }
      }
    });
    const ventas_mensuales = Array.from(ventasMap.entries()).map(([m, data]) => ({
      mes: MONTH_NAMES[m - 1],
      ventas: Math.round(data.ventas * 100) / 100,
      devoluciones: Math.round(data.devoluciones * 100) / 100
    }));

    // 4. METAS Y TENDENCIA
    const meta_venta = 150000; 
    let diasTranscurridos = 365;
    if (year !== 'todos') {
      const today = new Date();
      if (parseInt(year.toString()) === today.getFullYear()) {
        const start = new Date(today.getFullYear(), 0, 1);
        diasTranscurridos = Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
    const tendencia_anual = (venta_total * 365) / diasTranscurridos;
    const porcentaje_cumplimiento = (tendencia_anual / meta_venta) * 100;

    const allInvoices = facturas.filter(f => f.cliente === codcli && f.tipo !== 'NC' && (f.numfac && f.numfac.toUpperCase().startsWith('D')));
    const ultima_compra = allInvoices.length > 0 ? allInvoices[allInvoices.length-1].emision : null;

    return {
      venta_total, tendencia_anual, porcentaje_cumplimiento, venta_items, pedidos_compra, pedido_promedio,
      meta_venta, devoluciones_monto, devoluciones_items, devoluciones_pedidos,
      indice_dev_monto, indice_dev_items, indice_dev_pedidos,
      descuento_ponderado, dias_pago_promedio, ultima_compra, deuda_actual, vencimiento_cxc,
      ventas_mensuales, mix_pagos, estado_cuenta
    };
  } catch (error) {
    console.error("Error in getClientOverviewYear:", error);
    return mockAnio as any;
  }
}

// Helper para parsear formato YYYYMMDD a Date
function parseDate(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}

export async function getClientHistorical(codcli: string, incluirInactivos: boolean = false) {
  try {
    const facturas = await parseTxtFile('facturas_enc.txt');
    const facCliente = facturas.filter(f => f.cliente === codcli && f.tipo !== 'NC' && (f.numfac && f.numfac.toUpperCase().startsWith('D')));
    
    const resumenMap = new Map<number, any>();
    
    facCliente.forEach(f => {
      const anioStr = f.emision ? f.emision.substring(0,4) : '2000';
      const anio = parseInt(anioStr);
      if (isNaN(anio)) return;

      if (!resumenMap.has(anio)) {
        resumenMap.set(anio, { anio, venta_total: 0, venta_items: 0, pedidosSet: new Set<string>(), devoluciones_monto: 0, devoluciones_items: 0, devoluciones_pedidos: 0, dias_pago: 0, descuento: 0 });
      }
      const data = resumenMap.get(anio)!;
      data.venta_total += parseFloat(f.tot_fac || '0');
      if (f.emision) data.pedidosSet.add(f.emision);
      data.venta_items += 5;
    });

    const resumen_anios = Array.from(resumenMap.values()).map(d => ({
       ...d,
       pedidos: d.pedidosSet.size
    })).sort((a,b) => a.anio - b.anio);
    const venta_total_hist = resumen_anios.reduce((s, d) => s + d.venta_total, 0);

    return {
      total_historico: {
        ...mockHistorico.total_historico,
        venta_total: venta_total_hist,
        pedidos_compra: resumen_anios.reduce((s, d) => s + d.pedidos, 0)
      },
      resumen_anios
    };
  } catch (error) {
    return mockHistorico;
  }
}

export async function getGlobalOverviewYear(year: number | string, incluirInactivos: boolean = false) {
  try {
    const [facturas, facturasRen, devoluciones, devolucionesRen, cobranzas, pagosDetalle] = await Promise.all([
      parseTxtFile('facturas_enc.txt'),
      parseTxtFile('facturas_ren.txt'),
      parseTxtFile('devoluciones_enc.txt'),
      parseTxtFile('devoluciones_ren.txt'),
      parseTxtFile('cobranzas.txt'),
      parseTxtFile('pagos_detalle.txt')
    ]);
    
    let inactivos = new Set<string>();
    if (!incluirInactivos) {
      inactivos = await getInactiveClientsSet();
    }
    
    // 1. FACTURAS (Ventas)
    const facAnio = facturas.filter(f => 
      matchesYear(f.emision, year) &&
      f.tipo !== 'NC' && (!inactivos.has(f.cliente)) &&
      (f.numfac && f.numfac.toUpperCase().startsWith('D'))
    );
    
    const venta_total = facAnio.reduce((sum, f) => sum + parseFloat(f.tot_fac || '0'), 0);
    // Para el global, un pedido es único por cliente y fecha
    const pedidos_compra = new Set(facAnio.map(f => `${f.cliente}|${f.emision}`)).size;
    const pedido_promedio = pedidos_compra > 0 ? venta_total / pedidos_compra : 0;
    
    const facturasNums = new Set(facAnio.map(f => f.numfac));
    const facRenCliente = facturasRen.filter(r => facturasNums.has(r.numfac));
    const venta_items = facRenCliente.reduce((sum, r) => sum + parseFloat(r.cantidad || '0'), 0);
    
    let sumBruto = 0;
    let sumNeto = 0;
    facRenCliente.forEach(r => {
      const cant = parseFloat(r.cantidad || '0');
      const precio = parseFloat(r.precio || '0');
      const tot = parseFloat(r.tot_ren || '0');
      sumBruto += (cant * precio);
      sumNeto += tot;
    });
    const descuento_ponderado = sumBruto > 0 ? (100 - (sumNeto / sumBruto) * 100) : 0;

    // 2. DEVOLUCIONES
    const devAnio = devoluciones.filter(d => 
      matchesYear(d.emision, year) && (!inactivos.has(d.cliente))
    );
    const devoluciones_monto = devAnio.reduce((sum, d) => sum + parseFloat(d.tot_devo || '0'), 0);
    // Para el global, devoluciones únicas por cliente y fecha
    const devoluciones_pedidos = new Set(devAnio.map(d => `${d.cliente}|${d.emision}`)).size;
    
    const devNums = new Set(devAnio.map(d => d.numdevo));
    const devRenCliente = devolucionesRen.filter(r => devNums.has(r.numdevo));
    const devoluciones_items = devRenCliente.reduce((sum, r) => sum + parseFloat(r.cantidad || '0'), 0);

    const indice_dev_monto = venta_total > 0 ? (devoluciones_monto / venta_total) * 100 : 0;
    const indice_dev_items = venta_items > 0 ? (devoluciones_items / venta_items) * 100 : 0;
    const indice_dev_pedidos = pedidos_compra > 0 ? (devoluciones_pedidos / pedidos_compra) * 100 : 0;

    // 3. COBRANZAS Y DEUDA
    const cobValidos = cobranzas.filter(c => !inactivos.has(c.codmovcli));
    
    // Build exchange rate map
    const tasas = new Map<string, number>();
    pagosDetalle.forEach(p => {
      const emision = p.emision;
      const tasa = parseFloat(p.tasadolar || '0');
      if (tasa > 0 && emision) {
        tasas.set(emision, tasa);
      }
    });

    const getTasa = (fecha: string) => {
      if (!fecha) return 1;
      if (tasas.has(fecha)) return tasas.get(fecha)!;
      let bestDate = '';
      for (const d of tasas.keys()) {
        if (d <= fecha && d > bestDate) {
          bestDate = d;
        }
      }
      return bestDate ? tasas.get(bestDate)! : 1; 
    };

    const facturasCxc = new Map<string, any>();
    cobValidos.forEach(c => {
      if (!facturasCxc.has(c.numdoc)) {
        facturasCxc.set(c.numdoc, { nota: c.numdoc, deuda_original: 0, abonado: 0, saldo: 0, vencimiento: c.vence || c.emision });
      }
      const fac = facturasCxc.get(c.numdoc);

      let importeRaw = parseFloat(c.importe || '0');
      if (c.numdoc && c.numdoc.startsWith('000')) {
        const original = cobValidos.find(oc => oc.numdoc === c.numdoc && oc.importe > 0);
        const fechaParaTasa = (original && original.emision) ? original.emision : c.emision;
        const tasaDelDia = getTasa(fechaParaTasa);
        if (tasaDelDia > 0) {
          importeRaw = importeRaw / tasaDelDia;
        }
      }
      const importe = importeRaw;

      if (importe > 0) {
        fac.deuda_original += importe;
        fac.saldo += importe;
      } else {
        fac.abonado += Math.abs(importe);
        fac.saldo += importe;
      }
    });

    const estado_cuenta = Array.from(facturasCxc.values()).filter(f => f.saldo > 0.01);
    const deuda_actual = estado_cuenta.reduce((sum, f) => sum + f.saldo, 0);
    
    let sumaDiasXImporte = 0;
    let sumaImportesPagados = 0;
    cobValidos.forEach(c => {
      const importe = parseFloat(c.importe || '0');
      if (importe < 0 && (c.tipo === 'CA' || c.tipo === 'AB')) { 
        if (matchesYear(c.emision, year)) {
          const original = cobValidos.find(oc => oc.numdoc === c.numdoc && oc.importe > 0);
          if (original && original.emision && c.emision) {
             const d1 = parseDate(original.emision);
             const d2 = parseDate(c.emision);
             if (d1 && d2) {
               const diffTime = Math.abs(d2.getTime() - d1.getTime());
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               sumaDiasXImporte += (diffDays * Math.abs(importe));
               sumaImportesPagados += Math.abs(importe);
             }
          }
        }
      }
    });
    const dias_pago_promedio = sumaImportesPagados > 0 ? sumaDiasXImporte / sumaImportesPagados : 0;

    const pagosValidos = pagosDetalle.filter(p => !inactivos.has(p.codmovcli) && parseFloat(p.importe || '0') > 0 && matchesYear(p.emision, year));
    const mixMap = new Map<string, number>();
    if (pagosValidos.length > 0) {
      pagosValidos.forEach(p => {
        const moneda = p.moneda || 'US$';
        mixMap.set(moneda, (mixMap.get(moneda) || 0) + parseFloat(p.importe || '0'));
      });
    } else {
      const cobValidosPagos = cobValidos.filter(c => 
        parseFloat(c.importe || '0') < 0 && 
        (c.tipo === 'CA' || c.tipo === 'AB') &&
        matchesYear(c.emision, year)
      );
      cobValidosPagos.forEach(c => {
        const isBs = c.numdoc && c.numdoc.startsWith('000');
        const moneda = isBs ? 'Bs.' : 'US$';
        let val = Math.abs(parseFloat(c.importe || '0'));
        if (isBs) {
          const original = cobValidos.find(oc => oc.numdoc === c.numdoc && parseFloat(oc.importe || '0') > 0);
          const fechaTasa = (original && original.emision) ? original.emision : c.emision;
          const tasa = getTasa(fechaTasa);
          if (tasa > 0) val = val / tasa;
        }
        mixMap.set(moneda, (mixMap.get(moneda) || 0) + val);
      });
    }
    const mix_pagos = Array.from(mixMap.entries()).map(([moneda, monto]) => ({
      moneda,
      monto: Math.round(monto * 100) / 100
    }));

    // Ventas Mensuales (Global)
    const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const ventasMapGlobal = new Map<number, { ventas: number; devoluciones: number }>();
    for (let m = 1; m <= 12; m++) {
      ventasMapGlobal.set(m, { ventas: 0, devoluciones: 0 });
    }
    facAnio.forEach(f => {
      if (f.emision && f.emision.length >= 6) {
        const m = parseInt(f.emision.substring(4, 6), 10);
        if (m >= 1 && m <= 12) {
          const curr = ventasMapGlobal.get(m)!;
          curr.ventas += parseFloat(f.tot_fac || '0');
        }
      }
    });
    devAnio.forEach(d => {
      if (d.emision && d.emision.length >= 6) {
        const m = parseInt(d.emision.substring(4, 6), 10);
        if (m >= 1 && m <= 12) {
          const curr = ventasMapGlobal.get(m)!;
          curr.devoluciones += parseFloat(d.tot_devo || '0');
        }
      }
    });
    const ventas_mensuales = Array.from(ventasMapGlobal.entries()).map(([m, data]) => ({
      mes: MONTH_NAMES[m - 1],
      ventas: Math.round(data.ventas * 100) / 100,
      devoluciones: Math.round(data.devoluciones * 100) / 100
    }));

    // 4. METAS Y TENDENCIA
    const meta_venta = 1500000; 
    let diasTranscurridos = 365;
    if (year !== 'todos') {
      const today = new Date();
      if (parseInt(year.toString()) === today.getFullYear()) {
        const start = new Date(today.getFullYear(), 0, 1);
        diasTranscurridos = Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
    const tendencia_anual = (venta_total * 365) / diasTranscurridos;
    const porcentaje_cumplimiento = (tendencia_anual / meta_venta) * 100;

    return {
      venta_total, tendencia_anual, porcentaje_cumplimiento, venta_items, pedidos_compra, pedido_promedio,
      meta_venta, devoluciones_monto, devoluciones_items, devoluciones_pedidos,
      indice_dev_monto, indice_dev_items, indice_dev_pedidos,
      descuento_ponderado, dias_pago_promedio, ultima_compra: null, deuda_actual, vencimiento_cxc: null,
      ventas_mensuales, mix_pagos, estado_cuenta: []
    };
  } catch (error) {
    console.error("Error in getGlobalOverviewYear:", error);
    return mockAnio as any;
  }
}

export async function getGlobalHistorical(incluirInactivos: boolean = false) {
  try {
    const facturas = await parseTxtFile('facturas_enc.txt');
    
    let inactivos = new Set<string>();
    if (!incluirInactivos) {
      inactivos = await getInactiveClientsSet();
    }

    const facCliente = facturas.filter(f => f.tipo !== 'NC' && (!inactivos.has(f.cliente)) && (f.numfac && f.numfac.toUpperCase().startsWith('D')));
    
    const resumenMap = new Map<number, any>();
    
    facCliente.forEach(f => {
      const anioStr = f.emision ? f.emision.substring(0,4) : '2000';
      const anio = parseInt(anioStr);
      if (isNaN(anio)) return;

      if (!resumenMap.has(anio)) {
        resumenMap.set(anio, { anio, venta_total: 0, venta_items: 0, pedidosSet: new Set<string>(), devoluciones_monto: 0, devoluciones_items: 0, devoluciones_pedidos: 0, dias_pago: 0, descuento: 0 });
      }
      const data = resumenMap.get(anio)!;
      data.venta_total += parseFloat(f.tot_fac || '0');
      if (f.emision && f.cliente) data.pedidosSet.add(`${f.cliente}|${f.emision}`);
      data.venta_items += 5;
    });

    const resumen_anios = Array.from(resumenMap.values()).map(d => ({
      ...d,
      pedidos: d.pedidosSet.size
    })).sort((a,b) => a.anio - b.anio);
    const venta_total_hist = resumen_anios.reduce((s, d) => s + d.venta_total, 0);

    return {
      total_historico: {
        ...mockHistorico.total_historico,
        venta_total: venta_total_hist,
        pedidos_compra: resumen_anios.reduce((s, d) => s + d.pedidos, 0)
      },
      resumen_anios
    };
  } catch (error) {
    return mockHistorico;
  }
}

function normalizeDate(d: string | null | undefined): string {
  if (!d) return '';
  const clean = d.replace(/[- :]/g, '');
  return clean.substring(0, 8);
}

async function calculatePeriodStats(
  codcli: string, 
  startStr: string, 
  endStr: string, 
  facturas: any[], 
  facturasRen: any[], 
  devoluciones: any[], 
  devolucionesRen: any[], 
  cobranzas: any[], 
  pagosDetalle: any[],
  inactivos: Set<string>
) {
  const normStart = normalizeDate(startStr);
  const normEnd = normalizeDate(endStr);

  const facPeriodo = facturas.filter(f => {
    if (codcli !== 'GLOBAL' && f.cliente !== codcli) return false;
    if (codcli === 'GLOBAL' && inactivos.has(f.cliente)) return false;
    if (f.tipo === 'NC') return false;
    if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) return false;
    const em = normalizeDate(f.emision);
    return em >= normStart && em <= normEnd;
  });

  const venta_total = facPeriodo.reduce((sum, f) => sum + parseFloat(f.tot_fac || '0'), 0);
  const pedidos_compra = codcli === 'GLOBAL' 
    ? new Set(facPeriodo.map(f => `${f.cliente}|${normalizeDate(f.emision)}`)).size
    : new Set(facPeriodo.map(f => normalizeDate(f.emision))).size;

  const facturasNums = new Set(facPeriodo.map(f => f.numfac));
  const facRenPeriodo = facturasRen.filter(r => facturasNums.has(r.numfac));
  const venta_items = facRenPeriodo.reduce((sum, r) => sum + parseFloat(r.cantidad || '0'), 0);

  let sumBruto = 0;
  let sumNeto = 0;
  facRenPeriodo.forEach(r => {
    const cant = parseFloat(r.cantidad || '0');
    const precio = parseFloat(r.precio || '0');
    const tot = parseFloat(r.tot_ren || '0');
    sumBruto += (cant * precio);
    sumNeto += tot;
  });
  const descuento_ponderado = sumBruto > 0 ? (100 - (sumNeto / sumBruto) * 100) : 0;

  const devPeriodo = devoluciones.filter(d => {
    if (codcli !== 'GLOBAL' && d.cliente !== codcli) return false;
    if (codcli === 'GLOBAL' && inactivos.has(d.cliente)) return false;
    const em = normalizeDate(d.emision);
    return em >= normStart && em <= normEnd;
  });
  const devoluciones_monto = devPeriodo.reduce((sum, d) => sum + parseFloat(d.tot_devo || '0'), 0);
  const devoluciones_pedidos = codcli === 'GLOBAL'
    ? new Set(devPeriodo.map(d => `${d.cliente}|${normalizeDate(d.emision)}`)).size
    : new Set(devPeriodo.map(d => normalizeDate(d.emision))).size;

  const devNums = new Set(devPeriodo.map(d => d.numdevo));
  const devRenPeriodo = devolucionesRen.filter(r => devNums.has(r.numdevo));
  const devoluciones_items = devRenPeriodo.reduce((sum, r) => sum + parseFloat(r.cantidad || '0'), 0);

  const cobCliente = cobranzas.filter(c => {
    if (codcli !== 'GLOBAL' && c.codmovcli !== codcli) return false;
    if (codcli === 'GLOBAL' && inactivos.has(c.codmovcli)) return false;
    return true;
  });

  let sumaDiasXImporte = 0;
  let sumaImportesPagados = 0;
  cobCliente.forEach(c => {
    const importe = parseFloat(c.importe || '0');
    if (importe < 0 && (c.tipo === 'CA' || c.tipo === 'AB')) {
      const em = normalizeDate(c.emision);
      if (em >= normStart && em <= normEnd) {
        const original = cobCliente.find(oc => oc.numdoc === c.numdoc && parseFloat(oc.importe || '0') > 0);
        if (original && original.emision && c.emision) {
          const d1 = parseDate(normalizeDate(original.emision));
          const d2 = parseDate(normalizeDate(c.emision));
          if (d1 && d2) {
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            sumaDiasXImporte += (diffDays * Math.abs(importe));
            sumaImportesPagados += Math.abs(importe);
          }
        }
      }
    }
  });
  const dias_pago = sumaImportesPagados > 0 ? sumaDiasXImporte / sumaImportesPagados : 0;

  const pagosValidos = pagosDetalle.filter(p => {
    if (codcli !== 'GLOBAL' && p.codmovcli !== codcli) return false;
    if (codcli === 'GLOBAL' && inactivos.has(p.codmovcli)) return false;
    if (parseFloat(p.importe || '0') <= 0) return false;
    const em = normalizeDate(p.emision);
    return em >= normStart && em <= normEnd;
  });
  const mixMap = new Map<string, number>();
  pagosValidos.forEach(p => {
    const moneda = p.moneda || 'US$';
    mixMap.set(moneda, (mixMap.get(moneda) || 0) + parseFloat(p.importe || '0'));
  });
  const mix_pagos = Array.from(mixMap.entries()).map(([moneda, monto]) => ({ moneda, monto }));

  return {
    venta_total,
    venta_items,
    pedidos_compra,
    devoluciones_monto,
    devoluciones_items,
    devoluciones_pedidos,
    dias_pago,
    descuento_ponderado,
    mix_pagos
  };
}

export async function getClientComparison(
  codcli: string, 
  periodA: {start: string, end: string}, 
  periodB: {start: string, end: string},
  incluirInactivos: boolean = false
) {
  try {
    const [facturas, facturasRen, devoluciones, devolucionesRen, cobranzas, pagosDetalle] = await Promise.all([
      parseTxtFile('facturas_enc.txt'),
      parseTxtFile('facturas_ren.txt'),
      parseTxtFile('devoluciones_enc.txt'),
      parseTxtFile('devoluciones_ren.txt'),
      parseTxtFile('cobranzas.txt'),
      parseTxtFile('pagos_detalle.txt')
    ]);

    let inactivos = new Set<string>();
    if (!incluirInactivos) {
      inactivos = await getInactiveClientsSet();
    }

    const pA = await calculatePeriodStats(codcli, periodA.start, periodA.end, facturas, facturasRen, devoluciones, devolucionesRen, cobranzas, pagosDetalle, inactivos);
    const pB = await calculatePeriodStats(codcli, periodB.start, periodB.end, facturas, facturasRen, devoluciones, devolucionesRen, cobranzas, pagosDetalle, inactivos);

    const calcVarianza = (valA: number, valB: number) => {
      const abs = valB - valA;
      const pct = valA > 0 ? (abs / valA) * 100 : (valB > 0 ? 100 : 0);
      return { abs, pct };
    };

    const vVentaTotal = calcVarianza(pA.venta_total, pB.venta_total);
    const vVentaItems = calcVarianza(pA.venta_items, pB.venta_items);
    const vPedidosCompra = calcVarianza(pA.pedidos_compra, pB.pedidos_compra);
    const vDevMonto = calcVarianza(pA.devoluciones_monto, pB.devoluciones_monto);
    const vDevItems = calcVarianza(pA.devoluciones_items, pB.devoluciones_items);
    const vDevPedidos = calcVarianza(pA.devoluciones_pedidos, pB.devoluciones_pedidos);
    const vDiasPago = calcVarianza(pA.dias_pago, pB.dias_pago);
    const vDescuento = calcVarianza(pA.descuento_ponderado, pB.descuento_ponderado);

    const dataOverview = codcli === 'GLOBAL' 
      ? await getGlobalOverviewYear('todos', incluirInactivos)
      : await getClientOverviewYear(codcli, 'todos', incluirInactivos);

    return {
      periodoA: pA,
      periodoB: pB,
      varianza: {
        venta_total_abs: vVentaTotal.abs,
        venta_total_pct: vVentaTotal.pct,
        venta_items_abs: vVentaItems.abs,
        venta_items_pct: vVentaItems.pct,
        pedidos_compra_abs: vPedidosCompra.abs,
        pedidos_compra_pct: vPedidosCompra.pct,
        devoluciones_monto_abs: vDevMonto.abs,
        devoluciones_monto_pct: vDevMonto.pct,
        devoluciones_items_abs: vDevItems.abs,
        devoluciones_items_pct: vDevItems.pct,
        devoluciones_pedidos_abs: vDevPedidos.abs,
        devoluciones_pedidos_pct: vDevPedidos.pct,
        dias_pago_abs: vDiasPago.abs,
        dias_pago_pct: vDiasPago.pct,
        descuento_ponderado_abs: vDescuento.abs,
        descuento_ponderado_pct: vDescuento.pct,
      },
      ultima_compra: dataOverview.ultima_compra || 'N/A',
      deuda_actual: dataOverview.deuda_actual || 0,
      vencimiento_cxc: dataOverview.vencimiento_cxc || 'N/A',
      estado_cuenta: dataOverview.estado_cuenta || []
    };
  } catch (error) {
    console.error("Error in getClientComparison:", error);
    return mockComparison;
  }
}
