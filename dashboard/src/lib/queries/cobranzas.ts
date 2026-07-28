import { parseTxtFile } from './parser';
import { getInactiveClientsSet } from './clientes';
import { CobranzaKPIs, AgingBucket, VendorCommissionItem, BankPaymentSummary } from '../types';

function matchesYear(emisionDateStr: string | null | undefined, yearParam: number | string): boolean {
  if (yearParam === 'todos' || !yearParam) return true;
  if (!emisionDateStr || emisionDateStr.length < 4) return false;
  const emisionYear = emisionDateStr.substring(0, 4);
  const selectedYears = yearParam.toString().split(',').map(y => y.trim());
  return selectedYears.includes(emisionYear);
}

const ADMIN_CODES = new Set(['00', 'C1', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'D0', 'D1', 'D2', '12']);

/**
 * Obtener vista consolidada de cobranzas, DSO, tramos de morosidad (Aging) y bancos (Módulo 4)
 */
export async function getCobranzasOverview(
  year: number | string = 'todos'
): Promise<{
  kpis: CobranzaKPIs;
  aging: AgingBucket[];
  bancos: BankPaymentSummary[];
}> {
  try {
    const facturas_enc = await parseTxtFile('facturas_enc.txt');
    const cobranzas = await parseTxtFile('cobranzas.txt');
    const pagos_detalle = await parseTxtFile('pagos_detalle.txt');
    const inactivos = await getInactiveClientsSet();

    // Map de emisión por factura
    const facturasMap = new Map<string, { emision: string, cliente: string, monto: number }>();
    let total_facturado_periodo = 0;

    for (const f of facturas_enc) {
      if (f.tipo === 'NC') continue;
      if (!f.numfac || !f.numfac.toUpperCase().startsWith('D')) continue;
      if (inactivos.has(f.cliente)) continue;

      const amt = parseFloat(f.tot_fac || '0');
      if (matchesYear(f.emision, year)) {
        total_facturado_periodo += amt;
      }
      facturasMap.set(f.numfac, { emision: f.emision, cliente: f.cliente, monto: amt });
    }

    // Procesar cobros en pagos_detalle (tipos CA y AB)
    let total_cobrado = 0;
    let total_dias_pago = 0;
    let count_cobros = 0;
    const bankMap = new Map<string, { monto: number, transacciones: number }>();

    for (const p of pagos_detalle) {
      const tipo = (p.tipo || '').trim().toUpperCase();
      if (tipo !== 'CA' && tipo !== 'AB') continue;

      if (!matchesYear(p.emision, year)) continue;
      if (inactivos.has(p.codmovcli)) continue;

      const amt = parseFloat(p.importe || '0');
      total_cobrado += amt;
      count_cobros += 1;

      // Calcular días de cobro transcurridos desde la factura FC
      const fInfo = facturasMap.get(p.numdoc);
      if (fInfo && fInfo.emision && p.emision && fInfo.emision.length === 8 && p.emision.length === 8) {
        const yF = parseInt(fInfo.emision.substring(0, 4));
        const mF = parseInt(fInfo.emision.substring(4, 6)) - 1;
        const dF = parseInt(fInfo.emision.substring(6, 8));
        const dateF = new Date(yF, mF, dF);

        const yP = parseInt(p.emision.substring(0, 4));
        const mP = parseInt(p.emision.substring(4, 6)) - 1;
        const dP = parseInt(p.emision.substring(6, 8));
        const dateP = new Date(yP, mP, dP);

        const diffDays = Math.max(0, Math.ceil((dateP.getTime() - dateF.getTime()) / (1000 * 60 * 60 * 24)));
        total_dias_pago += diffDays;
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

    const dias_pago_promedio = count_cobros > 0 ? Math.round(total_dias_pago / count_cobros) : 28;
    const efectividad_cobro_pct = total_facturado_periodo > 0
      ? Math.min(100, Math.round((total_cobrado / total_facturado_periodo) * 1000) / 10)
      : 85.5;

    // Calcular Tramos de Morosidad (Aging) por saldo abierto de documentos
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

    // Agrupar facturas pendientes (saldo < 0) por días transcurridos
    let mora0_30 = 0, count0_30 = 0;
    let mora31_60 = 0, count31_60 = 0;
    let mora61_90 = 0, count61_90 = 0;
    let mora90_plus = 0, count90_plus = 0;
    let monto_en_mora = 0;

    const refDate = new Date(2026, 6, 28);

    for (const [numdoc, d] of docSaldos.entries()) {
      if (d.saldo < -1) {
        const deuda = Math.abs(d.saldo);
        const fInfo = facturasMap.get(numdoc);
        let dias = 15;

        if (fInfo && fInfo.emision && fInfo.emision.length === 8) {
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

    // Formatear Bancos
    const bancos: BankPaymentSummary[] = Array.from(bankMap.entries())
      .map(([banco, data]) => ({
        banco,
        monto: Math.round(data.monto * 100) / 100,
        transacciones: data.transacciones,
        pct: total_cobrado > 0 ? Math.round((data.monto / total_cobrado) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.monto - a.monto);

    const comisiones_totales = Math.round(total_cobrado * 0.027 * 100) / 100;

    return {
      kpis: {
        total_cobrado: Math.round(total_cobrado * 100) / 100,
        total_facturado_periodo: Math.round(total_facturado_periodo * 100) / 100,
        efectividad_cobro_pct,
        dias_pago_promedio,
        monto_en_mora: Math.round(monto_en_mora * 100) / 100,
        comisiones_totales,
      },
      aging,
      bancos,
    };
  } catch (error) {
    console.error("Error obteniendo resumen de cobranzas", error);
    return {
      kpis: { total_cobrado: 0, total_facturado_periodo: 0, efectividad_cobro_pct: 0, dias_pago_promedio: 0, monto_en_mora: 0, comisiones_totales: 0 },
      aging: [],
      bancos: [],
    };
  }
}

/**
 * Obtener comisiones de vendedores calculadas estrictamente sobre cobro efectivo (Módulo 4)
 */
export async function getComisionesVendedores(
  year: number | string = 'todos',
  baseCommissionRate: number = 3.0
): Promise<VendorCommissionItem[]> {
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
      if (f.numfac) {
        facturasMap.set(f.numfac, {
          emision: f.emision,
          codven: (f.codven || f.vendedor || '').trim().toUpperCase(),
        });
      }
    }

    // Agrupar cobros efectivos por vendedor
    const vendorCobrosMap = new Map<string, {
      monto_cobrado: number;
      comision_ganada: number;
      total_dias: number;
      count_a_tiempo: number;
      count_total: number;
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
      let dias = 15;

      if (fInfo && fInfo.emision && pd.emision && fInfo.emision.length === 8 && pd.emision.length === 8) {
        const yF = parseInt(fInfo.emision.substring(0, 4));
        const mF = parseInt(fInfo.emision.substring(4, 6)) - 1;
        const dF = parseInt(fInfo.emision.substring(6, 8));
        const dateF = new Date(yF, mF, dF);

        const yP = parseInt(pd.emision.substring(0, 4));
        const mP = parseInt(pd.emision.substring(4, 6)) - 1;
        const dP = parseInt(pd.emision.substring(6, 8));
        const dateP = new Date(yP, mP, dP);

        dias = Math.max(0, Math.ceil((dateP.getTime() - dateF.getTime()) / (1000 * 60 * 60 * 24)));
      }

      // Regla de escala de comisión por velocidad de cobro:
      // <= 30 días: 100% de tasa base (3.0%)
      // 31 - 60 días: 80% de tasa base (2.4%)
      // > 60 días: 50% de tasa base (1.5%)
      let mult = 1.0;
      if (dias > 60) {
        mult = 0.5;
      } else if (dias > 30) {
        mult = 0.8;
      }

      const commissionAmt = amt * (baseCommissionRate / 100) * mult;

      if (!vendorCobrosMap.has(codven)) {
        vendorCobrosMap.set(codven, {
          monto_cobrado: 0,
          comision_ganada: 0,
          total_dias: 0,
          count_a_tiempo: 0,
          count_total: 0,
        });
      }

      const vData = vendorCobrosMap.get(codven)!;
      vData.monto_cobrado += amt;
      vData.comision_ganada += commissionAmt;
      vData.total_dias += dias;
      vData.count_total += 1;
      if (dias <= 30) vData.count_a_tiempo += 1;
    }

    const result: VendorCommissionItem[] = Array.from(vendorCobrosMap.entries())
      .map(([codvend, data]) => {
        const nomvend = vendorMap.get(codvend) || `VENDEDOR (${codvend})`;
        const isAdmin = ADMIN_CODES.has(codvend) || codvend === '00';
        const tasa_efectiva = data.monto_cobrado > 0 ? (data.comision_ganada / data.monto_cobrado) * 100 : baseCommissionRate;
        const dias_promedio_cobro = data.count_total > 0 ? Math.round(data.total_dias / data.count_total) : 30;
        const cobranza_a_tiempo_pct = data.count_total > 0 ? Math.round((data.count_a_tiempo / data.count_total) * 1000) / 10 : 0;

        return {
          codvend,
          nomvend,
          monto_cobrado: Math.round(data.monto_cobrado * 100) / 100,
          comision_ganada: Math.round(data.comision_ganada * 100) / 100,
          tasa_efectiva: Math.round(tasa_efectiva * 100) / 100,
          dias_promedio_cobro,
          cobranza_a_tiempo_pct,
          is_administrative: isAdmin,
        };
      })
      .filter(v => !v.is_administrative)
      .sort((a, b) => b.comision_ganada - a.comision_ganada);

    return result;
  } catch (error) {
    console.error("Error calculando comisiones de vendedores", error);
    return [];
  }
}
