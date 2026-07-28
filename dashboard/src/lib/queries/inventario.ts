import { parseTxtFile } from './parser';
import { getInactiveClientsSet } from './clientes';
import {
  InventoryIntelligenceKPIs, InventoryItemIntelligence, InventoryGroupHealth
} from '../types';

function matchesYear(emisionDateStr: string | null | undefined, yearParam: number | string): boolean {
  if (yearParam === 'todos' || !yearParam) return true;
  if (!emisionDateStr || emisionDateStr.length < 4) return false;
  const emisionYear = emisionDateStr.substring(0, 4);
  const selectedYears = yearParam.toString().split(',').map(y => y.trim());
  return selectedYears.includes(emisionYear);
}

export async function getInventoryIntelligence(
  year: number | string = 'todos',
  search: string = '',
  limit: number = 150,
  filterState: string = 'todos'
): Promise<{
  kpis: InventoryIntelligenceKPIs;
  items: InventoryItemIntelligence[];
  grupos: InventoryGroupHealth[];
}> {
  try {
    const inventario = await parseTxtFile('inventario.txt');
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const facturas_ren = await parseTxtFile('facturas_ren.txt');
    const transito = await parseTxtFile('transito.txt');
    const produccion = await parseTxtFile('produccion.txt');
    const grupos = await parseTxtFile('grupos.txt');
    const inactivos = await getInactiveClientsSet();

    const groupNameMap = new Map<string, string>();
    for (const g of grupos) {
      const code = (g.gruart || g.codigo || '').trim().toUpperCase();
      if (code) groupNameMap.set(code, g.nomgruart || g.nombre || code);
    }

    // Tránsito y producción por código
    const transitoMap = new Map<string, number>();
    for (const t of transito) {
      const codart = (t.codart || t.item || '').trim().toUpperCase();
      if (codart) transitoMap.set(codart, (transitoMap.get(codart) || 0) + parseFloat(t.cantidad || '0'));
    }

    const produccionMap = new Map<string, number>();
    for (const p of produccion) {
      const codart = (p.codart || p.item || '').trim().toUpperCase();
      if (codart) produccionMap.set(codart, (produccionMap.get(codart) || 0) + parseFloat(p.cantidad || '0'));
    }

    // Facturas válidas
    const validFacturasSet = new Set<string>();
    for (const f of facturas_enc) {
      if (f.tipo === 'NC') continue;
      if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) continue;
      if (!matchesYear(f.emision, year)) continue;
      if (inactivos.has(f.cliente)) continue;
      validFacturasSet.add(f.numfac);
    }

    // Unidades vendidas y meses activos de venta por producto
    const prodSalesMap = new Map<string, { cantidad: number, monto: number, mesesSet: Set<string> }>();
    for (const r of facturas_ren) {
      if (!validFacturasSet.has(r.numfac)) continue;
      const codart = (r.codart || r.item || '').trim().toUpperCase();
      if (!codart) continue;

      const qty = parseFloat(r.cantidad || '0');
      const amt = parseFloat(r.tot_ren || '0');

      if (!prodSalesMap.has(codart)) {
        prodSalesMap.set(codart, { cantidad: 0, monto: 0, mesesSet: new Set() });
      }
      const pData = prodSalesMap.get(codart)!;
      pData.cantidad += qty;
      pData.monto += amt;
    }

    const diasPeriodoTotal = year === 'todos' ? 730 : 365;

    // Procesar inventario maestro
    let total_capital_inventario = 0;
    let total_venta_perdida_estimada = 0;
    let items_riesgo_quiebre = 0;
    let items_demanda_reprimida = 0;
    let items_sobrestock = 0;
    let items_saludables = 0;

    const groupHealthMap = new Map<string, {
      grupo: string;
      nomgrupo: string;
      total_items: number;
      monto_inventario: number;
      items_quiebre: number;
      items_sobrestock: number;
      venta_perdida_grupo: number;
    }>();

    const items: InventoryItemIntelligence[] = [];

    for (const p of inventario) {
      const codart = (p.codart || p.item || '').trim().toUpperCase();
      if (!codart) continue;

      const nomart = p.nomart || p.descrip || codart;
      const grupo = (p.grupo || 'GENÉRICO').trim().toUpperCase();
      const marca = (p.marca || '').trim().toUpperCase();
      const precio_a = parseFloat(p.precio_a || p.precioa || '0');

      const stk01 = parseFloat(p.stk01 || '0');
      const stk06 = parseFloat(p.stk06 || '0');
      const stock_actual = (isNaN(stk01) ? 0 : stk01) + (isNaN(stk06) ? 0 : stk06);

      const pSales = prodSalesMap.get(codart);
      const unidades_vendidas = pSales ? pSales.cantidad : 0;
      const monto_vendido = pSales ? pSales.monto : 0;

      const pTrans = transitoMap.get(codart) || 0;
      const pProd = produccionMap.get(codart) || 0;

      // Estimación razonada de Días en Stock (DIS):
      // Si el producto no tiene stock actual y vendió poco, tuvo stock parcial (ej. 186 días en vez de 365)
      let dias_con_stock = diasPeriodoTotal;
      if (stock_actual <= 0 && unidades_vendidas > 0) {
        dias_con_stock = Math.max(30, Math.round(diasPeriodoTotal * 0.51)); // 186 días de referencia para agotados
      } else if (stock_actual > 0 && stock_actual < 5 && unidades_vendidas > 20) {
        dias_con_stock = Math.max(45, Math.round(diasPeriodoTotal * 0.65));
      }

      const pct_disponibilidad = Math.round((dias_con_stock / diasPeriodoTotal) * 1000) / 10;
      const velocidad_basica = Math.round((unidades_vendidas / diasPeriodoTotal) * 1000) / 1000;
      const velocidad_ajustada = Math.round((unidades_vendidas / Math.max(1, dias_con_stock)) * 1000) / 1000;

      const dias_cobertura_real = velocidad_ajustada > 0 ? Math.round((stock_actual / velocidad_ajustada) * 10) / 10 : (stock_actual > 0 ? 999 : 0);
      const meses_cobertura_real = Math.round((dias_cobertura_real / 30) * 10) / 10;

      // Venta perdida estimada por días sin stock
      const diasEnQuiebre = Math.max(0, diasPeriodoTotal - dias_con_stock);
      const venta_perdida_estimada = Math.round(diasEnQuiebre * velocidad_ajustada * precio_a * 100) / 100;

      // Sugerido de compra para 90 días
      const demandaDeseada90d = velocidad_ajustada * 90;
      const coberturaExistente = stock_actual + pTrans + pProd;
      const sugerido_compra_90d = Math.max(0, Math.ceil(demandaDeseada90d - coberturaExistente));

      // Estado de salud
      let estado_salud: 'RIESGO_QUIEBRE' | 'DEMANDA_REPRIMIDA' | 'SALUDABLE' | 'SOBRESTOCK' = 'SALUDABLE';
      if (stock_actual <= 0 || dias_cobertura_real < 15) {
        estado_salud = 'RIESGO_QUIEBRE';
        items_riesgo_quiebre += 1;
      } else if (pct_disponibilidad < 60 && velocidad_ajustada > 0.1) {
        estado_salud = 'DEMANDA_REPRIMIDA';
        items_demanda_reprimida += 1;
      } else if (meses_cobertura_real > 6 && velocidad_ajustada > 0) {
        estado_salud = 'SOBRESTOCK';
        items_sobrestock += 1;
      } else {
        items_saludables += 1;
      }

      const capitalItem = stock_actual * precio_a;
      total_capital_inventario += capitalItem;
      total_venta_perdida_estimada += venta_perdida_estimada;

      // Agrupar por familia
      if (!groupHealthMap.has(grupo)) {
        groupHealthMap.set(grupo, {
          grupo,
          nomgrupo: groupNameMap.get(grupo) || grupo,
          total_items: 0,
          monto_inventario: 0,
          items_quiebre: 0,
          items_sobrestock: 0,
          venta_perdida_grupo: 0,
        });
      }
      const gData = groupHealthMap.get(grupo)!;
      gData.total_items += 1;
      gData.monto_inventario += capitalItem;
      if (estado_salud === 'RIESGO_QUIEBRE') gData.items_quiebre += 1;
      if (estado_salud === 'SOBRESTOCK') gData.items_sobrestock += 1;
      gData.venta_perdida_grupo += venta_perdida_estimada;

      items.push({
        codart,
        nomart,
        grupo,
        marca,
        precio_a,
        stock_actual,
        dias_periodo_total: diasPeriodoTotal,
        dias_con_stock,
        pct_disponibilidad,
        unidades_vendidas: Math.round(unidades_vendidas * 100) / 100,
        monto_vendido: Math.round(monto_vendido * 100) / 100,
        velocidad_basica,
        velocidad_ajustada,
        dias_cobertura_real,
        meses_cobertura_real,
        venta_perdida_estimada,
        pendiente_transito: pTrans,
        pendiente_produccion: pProd,
        sugerido_compra_90d,
        estado_salud,
      });
    }

    // Filtrar por término de búsqueda
    let filteredItems = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filteredItems = filteredItems.filter(i =>
        i.codart.toLowerCase().includes(q) ||
        i.nomart.toLowerCase().includes(q) ||
        i.grupo.toLowerCase().includes(q) ||
        i.marca.toLowerCase().includes(q)
      );
    }

    // Filtrar por estado de salud
    if (filterState !== 'todos') {
      filteredItems = filteredItems.filter(i => i.estado_salud === filterState);
    }

    // Ordenamiento por defecto: Mayor venta perdida estimada
    filteredItems.sort((a, b) => b.venta_perdida_estimada - a.venta_perdida_estimada);

    const kpis: InventoryIntelligenceKPIs = {
      total_capital_inventario: Math.round(total_capital_inventario * 100) / 100,
      total_venta_perdida_estimada: Math.round(total_venta_perdida_estimada * 100) / 100,
      items_riesgo_quiebre,
      items_demanda_reprimida,
      items_sobrestock,
      items_saludables,
    };

    const gruposResumen: InventoryGroupHealth[] = Array.from(groupHealthMap.values())
      .map(g => ({
        grupo: g.grupo,
        nomgrupo: g.nomgrupo,
        total_items: g.total_items,
        monto_inventario: Math.round(g.monto_inventario * 100) / 100,
        items_quiebre: g.items_quiebre,
        items_sobrestock: g.items_sobrestock,
        venta_perdida_grupo: Math.round(g.venta_perdida_grupo * 100) / 100,
      }))
      .sort((a, b) => b.monto_inventario - a.monto_inventario);

    return {
      kpis,
      items: filteredItems.slice(0, limit),
      grupos: gruposResumen,
    };
  } catch (error) {
    console.error("Error obteniendo inteligencia de inventario", error);
    return {
      kpis: { total_capital_inventario: 0, total_venta_perdida_estimada: 0, items_riesgo_quiebre: 0, items_demanda_reprimida: 0, items_sobrestock: 0, items_saludables: 0 },
      items: [],
      grupos: [],
    };
  }
}
