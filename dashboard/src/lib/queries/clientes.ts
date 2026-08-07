import { parseTxtFile } from './parser';
import { ClientStatementRow } from '../types';

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

function isFacturaValida(f: any): boolean {
  if (!f) return false;
  const anulada = String(f.anulada).toLowerCase();
  return anulada !== 'true' && anulada !== 't' && anulada !== '1';
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
      isFacturaValida(f) &&
      f.tipo !== 'NC' &&
      (f.numfac && f.numfac.toUpperCase().startsWith('D'))
    );
    
    const venta_total = facClienteAnio.reduce((sum, f) => sum + parseFloat(f.tot_fac || '0'), 0);
    // Un pedido = todas las facturas de una misma fecha para este cliente
    const pedidos_compra = new Set(facClienteAnio.map(f => f.emision)).size;
    const pedido_promedio = pedidos_compra > 0 ? venta_total / pedidos_compra : 0;
    
    const bqtoOrdersClient = new Map<string, number>();
    const ccsOrdersClient = new Map<string, number>();
    facClienteAnio.forEach(f => {
      const v = (f.codven || '').toUpperCase();
      const amt = parseFloat(f.tot_fac || '0');
      const pedId = f.emision;
      if (v === '06' || v.startsWith('C')) {
        ccsOrdersClient.set(pedId, (ccsOrdersClient.get(pedId) || 0) + amt);
      } else {
        bqtoOrdersClient.set(pedId, (bqtoOrdersClient.get(pedId) || 0) + amt);
      }
    });
    const totalBqtoClient = Array.from(bqtoOrdersClient.values()).reduce((a, b) => a + b, 0);
    const pedido_promedio_bqto = bqtoOrdersClient.size > 0 ? totalBqtoClient / bqtoOrdersClient.size : 0;
    const totalCcsClient = Array.from(ccsOrdersClient.values()).reduce((a, b) => a + b, 0);
    const pedido_promedio_ccs = ccsOrdersClient.size > 0 ? totalCcsClient / ccsOrdersClient.size : 0;
    
    const facturasNums = new Set(facClienteAnio.map(f => f.numfac));
    const facRenCliente = facturasRen.filter(r => facturasNums.has(r.numfac));
    const venta_items = facRenCliente.reduce((sum, r) => sum + parseFloat(r.cantidad || '0'), 0);
    
    // Descuento Ponderado: Renglones (facturas_ren) + NCs en facturas_enc + NCs en cobranzas (Pronto Pago)
    let sumBruto = 0;
    let sumNetoLineas = 0;
    facRenCliente.forEach(r => {
      const cant = parseFloat(r.cantidad || '0');
      const precio = parseFloat(r.precio || '0');
      const tot = parseFloat(r.tot_ren || '0');
      sumBruto += (cant * precio);
      sumNetoLineas += tot;
    });
    const descLineas = sumBruto > 0 ? (sumBruto - sumNetoLineas) : 0;

    const devNumsSetClient = new Set(devoluciones.map(d => d.numdevo));
    const ncDescuentosClient = facturas.filter(f => 
      f.cliente === codcli && 
      matchesYear(f.emision, year) && 
      isFacturaValida(f) &&
      ((f.numfac && f.numfac.toUpperCase().startsWith('NC')) || f.tipo === 'NC') &&
      !devNumsSetClient.has(f.numfac)
    );
    const descNCsClient = ncDescuentosClient.reduce((sum, f) => sum + Math.abs(parseFloat(f.tot_fac || '0')), 0);

    // NCs de Cobranza (Pronto Pago / Descuentos Financieros en cobranzas.txt)
    // Excluir Devoluciones y Retenciones Fiscales (IVA, ISLR, Retención 75% IVA, NCCLIESP)
    const ncCobranzasClient = cobranzas.filter(c => {
      if ((c.numcli || c.codmovcli) !== codcli || c.tipo !== 'NC' || !matchesYear(c.emision, year)) return false;
      const conc = (c.concepto || '').toUpperCase();
      const ref = (c.refer || '').toUpperCase();
      if (conc.includes('DEVOLUCION') || conc.includes('DEVO') || conc.includes('RETENCION') || conc.includes('IVA') || conc.includes('ISLR') || ref === 'NCCLIESP') {
        return false;
      }
      return true;
    });
    const descNCsCobranzas = ncCobranzasClient.reduce((sum, c) => sum + Math.abs(parseFloat(c.importe || '0')), 0);

    const descuento_factura_monto = Math.round((descLineas + descNCsClient) * 100) / 100;
    const descuento_pp_monto = Math.round(descNCsCobranzas * 100) / 100;
    const descuento_total_monto = Math.round((descuento_factura_monto + descuento_pp_monto) * 100) / 100;
    const descuento_monto = descuento_factura_monto;

    // REGLA DE NEGOCIO: Excluir facturas pendientes por pagar del denominador.
    // Solo considerar facturas pagadas al 100% (canceladas) para el cálculo de descuentos,
    // ya que si no está pagada, no se sabe si tomarán el descuento por pronto pago.
    const saldoFacturas = new Map<string, number>();
    cobranzas.forEach(c => {
      if ((c.numcli || c.codmovcli) === codcli && c.numdoc) {
         const importe = parseFloat(c.importe || '0');
         saldoFacturas.set(c.numdoc, (saldoFacturas.get(c.numdoc) || 0) + importe);
      }
    });

    const baseFacturasProcesadas = facClienteAnio
      .filter(f => {
         const saldo = saldoFacturas.get(f.numfac);
         // Está cancelada si tiene registros en cobranzas y su saldo es <= 0.05
         return saldo !== undefined && saldo <= 0.05;
      })
      .reduce((sum, f) => sum + parseFloat(f.tot_fac || '0'), 0);

    const baseVentaDescuento = baseFacturasProcesadas > 0 ? baseFacturasProcesadas : (venta_total > 0 ? venta_total : (sumBruto > 0 ? sumBruto : 0));
    const descuento_factura_ponderado = baseVentaDescuento > 0 ? Math.min(100, Math.round(((descuento_factura_monto / baseVentaDescuento) * 100) * 100) / 100) : 0;
    const descuento_pp_ponderado = baseVentaDescuento > 0 ? Math.min(100, Math.round(((descuento_pp_monto / baseVentaDescuento) * 100) * 100) / 100) : 0;
    const descuento_total_ponderado = baseVentaDescuento > 0 ? Math.min(100, Math.round(((descuento_total_monto / baseVentaDescuento) * 100) * 100) / 100) : 0;
    const descuento_ponderado = descuento_factura_ponderado;

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
    const cobCliente = cobranzas.filter((c: any) => (c.codmovcli || c.numcli) === codcli);
    
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
    
    // 1. Seed from facturas_enc.txt to catch all unpaid invoices
    const is2025OrLater = (dateStr: string) => {
      if (!dateStr) return false;
      let yStr = '';
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        yStr = parts.length === 3 ? parts[2] : '';
      } else if (dateStr.includes('-')) {
        yStr = dateStr.substring(0, 4);
      } else {
        yStr = dateStr.substring(0, 4);
      }
      const y = parseInt(yStr);
      return !isNaN(y) && y >= 2025;
    };

    facturas.filter(f => f.cliente === codcli && isFacturaValida(f) && is2025OrLater(f.emision)).forEach(f => {
      if (f.numfac && f.numfac.toUpperCase().startsWith('NC')) return;
      
      const val = Math.abs(parseFloat((f.tot_fac || '0').replace(',', '.')));
      if (!facturasCxc.has(f.numfac)) {
        facturasCxc.set(f.numfac, {
          nota: f.numfac,
          deuda_original: val,
          abonado: 0,
          saldo: val,
          emision: f.emision,
          vencimiento: f.vence || f.emision 
        });
      }
    });

    // 2. Process cobranzas.txt for payments and additional debt (ND)
    cobCliente.forEach(c => {
      if (!is2025OrLater(c.emision)) return;

      if (!facturasCxc.has(c.numdoc)) {
        facturasCxc.set(c.numdoc, { 
          nota: c.numdoc, 
          deuda_original: 0, 
          abonado: 0, 
          saldo: 0, 
          emision: c.emision,
          vencimiento: c.vence || c.emision 
        });
      }
      const fac = facturasCxc.get(c.numdoc);
      
      // FIX: Replace comma with dot for parseFloat
      let rawImporteStr = (c.importe || '0').replace(',', '.');
      let importeRaw = parseFloat(rawImporteStr);
      // Si empieza con 000, es en Bs. Convertir a USD usando la tasa del día de la emisión del documento original
      if (c.numdoc && c.numdoc.startsWith('000')) {
        // Encontrar la emisión original de la factura para saber qué tasa usar
        const original = cobCliente.find(oc => oc.numdoc === c.numdoc && parseFloat((oc.importe || '0').replace(',', '.')) > 0);
        let fechaParaTasa = (original && original.emision) ? original.emision : c.emision;
        if (fechaParaTasa && fechaParaTasa.includes('/')) {
          const parts = fechaParaTasa.split('/');
          if (parts.length === 3) fechaParaTasa = `${parts[2]}${parts[1].padStart(2,'0')}${parts[0].padStart(2,'0')}`;
        }
        const tasaDelDia = getTasa(fechaParaTasa);
        if (tasaDelDia > 0) {
          importeRaw = importeRaw / tasaDelDia;
        }
      }
      const importe = importeRaw;

      const tipoDoc = (c.tipo || '').trim().toUpperCase();
      const val = Math.abs(importe);
      
      if (tipoDoc === 'FC' || tipoDoc === 'ND') {
        if (fac.deuda_original === 0) {
          fac.deuda_original += val;
          fac.saldo += val;
        }
        // Always update emision and vencimiento just in case
        fac.emision = c.emision;
        fac.vencimiento = c.vence || c.emision;
      } else {
        fac.abonado += val;
        fac.saldo -= val;
      }
    });

    const refDate = new Date();
    refDate.setHours(0,0,0,0);

    const parseVenceDate = (venceStr: string) => {
      if (!venceStr) return null;
      let clean = venceStr.trim();
      if (clean.includes('/')) {
        const parts = clean.split('/');
        if (parts.length === 3) clean = `${parts[2]}${parts[1].padStart(2,'0')}${parts[0].padStart(2,'0')}`;
      } else if (clean.includes('-')) {
        const parts = clean.substring(0, 10).split('-');
        if (parts.length === 3) clean = `${parts[0]}${parts[1].padStart(2,'0')}${parts[2].padStart(2,'0')}`;
      }
      if (clean.length === 8) {
        const y = parseInt(clean.substring(0, 4));
        const m = parseInt(clean.substring(4, 6)) - 1;
        const d = parseInt(clean.substring(6, 8));
        return new Date(y, m, d);
      }
      return null;
    };

    const estado_cuenta = Array.from(facturasCxc.values())
      .filter(f => f.saldo > 0.01)
      .map(f => {
        const venceDate = parseVenceDate(f.vencimiento);
        let mora = 0;
        let estado_texto = "Al día";
        if (venceDate) {
          const diffTime = refDate.getTime() - venceDate.getTime();
          mora = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (mora > 0) {
            estado_texto = `${mora} días de vencido`;
          } else if (mora < 0) {
            estado_texto = `${Math.abs(mora)} días por vencer`;
          }
        }
        return { ...f, mora, estado_texto };
      });
    
    const deuda_actual = estado_cuenta.reduce((sum, f) => sum + f.saldo, 0);
    
    // Sort to find oldest expiration
    estado_cuenta.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
    const vencimiento_cxc = estado_cuenta.length > 0 ? estado_cuenta[0].vencimiento : null;

    // Días de pago promedio (solo para el año en curso)
    const facEmisionMapClient = new Map<string, string>();
    facturas.filter(f => f.cliente === codcli).forEach(f => {
      if (f.numfac) facEmisionMapClient.set(f.numfac, f.emision);
    });

    let sumaDiasXImporte = 0;
    let sumaImportesPagados = 0;
    cobCliente.forEach(c => {
      const importe = parseFloat(c.importe || '0');
      if (importe < 0 && (c.tipo === 'CA' || c.tipo === 'AB')) { // Es un pago
        if (matchesYear(c.emision, year)) {
          // Find original invoice date from cobranzas or facturas_enc
          const originalInCob = cobCliente.find(oc => oc.numdoc === c.numdoc && parseFloat(oc.importe || '0') > 0);
          const fechaEmisionFac = (originalInCob && originalInCob.emision) ? originalInCob.emision : facEmisionMapClient.get(c.numdoc);
          
          if (fechaEmisionFac && c.emision) {
             const d1 = parseDate(fechaEmisionFac);
             const d2 = parseDate(c.emision);
             if (d1 && d2) {
               const diffTime = d2.getTime() - d1.getTime();
               const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
               sumaDiasXImporte += (diffDays * Math.abs(importe));
               sumaImportesPagados += Math.abs(importe);
             }
          }
        }
      }
    });
    const dias_pago_promedio = sumaImportesPagados > 0 ? Math.round((sumaDiasXImporte / sumaImportesPagados) * 10) / 10 : 0;

    // Mix Pagos (sólo del año en curso) - Lógica unificada
    const mixMap = new Map<string, number>();
    const processedDocKeys = new Set<string>();

    // 1. Procesar registros de pagos_detalle
    const pagosCliente = pagosDetalle.filter(p => p.codmovcli === codcli && parseFloat(p.importe || '0') > 0 && matchesYear(p.emision, year));
    pagosCliente.forEach(p => {
      let val = parseFloat(p.importe || '0');
      const isBs = (p.numdoc && p.numdoc.startsWith('000')) || p.moneda === 'Bs.';
      const moneda = isBs ? 'Bs.' : (p.moneda && p.moneda.trim() !== '' ? p.moneda : 'US$');
      mixMap.set(moneda, (mixMap.get(moneda) || 0) + val);
      if (p.numdoc) processedDocKeys.add(`${p.codmovcli}_${p.numdoc}`);
    });

    // 2. Complementar con cobranzas.txt para recibos/pagos no cargados en pagos_detalle
    const cobClientePagos = cobCliente.filter(c => 
      parseFloat(c.importe || '0') < 0 && 
      (c.tipo === 'CA' || c.tipo === 'AB') &&
      matchesYear(c.emision, year)
    );
    cobClientePagos.forEach(c => {
      const key = `${c.numcli || c.codmovcli}_${c.numdoc}`;
      if (processedDocKeys.has(key)) return;

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
      pedido_promedio_bqto, pedido_promedio_ccs,
      meta_venta, devoluciones_monto, devoluciones_items, devoluciones_pedidos,
      indice_dev_monto, indice_dev_items, indice_dev_pedidos,
      descuento_ponderado, descuento_monto,
      descuento_factura_ponderado, descuento_factura_monto,
      descuento_pp_ponderado, descuento_pp_monto,
      descuento_total_ponderado, descuento_total_monto,
      dias_pago_promedio, ultima_compra, deuda_actual, vencimiento_cxc,
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
    const [facturas, facturasRen, cobranzas, pagosDetalle] = await Promise.all([
      parseTxtFile('facturas_enc.txt'),
      parseTxtFile('facturas_ren.txt'),
      parseTxtFile('cobranzas.txt'),
      parseTxtFile('pagos_detalle.txt')
    ]);
    const facCliente = facturas.filter(f => f.cliente === codcli && isFacturaValida(f) && f.tipo !== 'NC' && (f.numfac && f.numfac.toUpperCase().startsWith('D')));
    
    const facturasNums = new Set(facCliente.map(f => f.numfac));
    const facturasRenFiltrado = facturasRen.filter(r => facturasNums.has(r.numfac));
    const itemsPorFactura = new Map<string, number>();
    facturasRenFiltrado.forEach(r => {
      itemsPorFactura.set(r.numfac, (itemsPorFactura.get(r.numfac) || 0) + parseFloat(r.cantidad || '0'));
    });
    
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
      data.venta_items += itemsPorFactura.get(f.numfac) || 0;
    });

    const resumen_anios = Array.from(resumenMap.values()).map(d => ({
       ...d,
       pedidos: d.pedidosSet.size
    })).sort((a,b) => a.anio - b.anio);
    const venta_total_hist = resumen_anios.reduce((s, d) => s + d.venta_total, 0);

    const cobCliente = cobranzas.filter((c: any) => (c.numcli || c.codmovcli) === codcli);
    
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
    cobCliente.forEach(c => {
      if (!facturasCxc.has(c.numdoc)) {
        facturasCxc.set(c.numdoc, { 
          nota: c.numdoc, 
          deuda_original: 0, 
          abonado: 0, 
          saldo: 0, 
          emision: c.emision,
          vencimiento: c.vence || c.emision 
        });
      }
      const fac = facturasCxc.get(c.numdoc);
      
      let rawImporteStr = (c.importe || '0').replace(',', '.');
      let importeRaw = parseFloat(rawImporteStr);
      if (c.numdoc && c.numdoc.startsWith('000')) {
        const original = cobCliente.find(oc => oc.numdoc === c.numdoc && parseFloat((oc.importe || '0').replace(',', '.')) > 0);
        let fechaParaTasa = (original && original.emision) ? original.emision : c.emision;
        if (fechaParaTasa && fechaParaTasa.includes('/')) {
          const parts = fechaParaTasa.split('/');
          if (parts.length === 3) fechaParaTasa = `${parts[2]}${parts[1].padStart(2,'0')}${parts[0].padStart(2,'0')}`;
        }
        const tasaDelDia = getTasa(fechaParaTasa);
        if (tasaDelDia > 0) {
          importeRaw = importeRaw / tasaDelDia;
        }
      }
      const importe = importeRaw;

      const tipoDoc = (c.tipo || '').trim().toUpperCase();
      const val = Math.abs(importe);
      
      if (tipoDoc === 'FC' || tipoDoc === 'ND') {
        fac.deuda_original += val;
        fac.saldo += val;
        fac.emision = c.emision;
        fac.vencimiento = c.vence || c.emision;
      } else {
        fac.abonado += val;
        fac.saldo -= val;
      }
    });

    const refDate = new Date();
    refDate.setHours(0,0,0,0);

    const parseVenceDate = (venceStr: string) => {
      if (!venceStr) return null;
      let clean = venceStr.trim();
      if (clean.includes('/')) {
        const parts = clean.split('/');
        if (parts.length === 3) clean = `${parts[2]}${parts[1].padStart(2,'0')}${parts[0].padStart(2,'0')}`;
      } else if (clean.includes('-')) {
        const parts = clean.substring(0, 10).split('-');
        if (parts.length === 3) clean = `${parts[0]}${parts[1].padStart(2,'0')}${parts[2].padStart(2,'0')}`;
      }
      if (clean.length === 8) {
        const y = parseInt(clean.substring(0, 4));
        const m = parseInt(clean.substring(4, 6)) - 1;
        const d = parseInt(clean.substring(6, 8));
        return new Date(y, m, d);
      }
      return null;
    };

    const estado_cuenta = Array.from(facturasCxc.values())
      .filter(f => f.saldo > 0.01)
      .map(f => {
        const venceDate = parseVenceDate(f.vencimiento);
        let mora = 0;
        if (venceDate) {
          const diffTime = refDate.getTime() - venceDate.getTime();
          mora = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        return { ...f, mora };
      });

    const deuda_actual = estado_cuenta.reduce((sum, f) => sum + f.saldo, 0);

    return {
      total_historico: {
        ...mockHistorico.total_historico,
        venta_total: venta_total_hist,
        pedidos_compra: resumen_anios.reduce((s, d) => s + d.pedidos, 0),
        deuda_actual,
        estado_cuenta
      },
      resumen_anios
    };
  } catch (error) {
    console.error("Error in getClientHistorical:", error);
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
      isFacturaValida(f) &&
      f.tipo !== 'NC' && (!inactivos.has(f.cliente)) &&
      (f.numfac && f.numfac.toUpperCase().startsWith('D'))
    );
    
    const venta_total = facAnio.reduce((sum, f) => sum + parseFloat(f.tot_fac || '0'), 0);
    // Para el global, un pedido es único por cliente y fecha
    const pedidos_compra = new Set(facAnio.map(f => `${f.cliente}|${f.emision}`)).size;
    const pedido_promedio = pedidos_compra > 0 ? venta_total / pedidos_compra : 0;
    
    const bqtoOrdersGlobal = new Map<string, number>();
    const ccsOrdersGlobal = new Map<string, number>();
    facAnio.forEach(f => {
      const v = (f.codven || '').toUpperCase();
      const amt = parseFloat(f.tot_fac || '0');
      const pedId = `${f.cliente}|${f.emision}`;
      if (v === '06' || v.startsWith('C')) {
        ccsOrdersGlobal.set(pedId, (ccsOrdersGlobal.get(pedId) || 0) + amt);
      } else {
        bqtoOrdersGlobal.set(pedId, (bqtoOrdersGlobal.get(pedId) || 0) + amt);
      }
    });
    const totalBqtoGlobal = Array.from(bqtoOrdersGlobal.values()).reduce((a, b) => a + b, 0);
    const pedido_promedio_bqto = bqtoOrdersGlobal.size > 0 ? totalBqtoGlobal / bqtoOrdersGlobal.size : 0;
    const totalCcsGlobal = Array.from(ccsOrdersGlobal.values()).reduce((a, b) => a + b, 0);
    const pedido_promedio_ccs = ccsOrdersGlobal.size > 0 ? totalCcsGlobal / ccsOrdersGlobal.size : 0;
    
    const facturasNums = new Set(facAnio.map(f => f.numfac));
    const facRenCliente = facturasRen.filter(r => facturasNums.has(r.numfac));
    const venta_items = facRenCliente.reduce((sum, r) => sum + parseFloat(r.cantidad || '0'), 0);
    
    let sumBruto = 0;
    let sumNetoLineas = 0;
    facRenCliente.forEach(r => {
      const cant = parseFloat(r.cantidad || '0');
      const precio = parseFloat(r.precio || '0');
      const tot = parseFloat(r.tot_ren || '0');
      sumBruto += (cant * precio);
      sumNetoLineas += tot;
    });
    const descLineas = sumBruto > 0 ? (sumBruto - sumNetoLineas) : 0;

    const devNumsSetGlobal = new Set(devoluciones.map(d => d.numdevo));
    const ncDescuentosGlobal = facturas.filter(f => 
      matchesYear(f.emision, year) && (!inactivos.has(f.cliente)) && isFacturaValida(f) &&
      ((f.numfac && f.numfac.toUpperCase().startsWith('NC')) || f.tipo === 'NC') &&
      !devNumsSetGlobal.has(f.numfac)
    );
    const descNCsGlobal = ncDescuentosGlobal.reduce((sum, f) => sum + Math.abs(parseFloat(f.tot_fac || '0')), 0);

    const ncCobranzasGlobal = cobranzas.filter(c => {
      if (inactivos.has(c.numcli || c.codmovcli) || c.tipo !== 'NC' || !matchesYear(c.emision, year)) return false;
      const conc = (c.concepto || '').toUpperCase();
      const ref = (c.refer || '').toUpperCase();
      if (conc.includes('DEVOLUCION') || conc.includes('DEVO') || conc.includes('RETENCION') || conc.includes('IVA') || conc.includes('ISLR') || ref === 'NCCLIESP') {
        return false;
      }
      return true;
    });
    const descNCsCobranzasGlobal = ncCobranzasGlobal.reduce((sum, c) => sum + Math.abs(parseFloat(c.importe || '0')), 0);

    const descuento_factura_monto = Math.round((descLineas + descNCsGlobal) * 100) / 100;
    const descuento_pp_monto = Math.round(descNCsCobranzasGlobal * 100) / 100;
    const descuento_total_monto = Math.round((descuento_factura_monto + descuento_pp_monto) * 100) / 100;

    const baseDenominador = sumBruto > 0 ? sumBruto : (venta_total > 0 ? venta_total : 1);

    const descuento_factura_ponderado = Math.min(100, Math.round(((descuento_factura_monto / baseDenominador) * 100) * 100) / 100);
    const descuento_pp_ponderado = Math.min(100, Math.round(((descuento_pp_monto / baseDenominador) * 100) * 100) / 100);
    const descuento_total_ponderado = Math.min(100, Math.round(((descuento_total_monto / baseDenominador) * 100) * 100) / 100);

    const descuento_monto = descuento_factura_monto;
    const descuento_ponderado = descuento_factura_ponderado;

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
    const cobValidos = cobranzas.filter((c: any) => !inactivos.has(c.numcli || c.codmovcli));
    
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
        facturasCxc.set(c.numdoc, { 
          nota: c.numdoc, 
          deuda_original: 0, 
          abonado: 0, 
          saldo: 0, 
          emision: c.emision,
          vencimiento: c.vence || c.emision 
        });
      }
      const fac = facturasCxc.get(c.numdoc);

      // FIX: Replace comma with dot for parseFloat
      let rawImporteStr = (c.importe || '0').replace(',', '.');
      let importeRaw = parseFloat(rawImporteStr);
      
      if (c.numdoc && c.numdoc.startsWith('000')) {
        const original = cobValidos.find(oc => oc.numdoc === c.numdoc && parseFloat((oc.importe || '0').replace(',', '.')) > 0);
        let fechaParaTasa = (original && original.emision) ? original.emision : c.emision;
        if (fechaParaTasa && fechaParaTasa.includes('/')) {
          const parts = fechaParaTasa.split('/');
          if (parts.length === 3) fechaParaTasa = `${parts[2]}${parts[1].padStart(2,'0')}${parts[0].padStart(2,'0')}`;
        }
        const tasaDelDia = getTasa(fechaParaTasa);
        if (tasaDelDia > 0) {
          importeRaw = importeRaw / tasaDelDia;
        }
      }
      const importe = importeRaw;

      const tipoDoc = (c.tipo || '').trim().toUpperCase();
      const val = Math.abs(importe);
      
      if (tipoDoc === 'FC' || tipoDoc === 'ND') {
        fac.deuda_original += val;
        fac.saldo += val;
        fac.emision = c.emision;
        fac.vencimiento = c.vence || c.emision;
      } else {
        fac.abonado += val;
        fac.saldo -= val;
      }
    });

    const refDate = new Date();
    refDate.setHours(0,0,0,0);

    const parseVenceDate = (venceStr: string) => {
      if (!venceStr) return null;
      let clean = venceStr.trim();
      if (clean.includes('/')) {
        const parts = clean.split('/');
        if (parts.length === 3) clean = `${parts[2]}${parts[1].padStart(2,'0')}${parts[0].padStart(2,'0')}`;
      } else if (clean.includes('-')) {
        const parts = clean.substring(0, 10).split('-');
        if (parts.length === 3) clean = `${parts[0]}${parts[1].padStart(2,'0')}${parts[2].padStart(2,'0')}`;
      }
      if (clean.length === 8) {
        const y = parseInt(clean.substring(0, 4));
        const m = parseInt(clean.substring(4, 6)) - 1;
        const d = parseInt(clean.substring(6, 8));
        return new Date(y, m, d);
      }
      return null;
    };

    const estado_cuenta = Array.from(facturasCxc.values())
      .filter(f => f.saldo > 0.01)
      .map(f => {
        const venceDate = parseVenceDate(f.vencimiento);
        let mora = 0;
        if (venceDate) {
          const diffTime = refDate.getTime() - venceDate.getTime();
          mora = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        return { ...f, mora };
      });
    const deuda_actual = estado_cuenta.reduce((sum, f) => sum + f.saldo, 0);
    
    const facEmisionMapGlobal = new Map<string, string>();
    facturas.forEach(f => {
      if (f.numfac) facEmisionMapGlobal.set(f.numfac, f.emision);
    });

    let sumaDiasXImporte = 0;
    let sumaImportesPagados = 0;
    cobValidos.forEach(c => {
      const importe = parseFloat(c.importe || '0');
      if (importe < 0 && (c.tipo === 'CA' || c.tipo === 'AB')) { 
        if (matchesYear(c.emision, year)) {
          const originalInCob = cobValidos.find(oc => oc.numdoc === c.numdoc && parseFloat(oc.importe || '0') > 0);
          const fechaEmisionFac = (originalInCob && originalInCob.emision) ? originalInCob.emision : facEmisionMapGlobal.get(c.numdoc);
          
          if (fechaEmisionFac && c.emision) {
             const d1 = parseDate(fechaEmisionFac);
             const d2 = parseDate(c.emision);
             if (d1 && d2) {
               const diffTime = d2.getTime() - d1.getTime();
               const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
               sumaDiasXImporte += (diffDays * Math.abs(importe));
               sumaImportesPagados += Math.abs(importe);
             }
          }
        }
      }
    });
    const dias_pago_promedio = sumaImportesPagados > 0 ? Math.round((sumaDiasXImporte / sumaImportesPagados) * 10) / 10 : 0;

    // Mix Pagos (Global) - Lógica unificada con cobranzas y pagos_detalle
    const mixMapGlobal = new Map<string, number>();
    const processedDocKeysGlobal = new Set<string>();

    const pagosValidos = pagosDetalle.filter(p => !inactivos.has(p.codmovcli) && parseFloat(p.importe || '0') > 0 && matchesYear(p.emision, year));
    pagosValidos.forEach(p => {
      let val = parseFloat(p.importe || '0');
      const isBs = (p.numdoc && p.numdoc.startsWith('000')) || p.moneda === 'Bs.';
      const moneda = isBs ? 'Bs.' : (p.moneda && p.moneda.trim() !== '' ? p.moneda : 'US$');
      mixMapGlobal.set(moneda, (mixMapGlobal.get(moneda) || 0) + val);
      if (p.codmovcli && p.numdoc) processedDocKeysGlobal.add(`${p.codmovcli}_${p.numdoc}`);
    });

    const cobValidosPagos = cobValidos.filter(c => 
      parseFloat(c.importe || '0') < 0 && 
      (c.tipo === 'CA' || c.tipo === 'AB') &&
      matchesYear(c.emision, year)
    );
    cobValidosPagos.forEach(c => {
      const key = `${c.numcli || c.codmovcli}_${c.numdoc}`;
      if (processedDocKeysGlobal.has(key)) return;

      const isBs = c.numdoc && c.numdoc.startsWith('000');
      const moneda = isBs ? 'Bs.' : 'US$';
      let val = Math.abs(parseFloat(c.importe || '0'));
      if (isBs) {
        const original = cobValidos.find((oc: any) => (oc.numcli || oc.codmovcli) === (c.numcli || c.codmovcli) && oc.numdoc === c.numdoc && parseFloat(oc.importe || '0') > 0);
        const fechaTasa = (original && original.emision) ? original.emision : c.emision;
        const tasa = getTasa(fechaTasa);
        if (tasa > 0) val = val / tasa;
      }
      mixMapGlobal.set(moneda, (mixMapGlobal.get(moneda) || 0) + val);
    });

    const mix_pagos = Array.from(mixMapGlobal.entries()).map(([moneda, monto]) => ({
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
      pedido_promedio_bqto, pedido_promedio_ccs,
      meta_venta, devoluciones_monto, devoluciones_items, devoluciones_pedidos,
      indice_dev_monto, indice_dev_items, indice_dev_pedidos,
      descuento_ponderado, descuento_monto,
      descuento_factura_ponderado, descuento_factura_monto,
      descuento_pp_ponderado, descuento_pp_monto,
      descuento_total_ponderado, descuento_total_monto,
      dias_pago_promedio, ultima_compra: null, deuda_actual, vencimiento_cxc: null,
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
    const facturasRen = await parseTxtFile('facturas_ren.txt');
    
    let inactivos = new Set<string>();
    if (!incluirInactivos) {
      inactivos = await getInactiveClientsSet();
    }

    const facCliente = facturas.filter(f => f.tipo !== 'NC' && isFacturaValida(f) && (!inactivos.has(f.cliente)) && (f.numfac && f.numfac.toUpperCase().startsWith('D')));
    
    const facturasNums = new Set(facCliente.map(f => f.numfac));
    const facturasRenFiltrado = facturasRen.filter(r => facturasNums.has(r.numfac));
    const itemsPorFactura = new Map<string, number>();
    facturasRenFiltrado.forEach(r => {
      itemsPorFactura.set(r.numfac, (itemsPorFactura.get(r.numfac) || 0) + parseFloat(r.cantidad || '0'));
    });
    
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
      data.venta_items += itemsPorFactura.get(f.numfac) || 0;
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
    if (!isFacturaValida(f)) return false;
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
  let sumNetoLineas = 0;
  facRenPeriodo.forEach(r => {
    const cant = parseFloat(r.cantidad || '0');
    const precio = parseFloat(r.precio || '0');
    const tot = parseFloat(r.tot_ren || '0');
    sumBruto += (cant * precio);
    sumNetoLineas += tot;
  });
  const descLineas = sumBruto > 0 ? (sumBruto - sumNetoLineas) : 0;

  const devNumsSetPeriod = new Set(devoluciones.map(d => d.numdevo));
  const ncDescuentosPeriod = facturas.filter(f => {
    if (codcli !== 'GLOBAL' && f.cliente !== codcli) return false;
    if (codcli === 'GLOBAL' && inactivos.has(f.cliente)) return false;
    if (!isFacturaValida(f)) return false;
    if (!((f.numfac && f.numfac.toUpperCase().startsWith('NC')) || f.tipo === 'NC')) return false;
    if (devNumsSetPeriod.has(f.numfac)) return false;
    const em = normalizeDate(f.emision);
    return em >= normStart && em <= normEnd;
  });
  const descNCsPeriod = ncDescuentosPeriod.reduce((sum, f) => sum + Math.abs(parseFloat(f.tot_fac || '0')), 0);

  const descuento_monto = Math.round((descLineas + descNCsPeriod) * 100) / 100;
  const descuento_ponderado = sumBruto > 0 ? Math.min(100, Math.round(((descuento_monto / sumBruto) * 100) * 100) / 100) : 0;

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
    if (codcli !== 'GLOBAL' && (c.numcli || c.codmovcli) !== codcli) return false;
    if (codcli === 'GLOBAL' && inactivos.has(c.numcli || c.codmovcli)) return false;
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
    descuento_monto,
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

export async function getClientStatement(
  codcliParam: string,
  year: number | string = 'todos'
): Promise<ClientStatementRow[]> {
  try {
    const codcliTarget = decodeURIComponent(codcliParam).trim().toUpperCase();
    const cobranzas = await parseTxtFile('cobranzas.txt');
    
    const statementRows: Omit<ClientStatementRow, 'saldo_progresivo'>[] = [];
    
    for (const row of cobranzas) {
      if ((row.numcli || row.codmovcli) !== codcliTarget) continue;
      if (!matchesYear(row.emision, year)) continue;
      
      const tipo = (row.tipo || '').trim().toUpperCase();
      let importe = parseFloat((row.importe || '0').replace(',', '.'));
      
      // En cobranzas.txt las facturas (Cargos) vienen positivo y los pagos/NC (Abonos) negativo.
      let cargo = 0;
      let abono = 0;
      const val = Math.abs(importe);
      
      if (tipo === 'FC' || tipo === 'ND') {
        cargo = val;
      } else {
        abono = val;
      }
      
      statementRows.push({
        fecha: row.emision,
        documento: row.numdoc || 'N/A',
        tipo: tipo,
        concepto: row.concepto || row.refer || 'N/A',
        cargo: cargo,
        abono: abono
      });
    }
    
    // Ordenar cronológicamente
    statementRows.sort((a, b) => a.fecha.localeCompare(b.fecha));
    
    // Calcular saldo progresivo
    let saldo = 0;
    const result: ClientStatementRow[] = [];
    
    for (const row of statementRows) {
      saldo = saldo + row.cargo - row.abono;
      result.push({
        ...row,
        saldo_progresivo: saldo
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error obteniendo estado de cuenta del cliente", error);
    return [];
  }
}
