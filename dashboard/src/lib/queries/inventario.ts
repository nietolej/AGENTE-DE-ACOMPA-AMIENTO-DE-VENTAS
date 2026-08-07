import { parseTxtFile } from './parser';
import { getInactiveClientsSet } from './clientes';
import {
  InventoryIntelligenceKPIs, InventoryItemIntelligence, InventoryGroupHealth, InventoryValuationData
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
  valorizacion_mensual: InventoryValuationData[];
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

    let diasPeriodoTotal = 365;
    const now = new Date();
    const currentYearStr = now.getFullYear().toString();
    
    if (year === currentYearStr) {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      diasPeriodoTotal = Math.max(1, Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)));
    } else if (year === 'todos') {
      const startOf2026 = new Date(2026, 0, 1); // asumiendo histórico desde 2026
      diasPeriodoTotal = Math.max(365, Math.ceil((now.getTime() - startOf2026.getTime()) / (1000 * 60 * 60 * 24)));
    } else {
      const y = parseInt(year.toString());
      if (!isNaN(y)) {
        diasPeriodoTotal = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 366 : 365;
      }
    }

    // Calcular stock actual desde movimientos.txt de forma global (todos los almacenes)
    const movimientos = await parseTxtFile('movimientos.txt');
    const stockMap = new Map<string, number>();
    const stockComercialMap = new Map<string, number>();
    
    // Encontrar la última apertura por codart (global)
    const latestAperture = new Map<string, string>();
    for (const m of movimientos) {
      if (m.numdoc && m.numdoc.toUpperCase().startsWith('AP')) {
        const codart = (m.codmovart || m.item || '').trim().toUpperCase();
        const currentMax = latestAperture.get(codart) || '';
        if (m.fecha_mov > currentMax) {
          latestAperture.set(codart, m.fecha_mov);
        }
      }
    }

    for (const m of movimientos) {
      const codart = (m.codmovart || m.item || '').trim().toUpperCase();
      if (!codart) continue;

      const apDate = latestAperture.get(codart);
      
      if (apDate && m.fecha_mov < apDate) continue;
      if (m.numdoc && m.numdoc.toUpperCase().startsWith('AP') && m.fecha_mov !== apDate) continue;

      let qty = parseFloat(m.cantidad || '0');
      const tipinv = (m.tipinv || '').toUpperCase();
      const alm = (m.almacen || '').trim();
      if (tipinv === 'SA' || tipinv === 'ST') {
        qty = -qty;
      }
      
      stockMap.set(codart, (stockMap.get(codart) || 0) + qty);
      
      if (alm === '01' || alm === '06') {
        stockComercialMap.set(codart, (stockComercialMap.get(codart) || 0) + qty);
      }
    }

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

      const stock_actual = stockMap.get(codart) || 0;
      const stock_comercial = stockComercialMap.get(codart) || 0;

      const pSales = prodSalesMap.get(codart);
      const unidades_vendidas = pSales ? pSales.cantidad : 0;
      const monto_vendido = pSales ? pSales.monto : 0;

      const pTrans = transitoMap.get(codart) || 0;
      const pProd = produccionMap.get(codart) || 0;

      // Estimación razonada de Días en Stock (DIS) usando solo stock comercial:
      // Si el producto no tiene stock comercial y vendió poco, tuvo stock parcial
      let dias_con_stock = diasPeriodoTotal;
      if (stock_comercial <= 0 && unidades_vendidas > 0) {
        dias_con_stock = Math.max(30, Math.round(diasPeriodoTotal * 0.51)); // 186 días de referencia para agotados
      } else if (stock_comercial > 0 && stock_comercial < 5 && unidades_vendidas > 20) {
        dias_con_stock = Math.max(45, Math.round(diasPeriodoTotal * 0.65));
      }

      const pct_disponibilidad = Math.round((dias_con_stock / diasPeriodoTotal) * 1000) / 10;
      const velocidad_basica = Math.round((unidades_vendidas / diasPeriodoTotal) * 1000) / 1000;
      const velocidad_ajustada = Math.round((unidades_vendidas / Math.max(1, dias_con_stock)) * 1000) / 1000;

      const dias_cobertura_real = velocidad_ajustada > 0 ? Math.round((stock_comercial / velocidad_ajustada) * 10) / 10 : (stock_comercial > 0 ? 999 : 0);
      const meses_cobertura_real = Math.round((dias_cobertura_real / 30) * 10) / 10;

      // Venta perdida estimada por días sin stock
      const diasEnQuiebre = Math.max(0, diasPeriodoTotal - dias_con_stock);
      const venta_perdida_estimada = Math.round(diasEnQuiebre * velocidad_ajustada * precio_a * 100) / 100;

      // Sugerido de compra para 90 días usando cobertura comercial
      const demandaDeseada90d = velocidad_ajustada * 90;
      const coberturaExistente = stock_comercial + pTrans + pProd;
      const sugerido_compra_90d = Math.max(0, Math.ceil(demandaDeseada90d - coberturaExistente));

      // Estado de salud usando stock comercial
      let estado_salud: 'RIESGO_QUIEBRE' | 'DEMANDA_REPRIMIDA' | 'SALUDABLE' | 'SOBRESTOCK' = 'SALUDABLE';
      if (stock_comercial <= 0 || dias_cobertura_real < 15) {
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

    // Filtrar por estado de salud o stock cero
    if (filterState === 'STOCK_CERO') {
      filteredItems = filteredItems.filter(i => i.stock_actual <= 0);
    } else if (filterState !== 'todos') {
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

    // Calcular Valorización Histórica Mensual (Backward Calculation)
    // Para garantizar consistencia total con el "Capital Inmovilizado" actual (stock_actual),
    // calculamos el historial partiendo del stock_actual (hoy) y revirtiendo los movimientos mes a mes hacia atrás.
    // La variable movimientos ya está cargada arriba
    try {
      if (!movimientos || movimientos.length === 0) {
        // En caso de que no haya cargado por alguna razón, se podría intentar de nuevo
        // pero como ya es const, no podemos reasignarla. Si falla arriba, fallaría aquí.
      }
    } catch (e) {
      console.warn("Error con movimientos", e);
    }
    const priceMap = new Map<string, number>();

    for (const p of inventario) {
      const cod = (p.codart || p.item || '').trim().toUpperCase();
      if (!cod) continue;
      // Usar precio_d (costo) según solicitud
      const p_d = parseFloat(p.precio_d || p.preciod || '0');
      priceMap.set(cod, p_d);
    }

    // Implementación Opción 1 (Forward Calculation usando AP por año)
    const valuationSeries: any[] = [];
    
    // Determinar qué años procesar
    let targetYears: string[] = [];
    if (year === 'todos') {
      const yearsSet = new Set<string>();
      for (const m of movimientos) {
        if (m.fecha_mov && m.fecha_mov.length >= 4) {
          yearsSet.add(m.fecha_mov.substring(0, 4));
        }
      }
      targetYears = Array.from(yearsSet).sort();
    } else {
      targetYears = year.toString().split(',').map(y => y.trim());
    }

    for (const y of targetYears) {
      const stockYear01 = new Map<string, number>();
      const stockYear03 = new Map<string, number>();
      const stockYear06 = new Map<string, number>();
      
      // 1. Cargar el AP correspondiente a este año (puede estar fechado a fines del año anterior o inicio del actual)
      const movsAp = movimientos.filter(m => {
        if (!(m.numdoc || '').toUpperCase().startsWith('AP')) return false;
        const apYear = m.fecha_mov.substring(0, 4);
        const apMD = m.fecha_mov.substring(4, 8);
        let effectiveYear = apYear;
        if (apMD === '1231') {
          effectiveYear = (parseInt(apYear) + 1).toString();
        }
        return effectiveYear === y;
      });

      for (const ap of movsAp) {
        const cod = (ap.codmovart || '').trim().toUpperCase();
        const tipinv = (ap.tipinv || '').toUpperCase();
        const cant = parseFloat(ap.cantidad || '0');
        const alm = (ap.almacen || '').trim();
        
        const targetMap = alm === '01' ? stockYear01 : alm === '03' ? stockYear03 : alm === '06' ? stockYear06 : null;
        if (targetMap) {
          const prev = targetMap.get(cod) || 0;
          if (tipinv === 'EN' || tipinv === 'DV' || tipinv === 'ET') targetMap.set(cod, prev + cant);
          else if (tipinv === 'SA' || tipinv === 'ST') targetMap.set(cod, prev - cant);
        }
      }

      // Enero es puramente el AP
      let valEnero01 = 0, valEnero03 = 0, valEnero06 = 0;
      for (const [cod, st] of stockYear01.entries()) if (st > 0) valEnero01 += st * (priceMap.get(cod) || 0);
      for (const [cod, st] of stockYear03.entries()) if (st > 0) valEnero03 += st * (priceMap.get(cod) || 0);
      for (const [cod, st] of stockYear06.entries()) if (st > 0) valEnero06 += st * (priceMap.get(cod) || 0);
      
      const targetYearNum = parseInt(y);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthNum = now.getMonth() + 1;

      if (targetYearNum < currentYear || (targetYearNum === currentYear && 1 <= currentMonthNum)) {
        valuationSeries.push({ 
          mes: `${y}-01`, 
          almacen01: Math.round(valEnero01 * 100) / 100,
          almacen03: Math.round(valEnero03 * 100) / 100,
          almacen06: Math.round(valEnero06 * 100) / 100,
          monto: Math.round((valEnero01 + valEnero03 + valEnero06) * 100) / 100
        });
      }

      // Filtrar el resto de los movimientos de ese año y agrupar por mes
      const movsRest = movimientos.filter(m => !(m.numdoc || '').toUpperCase().startsWith('AP') && m.fecha_mov.startsWith(y));
      const movsPorMes = new Map<string, { codart: string, delta: number, alm: string }[]>();
      
      for (const m of movsRest) {
        const mes = m.fecha_mov.substring(4, 6); // '01', '02', etc.
        const cod = (m.codmovart || '').trim().toUpperCase();
        const tipinv = (m.tipinv || '').toUpperCase();
        const cant = parseFloat(m.cantidad || '0');
        const alm = (m.almacen || '').trim();
        
        let delta = 0;
        if (tipinv === 'EN' || tipinv === 'DV' || tipinv === 'ET') delta = cant;
        else if (tipinv === 'SA' || tipinv === 'ST') delta = -cant;
        
        if (!movsPorMes.has(mes)) movsPorMes.set(mes, []);
        movsPorMes.get(mes)!.push({ codart: cod, delta, alm });
      }

      // Procesar de febrero a diciembre
      const months = ['02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      for (let i = 0; i < months.length; i++) {
        const currentMonth = months[i];
        const prevMonth = i === 0 ? '01' : months[i - 1];
        const prevMovs = movsPorMes.get(prevMonth) || [];
        
        for (const m of prevMovs) {
          const targetMap = m.alm === '01' ? stockYear01 : m.alm === '03' ? stockYear03 : m.alm === '06' ? stockYear06 : null;
          if (targetMap) {
            const prevStock = targetMap.get(m.codart) || 0;
            targetMap.set(m.codart, prevStock + m.delta);
          }
        }

        let val01 = 0, val03 = 0, val06 = 0;
        for (const [cod, st] of stockYear01.entries()) if (st > 0) val01 += st * (priceMap.get(cod) || 0);
        for (const [cod, st] of stockYear03.entries()) if (st > 0) val03 += st * (priceMap.get(cod) || 0);
        for (const [cod, st] of stockYear06.entries()) if (st > 0) val06 += st * (priceMap.get(cod) || 0);
        
        const monthNum = parseInt(currentMonth);
        if (targetYearNum < currentYear || (targetYearNum === currentYear && monthNum <= currentMonthNum)) {
          valuationSeries.push({ 
            mes: `${y}-${currentMonth}`, 
            almacen01: Math.round(val01 * 100) / 100,
            almacen03: Math.round(val03 * 100) / 100,
            almacen06: Math.round(val06 * 100) / 100,
            monto: Math.round((val01 + val03 + val06) * 100) / 100 
          });
        }
      }
    }

    // Ordenar cronológicamente para la gráfica
    valuationSeries.sort((a, b) => a.mes.localeCompare(b.mes));

    return {
      kpis,
      items: filteredItems.slice(0, limit),
      grupos: gruposResumen,
      valorizacion_mensual: valuationSeries,
    };
  } catch (error) {
    console.error("Error obteniendo inteligencia de inventario", error);
    return {
      kpis: { total_capital_inventario: 0, total_venta_perdida_estimada: 0, items_riesgo_quiebre: 0, items_demanda_reprimida: 0, items_sobrestock: 0, items_saludables: 0 },
      items: [],
      grupos: [],
      valorizacion_mensual: [],
    };
  }
}
