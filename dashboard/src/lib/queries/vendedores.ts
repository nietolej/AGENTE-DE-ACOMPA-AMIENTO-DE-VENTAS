import { parseTxtFile } from './parser';
import { getInactiveClientsSet } from './clientes';
import { VendorListItem, VendorDetail, VendorTopClient, VendorTopProduct, VendorCompareData, VendorDormantClient } from '../types';

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

const ADMIN_CODES = new Set(['00', 'C1', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'D0', 'D1', 'D2', '12']);

export async function getVendedoresList(
  year: number | string = 'todos',
  search: string = '',
  limit: number = 100,
  orderBy: 'monto' | 'pedidos' | 'clientes' = 'monto',
  incluirAdministrativos: boolean = false
): Promise<VendorListItem[]> {
  try {
    const vendedores = await parseTxtFile('vendedores.txt');
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const devoluciones_enc = await parseTxtFile('devoluciones_enc.txt');
    const inactivos = await getInactiveClientsSet();

    // Map de vendedores maestro
    const vendorMap = new Map<string, VendorListItem>();

    for (const v of vendedores) {
      const code = (v.codven || v.codigo || '').trim().toUpperCase();
      if (!code) continue;

      const nomven = (v.nomven || v.nombre || '').trim();
      const isAdmin = ADMIN_CODES.has(code) || !nomven || code === '00';

      vendorMap.set(code, {
        codvend: code,
        nomvend: nomven || `CÓDIGO ADMINISTRATIVO (${code})`,
        email: v.email || '',
        tlf1: v.tlf1 || '',
        cif: v.cif || '',
        venta_total: 0,
        cant_facturas: 0,
        clientes_atendidos: 0,
        devoluciones_monto: 0,
        pct_devoluciones: 0,
        meta_venta: 0,
        pct_cumplimiento: 0,
        is_administrative: isAdmin,
        cobertura_cartera: 0,
        concentracion_top3: 0,
      });
    }

    // Identificar facturas válidas y procesar ventas por vendedor
    const vendorClientsSet = new Map<string, Set<string>>();
    const vendorFacturasSet = new Map<string, Set<string>>();
    const vendorClientSales = new Map<string, Map<string, number>>();

    for (const f of facturas_enc) {
      if (f.tipo === 'NC') continue;
      if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) continue;
      if (!isFacturaValida(f)) continue;
      if (!matchesYear(f.emision, year)) continue;
      if (inactivos.has(f.cliente)) continue;

      const codven = (f.codven || f.vendedor || '').trim().toUpperCase();
      if (!codven) continue;

      let vData = vendorMap.get(codven);
      if (!vData) {
        const isAdmin = ADMIN_CODES.has(codven) || codven === '00';
        vData = {
          codvend: codven,
          nomvend: `VENDEDOR (${codven})`,
          email: '',
          tlf1: '',
          cif: '',
          venta_total: 0,
          cant_facturas: 0,
          clientes_atendidos: 0,
          devoluciones_monto: 0,
          pct_devoluciones: 0,
          meta_venta: 0,
          pct_cumplimiento: 0,
          is_administrative: isAdmin,
          cobertura_cartera: 0,
          concentracion_top3: 0,
        };
        vendorMap.set(codven, vData);
      }


      const amt = parseFloat(f.tot_fac || '0');
      vData.venta_total += amt;

      if (!vendorClientsSet.has(codven)) vendorClientsSet.set(codven, new Set());
      if (f.cliente) {
        vendorClientsSet.get(codven)!.add(f.cliente);
        if (!vendorClientSales.has(codven)) vendorClientSales.set(codven, new Map());
        const cMap = vendorClientSales.get(codven)!;
        cMap.set(f.cliente, (cMap.get(f.cliente) || 0) + amt);
      }

      if (!vendorFacturasSet.has(codven)) vendorFacturasSet.set(codven, new Set());
      if (f.numfac) vendorFacturasSet.get(codven)!.add(f.numfac);
    }

    // Devoluciones por vendedor
    for (const d of devoluciones_enc) {
      if (!matchesYear(d.emision, year)) continue;
      if (inactivos.has(d.cliente)) continue;

      const codven = (d.codven || d.vendedor || '').trim().toUpperCase();
      const vData = vendorMap.get(codven);
      if (vData) {
        vData.devoluciones_monto += parseFloat(d.tot_devo || '0');
      }
    }

    const clientes = await parseTxtFile('clientes.txt');

    // Mapear clientes asignados por vendedor
    const assignedPerVendor = new Map<string, number>();
    for (const c of clientes) {
      const cCodven = (c.vendedor || c.codven || '').trim().toUpperCase();
      if (cCodven && c.codcli && !inactivos.has(c.codcli)) {
        assignedPerVendor.set(cCodven, (assignedPerVendor.get(cCodven) || 0) + 1);
      }
    }

    let result = Array.from(vendorMap.values()).map(v => {
      const clients = vendorClientsSet.get(v.codvend);
      const invoices = vendorFacturasSet.get(v.codvend);
      const cant_facturas = invoices ? invoices.size : 0;
      const clientes_atendidos = clients ? clients.size : 0;
      const totalAsignados = assignedPerVendor.get(v.codvend) || clientes_atendidos;
      const cobertura_cartera = totalAsignados > 0 ? (clientes_atendidos / totalAsignados) * 100 : (clientes_atendidos > 0 ? 100 : 0);
      const pct_devoluciones = v.venta_total > 0 ? (v.devoluciones_monto / v.venta_total) * 100 : 0;

      // Meta estimada ($15,000 / año como base si no hay explicita)
      const meta_venta = year === 'todos' ? 30000 : 15000;
      const pct_cumplimiento = meta_venta > 0 ? (v.venta_total / meta_venta) * 100 : 0;
      
      let concentracion_top3 = 0;
      const cSalesMap = vendorClientSales.get(v.codvend);
      if (cSalesMap && v.venta_total > 0) {
        const sortedSales = Array.from(cSalesMap.values()).sort((a, b) => b - a);
        const top3 = sortedSales.slice(0, 3).reduce((sum, val) => sum + val, 0);
        concentracion_top3 = (top3 / v.venta_total) * 100;
      }

      return {
        ...v,
        venta_total: Math.round(v.venta_total * 100) / 100,
        cant_facturas,
        clientes_atendidos,
        cobertura_cartera: Math.round(cobertura_cartera * 10) / 10,
        concentracion_top3: Math.round(concentracion_top3 * 10) / 10,
        devoluciones_monto: Math.round(v.devoluciones_monto * 100) / 100,
        pct_devoluciones: Math.round(pct_devoluciones * 10) / 10,
        meta_venta,
        pct_cumplimiento: Math.round(pct_cumplimiento * 10) / 10,
      };
    });


    // Filtrar administrativos si no se solicitan
    if (!incluirAdministrativos) {
      result = result.filter(v => !v.is_administrative);
    }

    // Filtrar búsqueda por término (código, nombre, email, RIF)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(v =>
        v.codvend.toLowerCase().includes(q) ||
        v.nomvend.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.cif.toLowerCase().includes(q)
      );
    }

    // Ordenamiento
    if (orderBy === 'pedidos') {
      result.sort((a, b) => b.cant_facturas - a.cant_facturas);
    } else if (orderBy === 'clientes') {
      result.sort((a, b) => b.clientes_atendidos - a.clientes_atendidos);
    } else {
      result.sort((a, b) => b.venta_total - a.venta_total);
    }

    return result.slice(0, limit);
  } catch (error) {
    console.error("Error obteniendo lista de vendedores", error);
    return [];
  }
}

