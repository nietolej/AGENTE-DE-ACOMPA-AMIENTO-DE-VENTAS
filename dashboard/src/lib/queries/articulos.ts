import { parseTxtFile } from './parser';
import { getInactiveClientsSet } from './clientes';

export async function getTopItems(year: number | 'todos', limit: number, orderBy: 'cantidad' | 'monto', codcli?: string, incluirInactivos: boolean = false) {
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
      if (year !== 'todos' && f.emision && f.emision.substring(0,4) !== year.toString()) continue;
      if (!incluirInactivos && inactivos.has(f.cliente)) continue;
      if (codcli && f.cliente !== codcli) continue;
      
      validNumfac.set(f.numfac, f.emision);
    }

    // Agregar renglones de venta
    const itemMap = new Map<string, { descrip: string, cantidad: number, monto: number, devoluciones_cantidad: number, devoluciones_monto: number, ultima_venta: string }>();
    
    for (const r of facturas_ren) {
      const emision = validNumfac.get(r.numfac);
      if (emision) {
        const id = r.codart || r.item || r.descrip || 'Sin Nombre';
        if (!itemMap.has(id)) {
          itemMap.set(id, { descrip: r.descrip || id, cantidad: 0, monto: 0, devoluciones_cantidad: 0, devoluciones_monto: 0, ultima_venta: '00000000' });
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
      if (year !== 'todos' && d.emision && d.emision.substring(0,4) !== year.toString()) continue;
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
