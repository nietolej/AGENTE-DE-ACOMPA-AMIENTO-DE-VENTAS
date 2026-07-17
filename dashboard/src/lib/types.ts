export interface FacturaEstadoCuenta {
  nota: string;
  deuda_original: number;
  abonado: number;
  saldo: number;
  vencimiento: string;
  mora?: number;
}

export interface MixPago {
  moneda: string;
  monto: number;
}

export interface VentaMensual {
  mes: string;
  ventas: number;
  devoluciones: number;
}

export interface CustomerKPIs {
  venta_total: number;
  tendencia_anual: number;
  porcentaje_cumplimiento: number;
  venta_items: number;
  pedidos_compra: number;
  pedido_promedio: number;
  meta_venta: number;
  devoluciones_monto: number;
  devoluciones_items: number;
  devoluciones_pedidos: number;
  indice_dev_monto: number;
  indice_dev_items: number;
  indice_dev_pedidos: number;
  descuento_ponderado: number;
  dias_pago_promedio: number;
  ultima_compra: string | null;
  deuda_actual: number;
  vencimiento_cxc: string | null;
  ventas_mensuales: VentaMensual[];
  mix_pagos: MixPago[];
  estado_cuenta: FacturaEstadoCuenta[];
}

export interface PeriodData {
  venta_total: number;
  venta_items: number;
  pedidos_compra: number;
  devoluciones_monto: number;
  devoluciones_items: number;
  devoluciones_pedidos: number;
  dias_pago: number;
  descuento_ponderado: number;
  mix_pagos: MixPago[];
}

export interface VarianceData {
  venta_total_abs: number;
  venta_total_pct: number;
  venta_items_abs: number;
  venta_items_pct: number;
  pedidos_compra_abs: number;
  pedidos_compra_pct: number;
  devoluciones_monto_abs: number;
  devoluciones_monto_pct: number;
  devoluciones_items_abs: number;
  devoluciones_items_pct: number;
  devoluciones_pedidos_abs: number;
  devoluciones_pedidos_pct: number;
  dias_pago_abs: number;
  dias_pago_pct: number;
  descuento_ponderado_abs: number;
  descuento_ponderado_pct: number;
}

export interface ComparisonData {
  periodoA: PeriodData;
  periodoB: PeriodData;
  varianza: VarianceData;
  ultima_compra: string;
  deuda_actual: number;
  vencimiento_cxc: string;
  estado_cuenta: FacturaEstadoCuenta[];
}
