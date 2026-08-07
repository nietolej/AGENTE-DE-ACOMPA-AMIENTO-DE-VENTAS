import { parseTxtFile } from './parser';
import { getInactiveClientsSet } from './clientes';
import {
  ProductListItem, ProductDetail, ProductMonthlySales, ProductTopClient,
  ProductGroupSummary, ProductWarehouseStock, ProductCompareData, ProductComparePeriod,
  ProductMovementsResponse, ProductMovementData, ProductKardexRow
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

export async function getTopItems(year: number | string, limit: number, orderBy: 'cantidad' | 'monto', codcli?: string, incluirInactivos: boolean = false) {
  try {
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const facturas_ren = await parseTxtFile('facturas_ren.txt');
    const devoluciones_enc = await parseTxtFile('devoluciones_enc.txt');
    const devoluciones_ren = await parseTxtFile('devoluciones_ren.txt');

    let inactivos = new Set<string>();
    if (!incluirInactivos) {
      inactivos = await getInactiveClientsSet();
    }

    // Identificar las facturas válidas y guardar su fecha de emisión
    const validNumfac = new Map<string, string>(); // numfac -> emision
    for (const f of facturas_enc) {
      if (f.tipo === 'NC') continue; 
      if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) continue;
      if (!isFacturaValida(f)) continue;
      if (!matchesYear(f.emision, year)) continue;
      if (!incluirInactivos && inactivos.has(f.cliente)) continue;
      if (codcli && f.cliente !== codcli) continue;
      
      validNumfac.set(f.numfac, f.emision);
    }

    const inventario = await parseTxtFile('inventario.txt');
    const stockMap = new Map<string, { codart: string, stock: number }>();
    const stockDescMap = new Map<string, number>();

    for (const p of inventario) {
      const codart = (p.codart || p.item || '').trim().toUpperCase();
      const nomart = (p.nomart || p.descrip || '').trim().toUpperCase();
      const stk01 = parseFloat(p.stk01 || '0');
      const stk06 = parseFloat(p.stk06 || '0');
      const stock = (isNaN(stk01) ? 0 : stk01) + (isNaN(stk06) ? 0 : stk06);
      if (codart) stockMap.set(codart, { codart, stock });
      if (nomart) stockDescMap.set(nomart, stock);
    }

    // Agregar renglones de venta
    const itemMap = new Map<string, { codart?: string, descrip: string, cantidad: number, monto: number, devoluciones_cantidad: number, devoluciones_monto: number, ultima_venta: string, stock_disponible: number }>();
    
    for (const r of facturas_ren) {
      const emision = validNumfac.get(r.numfac);
      if (emision) {
        const id = r.codart || r.item || r.descrip || 'Sin Nombre';
        const codUpper = (r.codart || r.item || '').trim().toUpperCase();
        const descUpper = (r.descrip || '').trim().toUpperCase();

        if (!itemMap.has(id)) {
          let stock = 0;
          let realCodart = r.codart || r.item || '';
          if (codUpper && stockMap.has(codUpper)) {
            stock = stockMap.get(codUpper)!.stock;
            realCodart = stockMap.get(codUpper)!.codart;
          } else if (descUpper && stockDescMap.has(descUpper)) {
            stock = stockDescMap.get(descUpper)!;
          }

          itemMap.set(id, {
            codart: realCodart,
            descrip: r.descrip || id,
            cantidad: 0,
            monto: 0,
            devoluciones_cantidad: 0,
            devoluciones_monto: 0,
            ultima_venta: '00000000',
            stock_disponible: stock
          });
        }
        const data = itemMap.get(id)!;
        data.cantidad += parseFloat(r.cantidad || '0');
        data.monto += parseFloat(r.tot_ren || '0');
        
        // Actualizar última venta
        if (emision > data.ultima_venta) {
          data.ultima_venta = emision;
        }
      }
    }

    // Identificar devoluciones válidas
    const validNumdevo = new Set<string>();
    for (const d of devoluciones_enc) {
      if (!matchesYear(d.emision, year)) continue;
      if (!incluirInactivos && inactivos.has(d.cliente)) continue;
      if (codcli && d.cliente !== codcli) continue;
      validNumdevo.add(d.numdevo);
    }

    // Agregar renglones de devolución a los items existentes
    for (const dr of devoluciones_ren) {
      if (validNumdevo.has(dr.numdevo)) {
        const id = dr.item || dr.descrip || 'Sin Nombre';
        const data = itemMap.get(id);
        if (data) {
          data.devoluciones_cantidad += parseFloat(dr.cantidad || '0');
          data.devoluciones_monto += parseFloat(dr.importe || dr.tot_ren || '0');
        }
      }
    }

    let items = Array.from(itemMap.values());
    
    // Formatear fechas de YYYYMMDD a YYYY-MM-DD
    items = items.map(item => ({
      ...item,
      ultima_venta: item.ultima_venta.length === 8 
        ? `${item.ultima_venta.substring(0,4)}-${item.ultima_venta.substring(4,6)}-${item.ultima_venta.substring(6,8)}` 
        : item.ultima_venta
    }));

    if (orderBy === 'cantidad') {
      items.sort((a, b) => b.cantidad - a.cantidad);
    } else {
      items.sort((a, b) => b.monto - a.monto);
    }

    return items.slice(0, limit);
  } catch (error) {
    console.error("Error obteniendo Top Items", error);
    return [];
  }
}