/**
 * Obtener detalle completo de un vendedor específico (Módulo 3)
 */
export async function getVendedorDetail(
  codvendParam: string,
  year: number | string = 'todos'
): Promise<VendorDetail | null> {
  try {
    const codTarget = decodeURIComponent(codvendParam).trim().toUpperCase();
    const vendedores = await parseTxtFile('vendedores.txt');
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const facturas_ren = await parseTxtFile('facturas_ren.txt');
    const devoluciones_enc = await parseTxtFile('devoluciones_enc.txt');
    const devoluciones_ren = await parseTxtFile('devoluciones_ren.txt');
    const clientes = await parseTxtFile('clientes.txt');
    const inventario = await parseTxtFile('inventario.txt');
    const inactivos = await getInactiveClientsSet();

    const clientMap = new Map<string, string>();
    for (const c of clientes) {
      if (c.codcli) clientMap.set(c.codcli, c.nomcli || c.codcli);
    }

    const prodMap = new Map<string, { nomart: string, grupo: string }>();
    for (const p of inventario) {
      const cod = (p.codart || p.item || '').trim().toUpperCase();
      if (cod) prodMap.set(cod, { 
        nomart: p.nomart || p.descrip || cod,
        grupo: p.grupo || 'GENÉRICO'
      });
    }

    const vMaster = vendedores.find(v => (v.codven || v.codigo || '').trim().toUpperCase() === codTarget);
    const nomvend = vMaster?.nomven || vMaster?.nombre || `VENDEDOR (${codTarget})`;
    const email = vMaster?.email || '';
    const tlf1 = vMaster?.tlf1 || '';
    const cif = vMaster?.cif || '';
    const is_administrative = ADMIN_CODES.has(codTarget) || !vMaster?.nomven || codTarget === '00';

    // Procesar ventas por facturas del vendedor
    const validFacturas = new Map<string, { emision: string, cliente: string }>();
    let venta_total = 0;
    const clientSalesMap = new Map<string, { monto: number, facturasSet: Set<string> }>();
    const monthlyMap = new Map<string, number>();

    for (const f of facturas_enc) {
      if (f.tipo === 'NC') continue;
      if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) continue;
      if (!isFacturaValida(f)) continue;
      if (!matchesYear(f.emision, year)) continue;
      if (inactivos.has(f.cliente)) continue;

      const fCodven = (f.codven || f.vendedor || '').trim().toUpperCase();
      if (fCodven !== codTarget) continue;

      const amt = parseFloat(f.tot_fac || '0');
      venta_total += amt;
      validFacturas.set(f.numfac, { emision: f.emision, cliente: f.cliente });

      // Agrupar por cliente
      if (f.cliente) {
        if (!clientSalesMap.has(f.cliente)) {
          clientSalesMap.set(f.cliente, { monto: 0, facturasSet: new Set() });
        }
        const cData = clientSalesMap.get(f.cliente)!;
        cData.monto += amt;
        cData.facturasSet.add(f.numfac);
      }

      // Agrupar por mes YYYY-MM
      if (f.emision && f.emision.length >= 6) {
        const mesKey = `${f.emision.substring(0, 4)}-${f.emision.substring(4, 6)}`;
        monthlyMap.set(mesKey, (monthlyMap.get(mesKey) || 0) + amt);
      }
    }

    // Procesar renglones de venta para top productos
    const productSalesMap = new Map<string, { cantidad: number, monto: number }>();
    for (const r of facturas_ren) {
      if (!validFacturas.has(r.numfac)) continue;
      const codart = (r.codart || r.item || '').trim().toUpperCase();
      if (!codart) continue;

      const qty = parseFloat(r.cantidad || '0');
      const amt = parseFloat(r.tot_ren || '0');

      if (!productSalesMap.has(codart)) {
        productSalesMap.set(codart, { cantidad: 0, monto: 0 });
      }
      const pData = productSalesMap.get(codart)!;
      pData.cantidad += qty;
      pData.monto += amt;
    }

    // Devoluciones del vendedor
    let devoluciones_monto = 0;
    let cant_devuelta = 0;
    const devosSet = new Set<string>();

    const validDevos = new Set<string>();
    for (const d of devoluciones_enc) {
      if (!matchesYear(d.emision, year)) continue;
      if (inactivos.has(d.cliente)) continue;
      const dCodven = (d.codven || d.vendedor || '').trim().toUpperCase();
      if (dCodven === codTarget) {
        validDevos.add(d.numdevo);
        devosSet.add(d.numdevo);
        devoluciones_monto += parseFloat(d.tot_devo || '0');
      }
    }

    for (const dr of devoluciones_ren) {
      if (validDevos.has(dr.numdevo)) {
        cant_devuelta += parseFloat(dr.cantidad || '0');
      }
    }

    const cant_facturas = validFacturas.size;
    const clientes_atendidos = clientSalesMap.size;
    const pedido_promedio = cant_facturas > 0 ? venta_total / cant_facturas : 0;
    const num_pedidos_afectados = devosSet.size;

    const pct_monto_devo = venta_total > 0 ? (devoluciones_monto / venta_total) * 100 : 0;
    const pct_pedidos_devo = cant_facturas > 0 ? (num_pedidos_afectados / cant_facturas) * 100 : 0;

    // Tendencia YTD
    let diasVentana = 365;
    if (year === 'todos') {
      diasVentana = 730;
    } else {
      const today = new Date();
      if (parseInt(year.toString()) === today.getFullYear()) {
        const start = new Date(today.getFullYear(), 0, 1);
        diasVentana = Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
    const tendencia_anual = (venta_total / diasVentana) * 365;
    const meta_venta = year === 'todos' ? 30000 : 15000;
    const pct_cumplimiento = meta_venta > 0 ? (venta_total / meta_venta) * 100 : 0;

    // Formatear serie mensual
    const ventas_mensuales = Array.from(monthlyMap.entries())
      .map(([mes, venta]) => ({
        mes,
        venta: Math.round(venta * 100) / 100,
        meta: Math.round((meta_venta / 12) * 100) / 100,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Formatear Top Clientes
    const sortedClients = Array.from(clientSalesMap.entries())
      .map(([codcli, data]) => ({
        codcli,
        nomcli: clientMap.get(codcli) || codcli,
        monto_comprado: Math.round(data.monto * 100) / 100,
        cant_facturas: data.facturasSet.size,
      }))
      .sort((a, b) => b.monto_comprado - a.monto_comprado);

    const top_clientes = sortedClients.slice(0, 30);

    // Calcular Concentración Top 3
    const top3Monto = sortedClients.slice(0, 3).reduce((acc, c) => acc + c.monto_comprado, 0);
    const concentracion_top3 = venta_total > 0 ? (top3Monto / venta_total) * 100 : 0;

    // Obtener total de clientes asignados al vendedor desde clientes.txt
    const assignedClientsMap = new Map<string, { nomcli: string, ultima_compra: string, monto_historico: number }>();
    for (const c of clientes) {
      const cCodven = (c.vendedor || c.codven || '').trim().toUpperCase();
      if (cCodven === codTarget && c.codcli) {
        if (!inactivos.has(c.codcli)) {
          assignedClientsMap.set(c.codcli, {
            nomcli: c.nomcli || c.codcli,
            ultima_compra: '00000000',
            monto_historico: 0,
          });
        }
      }
    }

    // Buscar la última fecha de factura de cada cliente asignado en facturas_enc
    for (const f of facturas_enc) {
      if (f.tipo === 'NC' || !f.cliente) continue;
      const cData = assignedClientsMap.get(f.cliente);
      if (cData) {
        const amt = parseFloat(f.tot_fac || '0');
        cData.monto_historico += amt;
        if (f.emision && f.emision > cData.ultima_compra) {
          cData.ultima_compra = f.emision;
        }
      }
    }

    const clientes_asignados_total = assignedClientsMap.size;
    const cobertura_cartera = clientes_asignados_total > 0
      ? (clientes_atendidos / clientes_asignados_total) * 100
      : (clientes_atendidos > 0 ? 100 : 0);

    // Calcular Clientes Dormidos / En Riesgo (>45 días sin compra o sin compras en período)
    const clientes_dormidos: VendorDormantClient[] = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    for (const [codcli, cData] of assignedClientsMap.entries()) {
      // Si el cliente no compró en la lista de facturas activas del período
      if (!clientSalesMap.has(codcli)) {
        let dias_sin_comprar = 999;
        let lastDateFormatted = 'Sin compras registradas';

        if (cData.ultima_compra && cData.ultima_compra.length === 8) {
          const y = parseInt(cData.ultima_compra.substring(0, 4));
          const m = parseInt(cData.ultima_compra.substring(4, 6)) - 1;
          const d = parseInt(cData.ultima_compra.substring(6, 8));
          const lastDate = new Date(y, m, d);
          const diffTime = Math.abs(today.getTime() - lastDate.getTime());
          dias_sin_comprar = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          lastDateFormatted = `${cData.ultima_compra.substring(0, 4)}-${cData.ultima_compra.substring(4, 6)}-${cData.ultima_compra.substring(6, 8)}`;
        }

        clientes_dormidos.push({
          codcli,
          nomcli: cData.nomcli,
          monto_historico: Math.round(cData.monto_historico * 100) / 100,
          dias_sin_comprar,
          ultima_compra: lastDateFormatted,
        });
      }
    }

    clientes_dormidos.sort((a, b) => b.monto_historico - a.monto_historico);

    // Venta Cruzada (Promedio de familias/grupos distintos por factura)
    const invoiceGroupsMap = new Map<string, Set<string>>();
    for (const r of facturas_ren) {
      if (!validFacturas.has(r.numfac)) continue;
      const codart = (r.codart || r.item || '').trim().toUpperCase();
      const group = prodMap.get(codart)?.grupo || 'GENÉRICO';

      if (!invoiceGroupsMap.has(r.numfac)) invoiceGroupsMap.set(r.numfac, new Set());
      invoiceGroupsMap.get(r.numfac)!.add(group);
    }

    let totalGroupsInInvoices = 0;
    for (const gSet of invoiceGroupsMap.values()) {
      totalGroupsInInvoices += gSet.size;
    }
    const venta_cruzada_prom = invoiceGroupsMap.size > 0 ? totalGroupsInInvoices / invoiceGroupsMap.size : 1.0;
    const tasa_fuga_churn = clientes_asignados_total > 0 ? (clientes_dormidos.length / clientes_asignados_total) * 100 : 0;

    // Formatear Top Productos
    const top_productos: VendorTopProduct[] = Array.from(productSalesMap.entries())
      .map(([codart, data]) => ({
        codart,
        nomart: prodMap.get(codart)?.nomart || codart,
        cantidad_vendida: Math.round(data.cantidad * 100) / 100,
        monto_vendido: Math.round(data.monto * 100) / 100,
      }))
      .sort((a, b) => b.monto_vendido - a.monto_vendido)
      .slice(0, 30);

    return {
      codvend: codTarget,
      nomvend,
      email,
      tlf1,
      cif,
      venta_total: Math.round(venta_total * 100) / 100,
      cant_facturas,
      clientes_atendidos,
      clientes_asignados_total,
      pedido_promedio: Math.round(pedido_promedio * 100) / 100,
      tendencia_anual: Math.round(tendencia_anual * 100) / 100,
      meta_venta,
      pct_cumplimiento: Math.round(pct_cumplimiento * 10) / 10,
      devoluciones_monto: Math.round(devoluciones_monto * 100) / 100,
      cant_devuelta: Math.round(cant_devuelta * 100) / 100,
      num_pedidos_afectados,
      pct_monto_devo: Math.round(pct_monto_devo * 10) / 10,
      pct_pedidos_devo: Math.round(pct_pedidos_devo * 10) / 10,
      cobertura_cartera: Math.round(cobertura_cartera * 10) / 10,
      concentracion_top3: Math.round(concentracion_top3 * 10) / 10,
      venta_cruzada_prom: Math.round(venta_cruzada_prom * 10) / 10,
      tasa_fuga_churn: Math.round(tasa_fuga_churn * 10) / 10,
      ventas_mensuales,
      top_clientes,
      top_productos,
      clientes_dormidos,
      is_administrative,
    };

  } catch (error) {
    console.error("Error obteniendo detalle de vendedor", error);
    return null;
  }
}

/**
 * Obtener comparativa interanual de un vendedor entre dos años (ej. 2025 vs 2026)
 */
export async function getVendedorComparison(
  codvendParam: string,
  yearA: string = '2024',
  yearB: string = '2025'
): Promise<VendorCompareData | null> {
  try {
    const detailA = await getVendedorDetail(codvendParam, yearA);
    const detailB = await getVendedorDetail(codvendParam, yearB);

    if (!detailA && !detailB) return null;

    const codvend = detailA?.codvend || detailB?.codvend || codvendParam;
    const nomvend = detailA?.nomvend || detailB?.nomvend || codvendParam;

    const pA = {
      year: yearA,
      venta_total: detailA?.venta_total || 0,
      cant_facturas: detailA?.cant_facturas || 0,
      clientes_atendidos: detailA?.clientes_atendidos || 0,
      devoluciones_monto: detailA?.devoluciones_monto || 0,
    };

    const pB = {
      year: yearB,
      venta_total: detailB?.venta_total || 0,
      cant_facturas: detailB?.cant_facturas || 0,
      clientes_atendidos: detailB?.clientes_atendidos || 0,
      devoluciones_monto: detailB?.devoluciones_monto || 0,
    };

    const calcPct = (b: number, a: number) => {
      if (a === 0) return b > 0 ? 100 : 0;
      return Math.round(((b - a) / a) * 1000) / 10;
    };

    return {
      codvend,
      nomvend,
      periodoA: pA,
      periodoB: pB,
      varianza: {
        monto_abs: Math.round((pB.venta_total - pA.venta_total) * 100) / 100,
        monto_pct: calcPct(pB.venta_total, pA.venta_total),
        facturas_abs: pB.cant_facturas - pA.cant_facturas,
        facturas_pct: calcPct(pB.cant_facturas, pA.cant_facturas),
        clientes_abs: pB.clientes_atendidos - pA.clientes_atendidos,
        clientes_pct: calcPct(pB.clientes_atendidos, pA.clientes_atendidos),
        devoluciones_abs: Math.round((pB.devoluciones_monto - pA.devoluciones_monto) * 100) / 100,
        devoluciones_pct: calcPct(pB.devoluciones_monto, pA.devoluciones_monto),
      },
    };
  } catch (error) {
    console.error("Error obteniendo comparativa de vendedor", error);
    return null;
  }
}
