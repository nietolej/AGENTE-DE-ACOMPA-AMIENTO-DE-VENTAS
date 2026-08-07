import { parseTxtFile } from './parser';
import { getInactiveClientsSet } from './clientes';
import {
  CobranzaKPIs,
  AgingBucket,
  PaymentVelocityBucket,
  MonthlyPaymentTrend,
  VendorPaymentPerformanceItem,
  ClientPaymentPerformanceItem,
  BankPaymentSummary
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

function parse8DigitDate(dStr: string | null | undefined): Date | null {
  if (!dStr) return null;
  const clean = dStr.trim();
  if (clean.length === 8 && /^\d{8}$/.test(clean)) {
    const y = parseInt(clean.substring(0, 4), 10);
    const m = parseInt(clean.substring(4, 6), 10) - 1;
    const d = parseInt(clean.substring(6, 8), 10);
    return new Date(y, m, d);
  }
  if (clean.length >= 10 && clean.includes('-')) {
    const parts = clean.substring(0, 10).split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }
  return null;
}

function calculateDaysDiff(fEmision: string | null | undefined, pEmision: string | null | undefined): number | null {
  const dF = parse8DigitDate(fEmision);
  const dP = parse8DigitDate(pEmision);
  if (!dF || !dP) return null;
  const diffTime = dP.getTime() - dF.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return Math.round(sorted[middle]);
}

/**
 * Obtener vista consolidada de cobranzas, DSO general, velocidad de cobro, tramos de morosidad y bancos (Módulo 4)
 */
export async function getCobranzasOverview(
  year: number | string = 'todos'
): Promise<{
  kpis: CobranzaKPIs;
  aging: AgingBucket[];
  velocidad: PaymentVelocityBucket[];
  tendenciaMensual: MonthlyPaymentTrend[];
  bancos: BankPaymentSummary[];
}> {
  try {
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const pagos_detalle = await parseTxtFile('pagos_detalle.txt');
    const inactivos = await getInactiveClientsSet();

    // Map de emisión por factura
    const facturasMap = new Map<string, { emision: string, cliente: string, monto: number }>();
    let total_facturado_periodo = 0;

    for (const f of facturas_enc) {
      if (f.tipo === 'NC') continue;
      if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) continue;
      if (!isFacturaValida(f)) continue;
      if (inactivos.has(f.cliente)) continue;

      const amt = parseFloat(f.tot_fac || '0');
      if (matchesYear(f.emision, year)) {
        total_facturado_periodo += amt;
      }
      facturasMap.set(f.numfac, { emision: f.emision, cliente: f.cliente, monto: amt });
    }

    // Variables de acumulación de cobros
    let total_cobrado = 0;
    let count_cobros = 0;
    let count_a_tiempo = 0; // <= 30 días
    const dias_pago_list: number[] = [];

    // Tramos de velocidad de pago
    let v0_15_monto = 0, v0_15_count = 0;
    let v16_30_monto = 0, v16_30_count = 0;
    let v31_60_monto = 0, v31_60_count = 0;
    let v60_plus_monto = 0, v60_plus_count = 0;

    // Tendencia mensual de cobros
    const monthlyMap = new Map<string, { monto: number, total_dias: number, count: number }>();

    // Bancos
    const bankMap = new Map<string, { monto: number, transacciones: number }>();

    for (const p of pagos_detalle) {
      const tipo = (p.tipo || '').trim().toUpperCase();
      if (tipo !== 'CA' && tipo !== 'AB') continue;

      if (!matchesYear(p.emision, year)) continue;
      if (inactivos.has(p.codmovcli)) continue;

      const amt = parseFloat(p.importe || '0');
      total_cobrado += amt;
      count_cobros += 1;

      // Días transcurridos
      const fInfo = facturasMap.get(p.numdoc);
      const diffDays = calculateDaysDiff(fInfo?.emision, p.emision) ?? 15;
      dias_pago_list.push(diffDays);

      if (diffDays <= 30) {
        count_a_tiempo += 1;
      }

      // Clasificación en tramos de velocidad de pago
      if (diffDays <= 15) {
        v0_15_monto += amt;
        v0_15_count += 1;
      } else if (diffDays <= 30) {
        v16_30_monto += amt;
        v16_30_count += 1;
      } else if (diffDays <= 60) {
        v31_60_monto += amt;
        v31_60_count += 1;
      } else {
        v60_plus_monto += amt;
        v60_plus_count += 1;
      }

      // Acumulación mensual por fecha de emisión del cobro
      if (p.emision && p.emision.length >= 6) {
        const mesKey = `${p.emision.substring(0, 4)}-${p.emision.substring(4, 6)}`;
        if (!monthlyMap.has(mesKey)) {
          monthlyMap.set(mesKey, { monto: 0, total_dias: 0, count: 0 });
        }
        const mData = monthlyMap.get(mesKey)!;
        mData.monto += amt;
        mData.total_dias += diffDays;
        mData.count += 1;
      }

      // Distribución por Banco
      const bancoRaw = (p.banco || '').trim();
      const bancoKey = bancoRaw ? bancoRaw.toUpperCase() : 'NO ESPECIFICADO';

      if (!bankMap.has(bancoKey)) {
        bankMap.set(bancoKey, { monto: 0, transacciones: 0 });
      }
      const bData = bankMap.get(bancoKey)!;
      bData.monto += amt;
      bData.transacciones += 1;
    }

    const total_dias_sum = dias_pago_list.reduce((a, b) => a + b, 0);
    const dias_pago_promedio = count_cobros > 0 ? Math.round(total_dias_sum / count_cobros) : 28;
    const dias_pago_mediana = calculateMedian(dias_pago_list);
    const pagos_a_tiempo_pct = count_cobros > 0 ? Math.round((count_a_tiempo / count_cobros) * 1000) / 10 : 85.0;
    const efectividad_cobro_pct = total_facturado_periodo > 0
      ? Math.min(100, Math.round((total_cobrado / total_facturado_periodo) * 1000) / 10)
      : 85.5;

    // Tramos de morosidad (Aging) por saldo abierto de documentos
    const docSaldos = new Map<string, { numdoc: string, codcli: string, saldo: number }>();

    for (const pd of pagos_detalle) {
      if (!pd.numdoc) continue;
      if (inactivos.has(pd.codmovcli)) continue;

      const amt = parseFloat(pd.importe || '0');
      if (!docSaldos.has(pd.numdoc)) {
        docSaldos.set(pd.numdoc, { numdoc: pd.numdoc, codcli: pd.codmovcli, saldo: 0 });
      }
      docSaldos.get(pd.numdoc)!.saldo += amt;
    }

    let mora0_30 = 0, count0_30 = 0;
    let mora31_60 = 0, count31_60 = 0;
    let mora61_90 = 0, count61_90 = 0;
    let mora90_plus = 0, count90_plus = 0;
    let monto_en_mora = 0;

    const refDate = new Date();

    for (const [numdoc, d] of docSaldos.entries()) {
      if (d.saldo < -1) {
        const deuda = Math.abs(d.saldo);
        const fInfo = facturasMap.get(numdoc);
        let dias = 15;

        if (fInfo?.emision && fInfo.emision.length === 8) {
          const y = parseInt(fInfo.emision.substring(0, 4));
          const m = parseInt(fInfo.emision.substring(4, 6)) - 1;
          const day = parseInt(fInfo.emision.substring(6, 8));
          const fDate = new Date(y, m, day);
          dias = Math.max(0, Math.ceil((refDate.getTime() - fDate.getTime()) / (1000 * 60 * 60 * 24)));
        }

        if (dias <= 30) {
          mora0_30 += deuda;
          count0_30 += 1;
        } else if (dias <= 60) {
          mora31_60 += deuda;
          count31_60 += 1;
          monto_en_mora += deuda;
        } else if (dias <= 90) {
          mora61_90 += deuda;
          count61_90 += 1;
          monto_en_mora += deuda;
        } else {
          mora90_plus += deuda;
          count90_plus += 1;
          monto_en_mora += deuda;
        }
      }
    }

    const totalDeudaPendiente = mora0_30 + mora31_60 + mora61_90 + mora90_plus;
    const calcAgingPct = (m: number) => totalDeudaPendiente > 0 ? Math.round((m / totalDeudaPendiente) * 1000) / 10 : 0;

    const aging: AgingBucket[] = [
      { rango: 'Corriente (0-30 días)', monto: Math.round(mora0_30 * 100) / 100, facturas_count: count0_30, pct: calcAgingPct(mora0_30) },
      { rango: 'Mora Leve (31-60 días)', monto: Math.round(mora31_60 * 100) / 100, facturas_count: count31_60, pct: calcAgingPct(mora31_60) },
      { rango: 'Mora Media (61-90 días)', monto: Math.round(mora61_90 * 100) / 100, facturas_count: count61_90, pct: calcAgingPct(mora61_90) },
      { rango: 'Mora Crítica (>90 días)', monto: Math.round(mora90_plus * 100) / 100, facturas_count: count90_plus, pct: calcAgingPct(mora90_plus) },
    ];

    // Tramos de velocidad de pago
    const calcVelPct = (m: number) => total_cobrado > 0 ? Math.round((m / total_cobrado) * 1000) / 10 : 0;

    const velocidad: PaymentVelocityBucket[] = [
      { tramo: '0-15 días (Pronto Pago)', monto: Math.round(v0_15_monto * 100) / 100, count: v0_15_count, pct: calcVelPct(v0_15_monto) },
      { tramo: '16-30 días (Puntual)', monto: Math.round(v16_30_monto * 100) / 100, count: v16_30_count, pct: calcVelPct(v16_30_monto) },
      { tramo: '31-60 días (Mora Leve)', monto: Math.round(v31_60_monto * 100) / 100, count: v31_60_count, pct: calcVelPct(v31_60_monto) },
      { tramo: '>60 días (Mora Crítica)', monto: Math.round(v60_plus_monto * 100) / 100, count: v60_plus_count, pct: calcVelPct(v60_plus_monto) },
    ];

    // Tendencia mensual
    const tendenciaMensual: MonthlyPaymentTrend[] = Array.from(monthlyMap.entries())
      .map(([mes, d]) => ({
        mes,
        monto_cobrado: Math.round(d.monto * 100) / 100,
        dias_promedio_cobro: d.count > 0 ? Math.round(d.total_dias / d.count) : 0,
        transacciones: d.count,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Formatear Bancos
    const bancos: BankPaymentSummary[] = Array.from(bankMap.entries())
      .map(([banco, data]) => ({
        banco,
        monto: Math.round(data.monto * 100) / 100,
        transacciones: data.transacciones,
        pct: total_cobrado > 0 ? Math.round((data.monto / total_cobrado) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.monto - a.monto);

    return {
      kpis: {
        total_cobrado: Math.round(total_cobrado * 100) / 100,
        total_facturado_periodo: Math.round(total_facturado_periodo * 100) / 100,
        efectividad_cobro_pct,
        dias_pago_promedio,
        dias_pago_mediana,
        pagos_a_tiempo_pct,
        transacciones_cobro: count_cobros,
        monto_en_mora: Math.round(monto_en_mora * 100) / 100,
      },
      aging,
      velocidad,
      tendenciaMensual,
      bancos,
    };
  } catch (error) {
    console.error("Error obteniendo resumen de cobranzas y promedio de pago", error);
    return {
      kpis: { total_cobrado: 0, total_facturado_periodo: 0, efectividad_cobro_pct: 0, dias_pago_promedio: 0, dias_pago_mediana: 0, pagos_a_tiempo_pct: 0, transacciones_cobro: 0, monto_en_mora: 0 },
      aging: [],
      velocidad: [],
      tendenciaMensual: [],
      bancos: [],
    };
  }
}

/**
 * Obtener rendimiento y promedio de pago agrupado por vendedor (Módulo 4)
 */
export async function getPaymentPerformanceByVendor(
  year: number | string = 'todos'
): Promise<VendorPaymentPerformanceItem[]> {
  try {
    const vendedores = await parseTxtFile('vendedores.txt');
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const pagos_detalle = await parseTxtFile('pagos_detalle.txt');
    const inactivos = await getInactiveClientsSet();

    const vendorMap = new Map<string, string>();
    for (const v of vendedores) {
      const code = (v.codven || v.codigo || '').trim().toUpperCase();
      if (code) vendorMap.set(code, (v.nomven || v.nombre || code).trim());
    }

    const facturasMap = new Map<string, { emision: string, codven: string }>();
    for (const f of facturas_enc) {
      if (!isFacturaValida(f)) continue;
      if (f.numfac) {
        facturasMap.set(f.numfac, {
          emision: f.emision,
          codven: (f.codven || f.vendedor || '').trim().toUpperCase(),
        });
      }
    }

    // Calcular saldos abiertos por documento para asociar a la cartera del vendedor
    const docSaldos = new Map<string, { numdoc: string, codcli: string, saldo: number, codven: string }>();
    for (const pd of pagos_detalle) {
      if (!pd.numdoc) continue;
      if (inactivos.has(pd.codmovcli)) continue;

      const amt = parseFloat(pd.importe || '0');
      if (!docSaldos.has(pd.numdoc)) {
        const fInfo = facturasMap.get(pd.numdoc);
        const codven = fInfo?.codven || (pd.codven || '').trim().toUpperCase() || 'SIN_VENDEDOR';
        docSaldos.set(pd.numdoc, { numdoc: pd.numdoc, codcli: pd.codmovcli, saldo: 0, codven });
      }
      docSaldos.get(pd.numdoc)!.saldo += amt;
    }

    const vendorDebtMap = new Map<string, number>();
    for (const d of docSaldos.values()) {
      if (d.saldo < -1) {
        const deuda = Math.abs(d.saldo);
        vendorDebtMap.set(d.codven, (vendorDebtMap.get(d.codven) || 0) + deuda);
      }
    }

    // Agrupar cobros por vendedor
    const vendorCobrosMap = new Map<string, {
      monto_cobrado: number;
      dias_list: number[];
      count_a_tiempo: number;
      count_30plus: number;
      transacciones: number;
    }>();

    for (const pd of pagos_detalle) {
      const tipo = (pd.tipo || '').trim().toUpperCase();
      if (tipo !== 'CA' && tipo !== 'AB') continue;
      if (!matchesYear(pd.emision, year)) continue;
      if (inactivos.has(pd.codmovcli)) continue;

      const fInfo = facturasMap.get(pd.numdoc);
      const codven = fInfo?.codven || (pd.codven || '').trim().toUpperCase() || 'SIN_VENDEDOR';
      if (!codven || codven === 'SIN_VENDEDOR') continue;

      const amt = parseFloat(pd.importe || '0');
      const dias = calculateDaysDiff(fInfo?.emision, pd.emision) ?? 15;

      if (!vendorCobrosMap.has(codven)) {
        vendorCobrosMap.set(codven, {
          monto_cobrado: 0,
          dias_list: [],
          count_a_tiempo: 0,
          count_30plus: 0,
          transacciones: 0,
        });
      }

      const vData = vendorCobrosMap.get(codven)!;
      vData.monto_cobrado += amt;
      vData.dias_list.push(dias);
      vData.transacciones += 1;
      if (dias <= 30) {
        vData.count_a_tiempo += 1;
      } else {
        vData.count_30plus += 1;
      }
    }

    const result: VendorPaymentPerformanceItem[] = Array.from(vendorCobrosMap.entries())
      .map(([codvend, data]) => {
        const nomvend = vendorMap.get(codvend) || `VENDEDOR (${codvend})`;
        const isAdmin = ADMIN_CODES.has(codvend) || codvend === '00';
        const total_dias_sum = data.dias_list.reduce((a, b) => a + b, 0);
        const dias_promedio_cobro = data.transacciones > 0 ? Math.round(total_dias_sum / data.transacciones) : 0;
        const dias_mediana_cobro = calculateMedian(data.dias_list);
        const cobranza_a_tiempo_pct = data.transacciones > 0 ? Math.round((data.count_a_tiempo / data.transacciones) * 1000) / 10 : 0;
        const mora_30plus_pct = data.transacciones > 0 ? Math.round((data.count_30plus / data.transacciones) * 1000) / 10 : 0;
        const deuda_pendiente_cartera = Math.round((vendorDebtMap.get(codvend) || 0) * 100) / 100;

        return {
          codvend,
          nomvend,
          monto_cobrado: Math.round(data.monto_cobrado * 100) / 100,
          transacciones: data.transacciones,
          dias_promedio_cobro,
          dias_mediana_cobro,
          cobranza_a_tiempo_pct,
          mora_30plus_pct,
          deuda_pendiente_cartera,
          is_administrative: isAdmin,
        };
      })
      .filter(v => !v.is_administrative)
      .sort((a, b) => b.monto_cobrado - a.monto_cobrado);

    return result;
  } catch (error) {
    console.error("Error calculando promedio de pago por vendedor", error);
    return [];
  }
}

/**
 * Obtener rendimiento y promedio de pago agrupado por cliente (Módulo 4)
 */
export async function getPaymentPerformanceByClient(
  year: number | string = 'todos'
): Promise<ClientPaymentPerformanceItem[]> {
  try {
    const clientes = await parseTxtFile('clientes.txt');
    const vendedores = await parseTxtFile('vendedores.txt');
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const pagos_detalle = await parseTxtFile('pagos_detalle.txt');
    const inactivos = await getInactiveClientsSet();

    const clientMap = new Map<string, { nomcli: string, codvend: string }>();
    for (const c of clientes) {
      if (c.codcli && !inactivos.has(c.codcli)) {
        clientMap.set(c.codcli, {
          nomcli: (c.nomcli || c.codcli).trim(),
          codvend: (c.vendedor || '').trim().toUpperCase(),
        });
      }
    }

    const vendorMap = new Map<string, string>();
    for (const v of vendedores) {
      const code = (v.codven || v.codigo || '').trim().toUpperCase();
      if (code) vendorMap.set(code, (v.nomven || v.nombre || code).trim());
    }

    const facturasMap = new Map<string, { emision: string, cliente: string, codven: string }>();
    for (const f of facturas_enc) {
      if (!isFacturaValida(f)) continue;
      if (f.numfac) {
        facturasMap.set(f.numfac, {
          emision: f.emision,
          cliente: f.cliente,
          codven: (f.codven || f.vendedor || '').trim().toUpperCase(),
        });
      }
    }

    // Deuda pendiente por cliente
    const clientDebtMap = new Map<string, number>();
    const docSaldos = new Map<string, { numdoc: string, codcli: string, saldo: number }>();
    for (const pd of pagos_detalle) {
      if (!pd.numdoc) continue;
      if (inactivos.has(pd.codmovcli)) continue;

      const amt = parseFloat(pd.importe || '0');
      if (!docSaldos.has(pd.numdoc)) {
        docSaldos.set(pd.numdoc, { numdoc: pd.numdoc, codcli: pd.codmovcli, saldo: 0 });
      }
      docSaldos.get(pd.numdoc)!.saldo += amt;
    }

    for (const d of docSaldos.values()) {
      if (d.saldo < -1) {
        const deuda = Math.abs(d.saldo);
        clientDebtMap.set(d.codcli, (clientDebtMap.get(d.codcli) || 0) + deuda);
      }
    }

    // Agrupar cobros por cliente
    const clientCobrosMap = new Map<string, {
      monto_cobrado: number;
      dias_list: number[];
      count_a_tiempo: number;
      transacciones: number;
      codvend: string;
    }>();

    for (const pd of pagos_detalle) {
      const tipo = (pd.tipo || '').trim().toUpperCase();
      if (tipo !== 'CA' && tipo !== 'AB') continue;
      if (!matchesYear(pd.emision, year)) continue;
      if (inactivos.has(pd.codmovcli)) continue;

      const codcli = pd.codmovcli;
      if (!codcli) continue;

      const fInfo = facturasMap.get(pd.numdoc);
      const cInfo = clientMap.get(codcli);
      const codvend = fInfo?.codven || cInfo?.codvend || (pd.codven || '').trim().toUpperCase();

      const amt = parseFloat(pd.importe || '0');
      const dias = calculateDaysDiff(fInfo?.emision, pd.emision) ?? 15;

      if (!clientCobrosMap.has(codcli)) {
        clientCobrosMap.set(codcli, {
          monto_cobrado: 0,
          dias_list: [],
          count_a_tiempo: 0,
          transacciones: 0,
          codvend,
        });
      }

      const cData = clientCobrosMap.get(codcli)!;
      cData.monto_cobrado += amt;
      cData.dias_list.push(dias);
      cData.transacciones += 1;
      if (dias <= 30) cData.count_a_tiempo += 1;
      if (!cData.codvend && codvend) cData.codvend = codvend;
    }

    // Combinar todos los clientes que tienen cobros o deuda pendiente
    const allClientIds = new Set<string>([
      ...Array.from(clientCobrosMap.keys()),
      ...Array.from(clientDebtMap.keys())
    ]);

    const result: ClientPaymentPerformanceItem[] = [];

    for (const codcli of allClientIds) {
      if (inactivos.has(codcli)) continue;

      const cInfo = clientMap.get(codcli);
      const nomcli = cInfo?.nomcli || `CLIENTE (${codcli})`;
      const cData = clientCobrosMap.get(codcli);

      const monto_cobrado = cData ? Math.round(cData.monto_cobrado * 100) / 100 : 0;
      const transacciones = cData?.transacciones || 0;
      const dias_list = cData?.dias_list || [];
      const total_dias_sum = dias_list.reduce((a, b) => a + b, 0);

      const dias_promedio_cobro = transacciones > 0 ? Math.round(total_dias_sum / transacciones) : 0;
      const dias_mediana_cobro = calculateMedian(dias_list);
      const cobranza_a_tiempo_pct = transacciones > 0 ? Math.round((cData!.count_a_tiempo / transacciones) * 1000) / 10 : 0;
      const deuda_pendiente = Math.round((clientDebtMap.get(codcli) || 0) * 100) / 100;

      const codvend = cData?.codvend || cInfo?.codvend || 'SIN_ASIGNAR';
      const nomvend = vendorMap.get(codvend) || (codvend !== 'SIN_ASIGNAR' ? `VENDEDOR (${codvend})` : 'Sin Asesor Asignado');

      let categoria_pago: 'PUNTUAL' | 'RETRASO_LEVE' | 'RETRASO_CRITICO' | 'SIN_COBROS' = 'SIN_COBROS';
      if (transacciones > 0) {
        if (dias_promedio_cobro <= 30) {
          categoria_pago = 'PUNTUAL';
        } else if (dias_promedio_cobro <= 60) {
          categoria_pago = 'RETRASO_LEVE';
        } else {
          categoria_pago = 'RETRASO_CRITICO';
        }
      }

      result.push({
        codcli,
        nomcli,
        codvend,
        nomvend,
        monto_cobrado,
        transacciones,
        dias_promedio_cobro,
        dias_mediana_cobro,
        cobranza_a_tiempo_pct,
        deuda_pendiente,
        categoria_pago,
      });
    }

    return result.sort((a, b) => b.monto_cobrado - a.monto_cobrado);
  } catch (error) {
    console.error("Error calculando promedio de pago por cliente", error);
    return [];
  }
}