/**
 * Obtener lista de productos con métricas resumidas para el catálogo
 */
export async function getProductosList(
  year: number | string = 'todos',
  search: string = '',
  limit: number = 100,
  orderBy: 'monto' | 'cantidad' | 'stock' = 'monto'
): Promise<ProductListItem[]> {
  try {
    const inventario = await parseTxtFile('inventario.txt');
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const facturas_ren = await parseTxtFile('facturas_ren.txt');
    const devoluciones_enc = await parseTxtFile('devoluciones_enc.txt');
    const devoluciones_ren = await parseTxtFile('devoluciones_ren.txt');
    const inactivos = await getInactiveClientsSet();

    // Map de productos maestro
    const prodMap = new Map<string, ProductListItem>();
    for (const p of inventario) {
      const codart = (p.codart || p.item || '').trim();
      if (!codart) continue;

      const stk01 = parseFloat(p.stk01 || '0');
      const stk06 = parseFloat(p.stk06 || '0');
      const stock = (isNaN(stk01) ? 0 : stk01) + (isNaN(stk06) ? 0 : stk06);

      prodMap.set(codart.toUpperCase(), {
        codart: codart,
        nomart: p.nomart || p.descrip || codart,
        grupo: p.grupo || '',
        marca: p.marca || '',
        precio_a: parseFloat(p.precio_a || '0'),
        cantidad_vendida: 0,
        monto_vendido: 0,
        devoluciones_cantidad: 0,
        devoluciones_monto: 0,
        stock_actual: stock,
        ultima_venta: '00000000',
      });
    }

    // Identificar facturas válidas
    const validFacturas = new Map<string, string>(); // numfac -> emision
    for (const f of facturas_enc) {
      if (f.tipo === 'NC') continue;
      if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) continue;
      if (!isFacturaValida(f)) continue;
      if (!matchesYear(f.emision, year)) continue;
      if (inactivos.has(f.cliente)) continue;
      validFacturas.set(f.numfac, f.emision);
    }

    // Sumar ventas por producto
    for (const r of facturas_ren) {
      const emision = validFacturas.get(r.numfac);
      if (!emision) continue;

      const codart = (r.codart || r.item || '').trim().toUpperCase();
      let prod = prodMap.get(codart);

      // Si no existía en inventario maestro, crearlo dinámicamente
      if (!prod && codart) {
        prod = {
          codart: (r.codart || r.item || '').trim(),
          nomart: r.descrip || codart,
          grupo: '',
          marca: '',
          precio_a: parseFloat(r.precio || '0'),
          cantidad_vendida: 0,
          monto_vendido: 0,
          devoluciones_cantidad: 0,
          devoluciones_monto: 0,
          stock_actual: 0,
          ultima_venta: '00000000',
        };
        prodMap.set(codart, prod);
      }

      if (prod) {
        prod.cantidad_vendida += parseFloat(r.cantidad || '0');
        prod.monto_vendido += parseFloat(r.tot_ren || '0');
        if (emision > prod.ultima_venta) {
          prod.ultima_venta = emision;
        }
      }
    }

    // Identificar devoluciones válidas
    const validDevos = new Set<string>();
    for (const d of devoluciones_enc) {
      if (!matchesYear(d.emision, year)) continue;
      if (inactivos.has(d.cliente)) continue;
      validDevos.add(d.numdevo);
    }

    // Sumar devoluciones
    for (const dr of devoluciones_ren) {
      if (!validDevos.has(dr.numdevo)) continue;
      const codart = (dr.item || dr.codart || '').trim().toUpperCase();
      const prod = prodMap.get(codart);
      if (prod) {
        prod.devoluciones_cantidad += parseFloat(dr.cantidad || '0');
        prod.devoluciones_monto += parseFloat(dr.importe || dr.tot_ren || '0');
      }
    }

    let result = Array.from(prodMap.values());

    // Formatear fechas
    result = result.map(p => ({
      ...p,
      ultima_venta: p.ultima_venta.length === 8
        ? `${p.ultima_venta.substring(0, 4)}-${p.ultima_venta.substring(4, 6)}-${p.ultima_venta.substring(6, 8)}`
        : (p.ultima_venta === '00000000' ? 'Sin ventas' : p.ultima_venta),
    }));

    // Filtrar por término de búsqueda (código, nombre, grupo, marca)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p =>
        p.codart.toLowerCase().includes(q) ||
        p.nomart.toLowerCase().includes(q) ||
        p.grupo.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q)
      );
    }

    // Ordenar
    if (orderBy === 'cantidad') {
      result.sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);
    } else if (orderBy === 'stock') {
      result.sort((a, b) => b.stock_actual - a.stock_actual);
    } else {
      result.sort((a, b) => b.monto_vendido - a.monto_vendido);
    }

    return result.slice(0, limit);
  } catch (error) {
    console.error("Error obteniendo lista de productos", error);
    return [];
  }
}

