import { parseTxtFile } from './parser';
import { getInactiveClientsSet } from './clientes';
import {
  DevolucionesKPIs, ClienteDevolucionesSummary, VendedorDevolucionesSummary,
  ProductoDevolucionesSummary, DevolucionMensual
} from '../types';

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

export async function getDevolucionesOverview(
  year: number | string = 'todos'
): Promise<{
  kpis: DevolucionesKPIs;
  mensual: DevolucionMensual[];
  clientes: ClienteDevolucionesSummary[];
  vendedores: VendedorDevolucionesSummary[];
  productos: ProductoDevolucionesSummary[];
}> {
  try {
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const facturas_ren = await parseTxtFile('facturas_ren.txt');
    const devoluciones_enc = await parseTxtFile('devoluciones_enc.txt');
    const devoluciones_ren = await parseTxtFile('devoluciones_ren.txt');
    const clientes = await parseTxtFile('clientes.txt');
    const vendedores = await parseTxtFile('vendedores.txt');
    const inventario = await parseTxtFile('inventario.txt');
    const inactivos = await getInactiveClientsSet();

    const clientNameMap = new Map<string, string>();
    for (const c of clientes) {
      if (c.codcli) clientNameMap.set(c.codcli, c.nomcli || c.codcli);
    }

    const vendorNameMap = new Map<string, string>();
    for (const v of vendedores) {
      const code = (v.codven || v.codigo || '').trim().toUpperCase();
      if (code) vendorNameMap.set(code, (v.nomven || v.nombre || code).trim());
    }

    const prodMap = new Map<string, { nomart: string, grupo: string }>();
    for (const p of inventario) {
      const code = (p.codart || p.item || '').trim().toUpperCase();
      if (code) {
        prodMap.set(code, {
          nomart: p.nomart || p.descrip || code,
          grupo: p.grupo || 'GENÉRICO',
        });
      }
    }

    // Totales de Ventas Brutas por Cliente, Vendedor, Producto y Mes
    let total_venta_monto = 0;
    let total_venta_unidades = 0;
    let total_facturas_count = 0;

    const clientVentaMap = new Map<string, { monto: number, facturasSet: Set<string> }>();
    const vendorVentaMap = new Map<string, { monto: number, facturasSet: Set<string> }>();
    const prodVentaMap = new Map<string, { cantidad: number, monto: number }>();
    const monthlySalesMap = new Map<string, number>();

    const validFacturasSet = new Set<string>();

    for (const f of facturas_enc) {
      if (f.tipo === 'NC') continue;
      if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) continue;
      if (!isFacturaValida(f)) continue;
      if (!matchesYear(f.emision, year)) continue;
      if (inactivos.has(f.cliente)) continue;

      const amt = parseFloat(f.tot_fac || '0');
      total_venta_monto += amt;
      total_facturas_count += 1;
      validFacturasSet.add(f.numfac);

      // Cliente
      if (f.cliente) {
        if (!clientVentaMap.has(f.cliente)) clientVentaMap.set(f.cliente, { monto: 0, facturasSet: new Set() });
        const cData = clientVentaMap.get(f.cliente)!;
        cData.monto += amt;
        cData.facturasSet.add(f.numfac);
      }

      // Vendedor
      const codven = (f.codven || f.vendedor || '').trim().toUpperCase();
      if (codven) {
        if (!vendorVentaMap.has(codven)) vendorVentaMap.set(codven, { monto: 0, facturasSet: new Set() });
        const vData = vendorVentaMap.get(codven)!;
        vData.monto += amt;
        vData.facturasSet.add(f.numfac);
      }

      // Mes
      if (f.emision && f.emision.length >= 6) {
        const mKey = `${f.emision.substring(0, 4)}-${f.emision.substring(4, 6)}`;
        monthlySalesMap.set(mKey, (monthlySalesMap.get(mKey) || 0) + amt);
      }
    }

    for (const r of facturas_ren) {
      if (!validFacturasSet.has(r.numfac)) continue;
      const codart = (r.codart || r.item || '').trim().toUpperCase();
      if (!codart) continue;

      const qty = parseFloat(r.cantidad || '0');
      const amt = parseFloat(r.tot_ren || '0');
      total_venta_unidades += qty;

      if (!prodVentaMap.has(codart)) prodVentaMap.set(codart, { cantidad: 0, monto: 0 });
      const pData = prodVentaMap.get(codart)!;
      pData.cantidad += qty;
      pData.monto += amt;
    }

    // Totales de Devoluciones por Encabezado y Renglón
    let total_devoluciones_monto = 0;
    let total_unidades_devueltas = 0;

    const validDevosSet = new Set<string>();
    const clientDevoMap = new Map<string, { monto: number, devosSet: Set<string> }>();
    const vendorDevoMap = new Map<string, { monto: number, devosSet: Set<string> }>();
    const monthlyDevoMap = new Map<string, number>();

    for (const d of devoluciones_enc) {
      if (!matchesYear(d.emision, year)) continue;
      if (!isFacturaValida(d)) continue;
      if (inactivos.has(d.cliente)) continue;

      const amt = parseFloat(d.tot_devo || '0');
      total_devoluciones_monto += amt;
      validDevosSet.add(d.numdevo);

      // Cliente
      if (d.cliente) {
        if (!clientDevoMap.has(d.cliente)) clientDevoMap.set(d.cliente, { monto: 0, devosSet: new Set() });
        const cData = clientDevoMap.get(d.cliente)!;
        cData.monto += amt;
        cData.devosSet.add(d.numdevo);
      }

      // Vendedor
      const codven = (d.codven || d.vendedor || '').trim().toUpperCase();
      if (codven) {
        if (!vendorDevoMap.has(codven)) vendorDevoMap.set(codven, { monto: 0, devosSet: new Set() });
        const vData = vendorDevoMap.get(codven)!;
        vData.monto += amt;
        vData.devosSet.add(d.numdevo);
      }

      // Mes
      if (d.emision && d.emision.length >= 6) {
        const mKey = `${d.emision.substring(0, 4)}-${d.emision.substring(4, 6)}`;
        monthlyDevoMap.set(mKey, (monthlyDevoMap.get(mKey) || 0) + amt);
      }
    }

    // Devoluciones Renglones por Producto y Cliente
    const prodDevoMap = new Map<string, { cantidad: number, monto: number }>();
    const clientQtyDevoMap = new Map<string, number>();

    for (const dr of devoluciones_ren) {
      if (!validDevosSet.has(dr.numdevo)) continue;
      const codart = (dr.codart || dr.item || '').trim().toUpperCase();
      const qty = parseFloat(dr.cantidad || '0');
      const amt = parseFloat(dr.importe || dr.precio || '0');
      total_unidades_devueltas += qty;

      if (codart) {
        if (!prodDevoMap.has(codart)) prodDevoMap.set(codart, { cantidad: 0, monto: 0 });
        const pData = prodDevoMap.get(codart)!;
        pData.cantidad += qty;
        pData.monto += amt;
      }
    }

    // KPIs Globales
    const tasa_devolucion_monto_pct = total_venta_monto > 0 ? (total_devoluciones_monto / total_venta_monto) * 100 : 0;
    const tasa_devolucion_volumen_pct = total_venta_unidades > 0 ? (total_unidades_devueltas / total_venta_unidades) * 100 : 0;
    const pedidos_afectados_count = validDevosSet.size;
    const impacto_pedidos_pct = total_facturas_count > 0 ? (pedidos_afectados_count / total_facturas_count) * 100 : 0;
    const costo_operativo_estimado = Math.round(pedidos_afectados_count * 15 * 100) / 100; // $15 costo fijo por devolución procesada

    const kpis: DevolucionesKPIs = {
      total_devoluciones_monto: Math.round(total_devoluciones_monto * 100) / 100,
      total_unidades_devueltas: Math.round(total_unidades_devueltas * 100) / 100,
      tasa_devolucion_monto_pct: Math.round(tasa_devolucion_monto_pct * 10) / 10,
      tasa_devolucion_volumen_pct: Math.round(tasa_devolucion_volumen_pct * 10) / 10,
      pedidos_afectados_count,
      impacto_pedidos_pct: Math.round(impacto_pedidos_pct * 10) / 10,
      costo_operativo_estimado,
    };

    // Serie Mensual
    const allMonths = new Set([...monthlySalesMap.keys(), ...monthlyDevoMap.keys()]);
    const mensual: DevolucionMensual[] = Array.from(allMonths)
      .map(mes => {
        const vMonto = monthlySalesMap.get(mes) || 0;
        const dMonto = monthlyDevoMap.get(mes) || 0;
        const pct = vMonto > 0 ? (dMonto / vMonto) * 100 : 0;
        return {
          mes,
          venta_monto: Math.round(vMonto * 100) / 100,
          devolucion_monto: Math.round(dMonto * 100) / 100,
          pct_monto: Math.round(pct * 10) / 10,
        };
      })
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Resumen por Cliente
    const clientesResumen: ClienteDevolucionesSummary[] = Array.from(clientDevoMap.entries())
      .map(([codcli, data]) => {
        const vData = clientVentaMap.get(codcli);
        const venta_monto = vData ? vData.monto : 0;
        const pct_devolucion = venta_monto > 0 ? (data.monto / venta_monto) * 100 : 100;
        let nivel_riesgo: 'CRÍTICO' | 'MODERADO' | 'NORMAL' = 'NORMAL';
        if (pct_devolucion > 8) nivel_riesgo = 'CRÍTICO';
        else if (pct_devolucion > 3) nivel_riesgo = 'MODERADO';

        return {
          codcli,
          nomcli: clientNameMap.get(codcli) || codcli,
          venta_monto: Math.round(venta_monto * 100) / 100,
          devolucion_monto: Math.round(data.monto * 100) / 100,
          unidades_devueltas: 0,
          pedidos_afectados: data.devosSet.size,
          pct_devolucion: Math.round(pct_devolucion * 10) / 10,
          nivel_riesgo,
        };
      })
      .sort((a, b) => b.devolucion_monto - a.devolucion_monto);

    // Resumen por Vendedor
    const vendedoresResumen: VendedorDevolucionesSummary[] = Array.from(vendorDevoMap.entries())
      .map(([codvend, data]) => {
        const vData = vendorVentaMap.get(codvend);
        const venta_bruta = vData ? vData.monto : 0;
        const venta_neta = Math.max(0, venta_bruta - data.monto);
        const pct_devolucion = venta_bruta > 0 ? (data.monto / venta_bruta) * 100 : 100;
        const isAdmin = ADMIN_CODES.has(codvend) || codvend === '00';

        return {
          codvend,
          nomvend: vendorNameMap.get(codvend) || `VENDEDOR (${codvend})`,
          venta_bruta: Math.round(venta_bruta * 100) / 100,
          devolucion_monto: Math.round(data.monto * 100) / 100,
          venta_neta: Math.round(venta_neta * 100) / 100,
          pedidos_afectados: data.devosSet.size,
          pct_devolucion: Math.round(pct_devolucion * 10) / 10,
          is_administrative: isAdmin,
        };
      })
      .filter(v => !v.is_administrative)
      .sort((a, b) => b.devolucion_monto - a.devolucion_monto);

    // Resumen por Producto
    const productosResumen: ProductoDevolucionesSummary[] = Array.from(prodDevoMap.entries())
      .map(([codart, data]) => {
        const pInfo = prodMap.get(codart);
        const vData = prodVentaMap.get(codart);
        const unidades_vendidas = vData ? vData.cantidad : 0;
        const pct_volumen = unidades_vendidas > 0 ? (data.cantidad / unidades_vendidas) * 100 : 100;
        const posible_defecto = pct_volumen > 5 && data.cantidad >= 5;

        return {
          codart,
          nomart: pInfo?.nomart || codart,
          grupo: pInfo?.grupo || 'GENÉRICO',
          unidades_vendidas: Math.round(unidades_vendidas * 100) / 100,
          unidades_devueltas: Math.round(data.cantidad * 100) / 100,
          monto_devuelto: Math.round(data.monto * 100) / 100,
          pct_devolucion_volumen: Math.round(pct_volumen * 10) / 10,
          posible_defecto,
        };
      })
      .sort((a, b) => b.monto_devuelto - a.monto_devuelto);

    return {
      kpis,
      mensual,
      clientes: clientesResumen,
      vendedores: vendedoresResumen,
      productos: productosResumen,
    };
  } catch (error) {
    console.error("Error obteniendo resumen de devoluciones", error);
    return {
      kpis: { total_devoluciones_monto: 0, total_unidades_devueltas: 0, tasa_devolucion_monto_pct: 0, tasa_devolucion_volumen_pct: 0, pedidos_afectados_count: 0, impacto_pedidos_pct: 0, costo_operativo_estimado: 0 },
      mensual: [],
      clientes: [],
      vendedores: [],
      productos: [],
    };
  }
}