/**
 * Obtener detalle analítico completo de un producto específico (Módulo 2)
 */
export async function getProductoDetail(
  codartParam: string,
  year: number | string = 'todos'
): Promise<ProductDetail | null> {
  try {
    const codartTarget = decodeURIComponent(codartParam).trim().toUpperCase();
    const inventario = await parseTxtFile('inventario.txt');
    const movimientos = await parseTxtFile('movimientos.txt');
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const facturas_ren = await parseTxtFile('facturas_ren.txt');
    const devoluciones_enc = await parseTxtFile('devoluciones_enc.txt');
    const devoluciones_ren = await parseTxtFile('devoluciones_ren.txt');
    const clientes = await parseTxtFile('clientes.txt');
    const transito = await parseTxtFile('transito.txt');
    const produccion = await parseTxtFile('produccion.txt');
    const inactivos = await getInactiveClientsSet();

    // Map de clientes para nombres
    const clientMap = new Map<string, string>();
    for (const c of clientes) {
      if (c.codcli) {
        clientMap.set(c.codcli, c.nomcli || c.codcli);
      }
    }

    // Buscar maestro de producto
    const pMaster = inventario.find(p =>
      (p.codart || p.item || '').trim().toUpperCase() === codartTarget ||
      (p.alterno || '').trim().toUpperCase() === codartTarget
    );

    const nomart = pMaster?.nomart || pMaster?.descrip || codartTarget;
    const grupo = pMaster?.grupo || '';
    const marca = pMaster?.marca || '';
    const precio_a = parseFloat(pMaster?.precio_a || '0');
    const precio_b = parseFloat(pMaster?.precio_b || '0');
    const precio_d = parseFloat(pMaster?.precio_d || '0');

    const stk01 = parseFloat(pMaster?.stk01 || '0');
    const stk03 = parseFloat(pMaster?.stk03 || '0');
    const stk06 = parseFloat(pMaster?.stk06 || '0');
    const stock_actual = (isNaN(stk01) ? 0 : stk01) + (isNaN(stk03) ? 0 : stk03) + (isNaN(stk06) ? 0 : stk06);
    const stock_disponible = stock_actual; // Almacenes de venta

    // Mercancía en tránsito y producción
    let pendiente_transito = 0;
    for (const t of transito) {
      if ((t.item || t.codart || '').trim().toUpperCase() === codartTarget) {
        pendiente_transito += parseFloat(t.penddesp || t.cantidad || '0');
      }
    }

    let pendiente_produccion = 0;
    for (const pr of produccion) {
      if ((pr.item || pr.codart || '').trim().toUpperCase() === codartTarget) {
        const cant = parseFloat(pr.cantidad || '0');
        const desp = parseFloat(pr.despacho || '0');
        pendiente_produccion += Math.max(0, cant - desp);
      }
    }

    // Identificar facturas válidas
    const validFacturas = new Map<string, { emision: string, cliente: string }>();
    for (const f of facturas_enc) {
      if (f.tipo === 'NC') continue;
      if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) continue;
      if (!isFacturaValida(f)) continue;
      if (!matchesYear(f.emision, year)) continue;
      if (inactivos.has(f.cliente)) continue;
      validFacturas.set(f.numfac, { emision: f.emision, cliente: f.cliente });
    }

    // Ventas acumuladas y por mes
    let cantidad_vendida = 0;
    let monto_vendido = 0;
    const facturasSet = new Set<string>();
    const monthlyMap = new Map<string, { cantidad: number, monto: number, devoluciones_monto: number }>();
    const clientSalesMap = new Map<string, { cantidad: number, monto: number, comprasSet: Set<string>, ultima_compra: string }>();
    let ultima_venta = '00000000';

    for (const r of facturas_ren) {
      const itemCode = (r.codart || r.item || '').trim().toUpperCase();
      if (itemCode !== codartTarget) continue;

      const fInfo = validFacturas.get(r.numfac);
      if (!fInfo) continue;

      const qty = parseFloat(r.cantidad || '0');
      const amt = parseFloat(r.tot_ren || '0');

      cantidad_vendida += qty;
      monto_vendido += amt;
      facturasSet.add(r.numfac);

      if (fInfo.emision > ultima_venta) {
        ultima_venta = fInfo.emision;
      }

      // Desglose mensual YYYY-MM
      if (fInfo.emision && fInfo.emision.length >= 6) {
        const mesKey = `${fInfo.emision.substring(0, 4)}-${fInfo.emision.substring(4, 6)}`;
        if (!monthlyMap.has(mesKey)) {
          monthlyMap.set(mesKey, { cantidad: 0, monto: 0, devoluciones_monto: 0 });
        }
        const m = monthlyMap.get(mesKey)!;
        m.cantidad += qty;
        m.monto += amt;
      }

      // Desglose por cliente
      if (fInfo.cliente) {
        if (!clientSalesMap.has(fInfo.cliente)) {
          clientSalesMap.set(fInfo.cliente, { cantidad: 0, monto: 0, comprasSet: new Set(), ultima_compra: '00000000' });
        }
        const cData = clientSalesMap.get(fInfo.cliente)!;
        cData.cantidad += qty;
        cData.monto += amt;
        cData.comprasSet.add(r.numfac);
        if (fInfo.emision > cData.ultima_compra) {
          cData.ultima_compra = fInfo.emision;
        }
      }
    }

    // Devoluciones
    const validDevos = new Map<string, string>(); // numdevo -> emision
    for (const d of devoluciones_enc) {
      if (!matchesYear(d.emision, year)) continue;
      if (inactivos.has(d.cliente)) continue;
      validDevos.set(d.numdevo, d.emision);
    }

    let cantidad_devuelta = 0;
    let monto_devuelto = 0;
    const devosSet = new Set<string>();

    for (const dr of devoluciones_ren) {
      const itemCode = (dr.item || dr.codart || '').trim().toUpperCase();
      if (itemCode !== codartTarget) continue;

      const emision = validDevos.get(dr.numdevo);
      if (!emision) continue;

      const qty = parseFloat(dr.cantidad || '0');
      const amt = parseFloat(dr.importe || dr.tot_ren || '0');

      cantidad_devuelta += qty;
      monto_devuelto += amt;
      devosSet.add(dr.numdevo);

      // Agregar devolución a la serie mensual
      if (emision && emision.length >= 6) {
        const mesKey = `${emision.substring(0, 4)}-${emision.substring(4, 6)}`;
        if (monthlyMap.has(mesKey)) {
          monthlyMap.get(mesKey)!.devoluciones_monto += amt;
        }
      }
    }

    // Ratios de Devolución
    const num_pedidos = facturasSet.size;
    const num_pedidos_afectados = devosSet.size;
    const pct_cantidad_devo = cantidad_vendida > 0 ? (cantidad_devuelta / cantidad_vendida) * 100 : 0;
    const pct_monto_devo = monto_vendido > 0 ? (monto_devuelto / monto_vendido) * 100 : 0;
    const pct_pedidos_devo = num_pedidos > 0 ? (num_pedidos_afectados / num_pedidos) * 100 : 0;

    // Métricas de Rotación (Velocidad Diaria, Días y Meses de Inventario)
    // Usar ventana de 365 días (o días transcurridos si es año actual)
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
    const velocidad_diaria = cantidad_vendida / diasVentana;
    const dias_inventario = velocidad_diaria > 0 ? stock_actual / velocidad_diaria : 999;
    const meses_inventario = velocidad_diaria > 0 ? stock_actual / (velocidad_diaria * 30) : 99;

    // Cálculo de Días sin Inventario
    let stock_diario = 0;
    // Encontrar AP (Apertura)
    const movs_ap = movimientos.filter((m: any) => (m.codmovart || '').trim().toUpperCase() === codartTarget && (m.numdoc || '').toUpperCase().startsWith('AP'));
    for (const ap of movs_ap) {
      const tipinv = (ap.tipinv || '').toUpperCase();
      if (tipinv === 'EN') {
        stock_diario += parseFloat(ap.cantidad || '0');
      } else if (tipinv === 'SA') {
        stock_diario -= parseFloat(ap.cantidad || '0');
      }
    }

    // Filtrar movimientos del año (que no sean AP)
    const movs_year = movimientos.filter((m: any) => 
      (m.codmovart || '').trim().toUpperCase() === codartTarget &&
      !(m.numdoc || '').toUpperCase().startsWith('AP') &&
      (year === 'todos' || matchesYear(m.fecha_mov, year))
    );

    // Agrupar por día
    const movs_por_dia = new Map<string, number>();
    for (const m of movs_year) {
      const fecha = m.fecha_mov;
      if (!fecha || fecha.length < 8) continue;
      const cant = parseFloat(m.cantidad || '0');
      const tipinv = (m.tipinv || '').toUpperCase();
      const delta = tipinv === 'EN' ? cant : (tipinv === 'SA' ? -cant : 0);
      movs_por_dia.set(fecha, (movs_por_dia.get(fecha) || 0) + delta);
    }

    let dias_sin_inventario = 0;
    let startStr = '';
    let endStr = '';

    if (year === 'todos') {
      let minDate = '99999999';
      let maxDate = '00000000';
      for (const m of movs_year) {
        if (m.fecha_mov && m.fecha_mov < minDate) minDate = m.fecha_mov;
        if (m.fecha_mov && m.fecha_mov > maxDate) maxDate = m.fecha_mov;
      }
      if (minDate !== '99999999') {
        startStr = minDate;
        endStr = maxDate;
      }
    } else {
      startStr = `${year}0101`;
      endStr = `${year}1231`;
      const today = new Date();
      const currentYear = today.getFullYear().toString();
      if (year.toString() === currentYear) {
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        endStr = `${currentYear}${mm}${dd}`;
      }
    }

    if (startStr && endStr) {
      let currentDate = new Date(
        parseInt(startStr.substring(0, 4)),
        parseInt(startStr.substring(4, 6)) - 1,
        parseInt(startStr.substring(6, 8))
      );
      const endDate = new Date(
        parseInt(endStr.substring(0, 4)),
        parseInt(endStr.substring(4, 6)) - 1,
        parseInt(endStr.substring(6, 8))
      );

      while (currentDate <= endDate) {
        const yyyy = currentDate.getFullYear().toString();
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;

        if (movs_por_dia.has(dateStr)) {
          stock_diario += movs_por_dia.get(dateStr)!;
        }

        // Permitir un margen pequeño para problemas de precisión decimal
        if (stock_diario <= 0.001) {
          dias_sin_inventario++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Formatear serie mensual en orden cronológico
    const ventas_mensuales: ProductMonthlySales[] = Array.from(monthlyMap.entries())
      .map(([mes, data]) => ({
        mes,
        cantidad: Math.round(data.cantidad * 100) / 100,
        monto: Math.round(data.monto * 100) / 100,
        devoluciones_monto: Math.round(data.devoluciones_monto * 100) / 100,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Formatear Top Clientes (se enviarán todos y el frontend los paginará/ordenará)
    const top_clientes: ProductTopClient[] = Array.from(clientSalesMap.entries())
      .map(([codcli, data]) => ({
        codcli,
        nomcli: clientMap.get(codcli) || codcli,
        cantidad_comprada: Math.round(data.cantidad * 100) / 100,
        monto_comprado: Math.round(data.monto * 100) / 100,
        num_compras: data.comprasSet.size,
        ultima_compra: data.ultima_compra,
      }))
      .sort((a, b) => b.monto_comprado - a.monto_comprado);

    const formattedUltimaVenta = ultima_venta.length === 8
      ? `${ultima_venta.substring(0, 4)}-${ultima_venta.substring(4, 6)}-${ultima_venta.substring(6, 8)}`
      : (ultima_venta === '00000000' ? 'Sin registros' : ultima_venta);

    return {
      codart: codartTarget,
      nomart,
      grupo,
      marca,
      precio_a,
      precio_b,
      precio_d,
      cantidad_vendida: Math.round(cantidad_vendida * 100) / 100,
      monto_vendido: Math.round(monto_vendido * 100) / 100,
      num_pedidos,
      cantidad_devuelta: Math.round(cantidad_devuelta * 100) / 100,
      monto_devuelto: Math.round(monto_devuelto * 100) / 100,
      num_pedidos_afectados,
      pct_cantidad_devo: Math.round(pct_cantidad_devo * 100) / 100,
      pct_monto_devo: Math.round(pct_monto_devo * 100) / 100,
      pct_pedidos_devo: Math.round(pct_pedidos_devo * 100) / 100,
      stock_actual,
      stock_disponible,
      velocidad_diaria: Math.round(velocidad_diaria * 1000) / 1000,
      dias_inventario: Math.round(dias_inventario * 10) / 10,
      dias_sin_inventario,
      meses_inventario: Math.round(meses_inventario * 10) / 10,
      pendiente_transito,
      pendiente_produccion,
      ventas_mensuales,
      top_clientes,
      ultima_venta: formattedUltimaVenta,
    };
  } catch (error) {
    console.error("Error obteniendo detalle de producto", error);
    return null;
  }
}

/**
 * Obtener comparativa interanual de un producto entre dos años (ej. 2025 vs 2026)
 */
export async function getProductComparison(
  codartParam: string,
  yearA: string = '2024',
  yearB: string = '2025'
): Promise<ProductCompareData | null> {
  try {
    const detailA = await getProductoDetail(codartParam, yearA);
    const detailB = await getProductoDetail(codartParam, yearB);

    if (!detailA && !detailB) return null;

    const codart = detailA?.codart || detailB?.codart || codartParam;
    const nomart = detailA?.nomart || detailB?.nomart || codartParam;

    const periodA: ProductComparePeriod = {
      year: yearA,
      monto_vendido: detailA?.monto_vendido || 0,
      cantidad_vendida: detailA?.cantidad_vendida || 0,
      num_pedidos: detailA?.num_pedidos || 0,
      devoluciones_monto: detailA?.monto_devuelto || 0,
      devoluciones_cantidad: detailA?.cantidad_devuelta || 0,
      pct_monto_devo: detailA?.pct_monto_devo || 0,
      ventas_mensuales: detailA?.ventas_mensuales || [],
    };

    const periodB: ProductComparePeriod = {
      year: yearB,
      monto_vendido: detailB?.monto_vendido || 0,
      cantidad_vendida: detailB?.cantidad_vendida || 0,
      num_pedidos: detailB?.num_pedidos || 0,
      devoluciones_monto: detailB?.monto_devuelto || 0,
      devoluciones_cantidad: detailB?.cantidad_devuelta || 0,
      pct_monto_devo: detailB?.pct_monto_devo || 0,
      ventas_mensuales: detailB?.ventas_mensuales || [],
    };

    const calcPct = (b: number, a: number) => {
      if (a === 0) return b > 0 ? 100 : 0;
      return Math.round(((b - a) / a) * 1000) / 10;
    };

    return {
      codart,
      nomart,
      periodoA: periodA,
      periodoB: periodB,
      varianza: {
        monto_abs: Math.round((periodB.monto_vendido - periodA.monto_vendido) * 100) / 100,
        monto_pct: calcPct(periodB.monto_vendido, periodA.monto_vendido),
        cantidad_abs: Math.round((periodB.cantidad_vendida - periodA.cantidad_vendida) * 100) / 100,
        cantidad_pct: calcPct(periodB.cantidad_vendida, periodA.cantidad_vendida),
        pedidos_abs: periodB.num_pedidos - periodA.num_pedidos,
        pedidos_pct: calcPct(periodB.num_pedidos, periodA.num_pedidos),
        devoluciones_abs: Math.round((periodB.devoluciones_monto - periodA.devoluciones_monto) * 100) / 100,
        devoluciones_pct: calcPct(periodB.devoluciones_monto, periodA.devoluciones_monto),
      },
    };
  } catch (error) {
    console.error("Error obteniendo comparativa de producto", error);
    return null;
  }
}

/**
 * Obtener resumen consolidado por grupos / familias de repuestos
 */
export async function getProductGroupsSummary(
  year: number | string = 'todos'
): Promise<ProductGroupSummary[]> {
  try {
    const grupos = await parseTxtFile('grupos.txt');
    const groupNameMap = new Map<string, string>();
    for (const g of grupos) {
      const code = (g.gruart || g.codigo || '').trim().toUpperCase();
      if (code) {
        groupNameMap.set(code, g.nomgruart || g.nombre || code);
      }
    }

    const productos = await getProductosList(year, '', 5000, 'monto');
    const groupMap = new Map<string, {
      grupo: string;
      nomgrupo: string;
      total_articulos: number;
      cantidad_vendida: number;
      monto_vendido: number;
      devoluciones_monto: number;
      lider: { nomart: string, monto: number };
    }>();

    for (const p of productos) {
      const gCode = (p.grupo || 'GENERAL').trim().toUpperCase();
      if (!groupMap.has(gCode)) {
        groupMap.set(gCode, {
          grupo: gCode,
          nomgrupo: groupNameMap.get(gCode) || gCode,
          total_articulos: 0,
          cantidad_vendida: 0,
          monto_vendido: 0,
          devoluciones_monto: 0,
          lider: { nomart: '', monto: -1 },
        });
      }

      const gData = groupMap.get(gCode)!;
      gData.total_articulos += 1;
      gData.cantidad_vendida += p.cantidad_vendida;
      gData.monto_vendido += p.monto_vendido;
      gData.devoluciones_monto += p.devoluciones_monto;

      if (p.monto_vendido > gData.lider.monto) {
        gData.lider = { nomart: p.nomart, monto: p.monto_vendido };
      }
    }

    return Array.from(groupMap.values())
      .map(g => ({
        grupo: g.grupo,
        nomgrupo: g.nomgrupo,
        total_articulos: g.total_articulos,
        cantidad_vendida: Math.round(g.cantidad_vendida * 100) / 100,
        monto_vendido: Math.round(g.monto_vendido * 100) / 100,
        devoluciones_monto: Math.round(g.devoluciones_monto * 100) / 100,
        producto_lider: g.lider.nomart || 'N/A',
      }))
      .sort((a, b) => b.monto_vendido - a.monto_vendido);
  } catch (error) {
    console.error("Error obteniendo resumen de grupos", error);
    return [];
  }
}

/**
 * Obtener distribución de existencias por almacén para un producto
 */
export async function getProductWarehouseStock(
  codartParam: string
): Promise<ProductWarehouseStock[]> {
  try {
    const codartTarget = decodeURIComponent(codartParam).trim().toUpperCase();
    const inventario = await parseTxtFile('inventario.txt');
    const almacenes = await parseTxtFile('almacenes.txt');

    const pMaster = inventario.find(p =>
      (p.codart || p.item || '').trim().toUpperCase() === codartTarget
    );

    const stk01 = parseFloat(pMaster?.stk01 || '0');
    const stk03 = parseFloat(pMaster?.stk03 || '0');
    const stk06 = parseFloat(pMaster?.stk06 || '0');

    // Mapear almacenes
    const result: ProductWarehouseStock[] = [
      {
        almacen: '01',
        nomalm: almacenes.find(a => a.almacen === '01')?.nomalm || 'ALMACÉN PRINCIPAL / BARQUISIMETO',
        stock: isNaN(stk01) ? 0 : stk01,
        es_vendible: true,
      },
      {
        almacen: '03',
        nomalm: almacenes.find(a => a.almacen === '03')?.nomalm || 'ALMACÉN 3',
        stock: isNaN(stk03) ? 0 : stk03,
        es_vendible: true,
      },
      {
        almacen: '06',
        nomalm: almacenes.find(a => a.almacen === '06')?.nomalm || 'ALMACÉN PISO 1',
        stock: isNaN(stk06) ? 0 : stk06,
        es_vendible: true,
      },
    ];

    return result;
  } catch (error) {
    console.error("Error obteniendo stock por almacén", error);
    return [];
  }
}

/**
 * Obtener movimientos de un producto por año, categorizado por tipo de documento
 */
export async function getProductMovements(
  codartParam: string,
  year: string = '2024'
): Promise<ProductMovementsResponse> {
  try {
    const codartTarget = decodeURIComponent(codartParam).trim().toUpperCase();
    const movimientos = await parseTxtFile('movimientos.txt');
    
    let apertura_total = 0;
    
    // Map to group by mes and almacen
    const map = new Map<string, ProductMovementData>();

    for (const mov of movimientos) {
      if (!mov.codmovart) continue;
      const movCodart = mov.codmovart.trim().toUpperCase();
      if (movCodart !== codartTarget) continue;
      
      const fecha = mov.fecha_mov || ''; // YYYYMMDD
      if (!matchesYear(fecha, year) && year !== 'todos') continue;

      const mesStr = fecha.length >= 6 ? `${fecha.substring(0, 4)}-${fecha.substring(4, 6)}` : 'N/A';
      const almacen = (mov.almacen || '01').trim();
      const numdoc = (mov.numdoc || '').trim().toUpperCase();
      const cantidad = parseFloat(mov.cantidad || '0');

      if (isNaN(cantidad)) continue;

      let tipo = 'OTRO';
      if (numdoc.startsWith('AP')) {
        tipo = 'AP';
        apertura_total += cantidad;
      } else if (/^[0-9]/.test(numdoc)) {
        tipo = 'Recepcion';
      } else if (numdoc.startsWith('AJU')) {
        tipo = 'AJU';
      } else if (numdoc.startsWith('D')) {
        tipo = 'D';
      } else if (numdoc.startsWith('TR')) {
        tipo = 'TR';
      } else if (numdoc.startsWith('NC')) {
        tipo = 'NC';
      }

      const key = `${mesStr}_${almacen}`;
      if (!map.has(key)) {
        map.set(key, {
          mes: mesStr,
          almacen: almacen,
          AP: 0,
          Recepcion: 0,
          AJU: 0,
          D: 0,
          TR: 0,
          NC: 0
        });
      }

      const data = map.get(key)!;
      const absCantidad = Math.abs(cantidad);

      if (tipo === 'AP') data.AP += absCantidad;
      else if (tipo === 'Recepcion') data.Recepcion += absCantidad;
      else if (tipo === 'AJU') data.AJU += absCantidad;
      else if (tipo === 'D') data.D += absCantidad;
      else if (tipo === 'TR') data.TR += absCantidad;
      else if (tipo === 'NC') data.NC += absCantidad;
    }

    const result = Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));

    return {
      apertura_total,
      movimientos: result
    };
  } catch (error) {
    console.error("Error obteniendo movimientos del producto", error);
    return {
      apertura_total: 0,
      movimientos: []
    };
  }
}




export async function getProductKardex(
  codartParam: string,
  year: number | string = 'todos'
): Promise<ProductKardexRow[]> {
  try {
    const codartTarget = decodeURIComponent(codartParam).trim().toUpperCase();
    const movimientos = await parseTxtFile('movimientos.txt');
    
    // Filtrar movimientos por producto y año
    const kardexRows: Omit<ProductKardexRow, 'saldo_progresivo'>[] = [];
    
    for (const m of movimientos) {
      const codart = (m.codmovart || m.item || '').trim().toUpperCase();
      if (codart !== codartTarget) continue;
      if (!matchesYear(m.fecha_mov, year)) continue;
      
      const tipo = (m.tipinv || '').toUpperCase();
      let cant = parseFloat(m.cantidad || '0');
      
      if (tipo === 'SA' || tipo === 'ST') {
        cant = -cant;
      }
      
      kardexRows.push({
        fecha: m.fecha_mov,
        documento: m.numdoc || 'N/A',
        tipo: tipo,
        almacen: m.almacen || 'N/A',
        cantidad: cant
      });
    }
    
    // Ordenar cronológicamente
    kardexRows.sort((a, b) => a.fecha.localeCompare(b.fecha));
    
    // Calcular saldo progresivo
    let saldo = 0;
    const result: ProductKardexRow[] = [];
    
    for (const row of kardexRows) {
      saldo += row.cantidad;
      result.push({
        ...row,
        saldo_progresivo: saldo
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error obteniendo kardex del producto", error);
    return [];
  }
}
