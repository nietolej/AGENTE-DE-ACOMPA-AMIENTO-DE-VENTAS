export function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const clean = dateStr.trim();
  if (/^\d{8}$/.test(clean)) {
    return `${clean.substring(6, 8)}-${clean.substring(4, 6)}-${clean.substring(0, 4)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.substring(0, 10).split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return clean;
}

export interface FacturaEstadoCuenta {
  nota: string;
  deuda_original: number;
  abonado: number;
  saldo: number;
  emision?: string;
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
  pedido_promedio_bqto?: number;
  pedido_promedio_ccs?: number;
  meta_venta: number;
  devoluciones_monto: number;
  devoluciones_items: number;
  devoluciones_pedidos: number;
  indice_dev_monto: number;
  indice_dev_items: number;
  indice_dev_pedidos: number;
  descuento_ponderado: number;
  descuento_monto?: number;
  descuento_factura_ponderado?: number;
  descuento_factura_monto?: number;
  descuento_pp_ponderado?: number;
  descuento_pp_monto?: number;
  descuento_total_ponderado?: number;
  descuento_total_monto?: number;
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
  descuento_monto?: number;
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

export interface ProductListItem {
  codart: string;
  nomart: string;
  grupo: string;
  marca: string;
  precio_a: number;
  cantidad_vendida: number;
  monto_vendido: number;
  devoluciones_cantidad: number;
  devoluciones_monto: number;
  stock_actual: number;
  ultima_venta: string;
}

export interface ProductTopClient {
  codcli: string;
  nomcli: string;
  cantidad_comprada: number;
  monto_comprado: number;
  num_compras: number;
  ultima_compra: string;
}

export interface ProductMonthlySales {
  mes: string; // YYYY-MM
  cantidad: number;
  monto: number;
  devoluciones_monto: number;
}

export interface ProductDetail {
  codart: string;
  nomart: string;
  grupo: string;
  marca: string;
  precio_a: number;
  precio_b: number;
  precio_d: number;
  
  // 2.1 Ventas Totales
  cantidad_vendida: number;
  monto_vendido: number;
  num_pedidos: number;
  
  // 2.2 Devoluciones Totales
  cantidad_devuelta: number;
  monto_devuelto: number;
  num_pedidos_afectados: number;
  
  // 2.3 Ratios de Devolución (%)
  pct_cantidad_devo: number;
  pct_monto_devo: number;
  pct_pedidos_devo: number;
  
  // 2.4 Métricas de Rotación e Inventario
  stock_actual: number;
  stock_disponible: number;
  velocidad_diaria: number; // unidades/día
  dias_inventario: number;
  dias_sin_inventario: number; // NUEVO: Días con stock en 0 durante el período
  meses_inventario: number;
  pendiente_transito: number;
  pendiente_produccion: number;
  
  // Serie mensual y Top Clientes
  ventas_mensuales: ProductMonthlySales[];
  top_clientes: ProductTopClient[];
  ultima_venta: string;
}

export interface ProductGroupSummary {
  grupo: string;
  nomgrupo: string;
  total_articulos: number;
  cantidad_vendida: number;
  monto_vendido: number;
  devoluciones_monto: number;
  producto_lider: string;
}

export interface ProductWarehouseStock {
  almacen: string;
  nomalm: string;
  stock: number;
  es_vendible: boolean;
}

export interface ProductMovementData {
  mes: string;
  almacen: string;
  AP: number;
  Recepcion: number;
  AJU: number;
  D: number;
  TR: number;
  NC: number;
}

export interface ProductMovementsResponse {
  apertura_total: number;
  movimientos: ProductMovementData[];
}

export interface ProductComparePeriod {
  year: string;
  monto_vendido: number;
  cantidad_vendida: number;
  num_pedidos: number;
  devoluciones_monto: number;
  devoluciones_cantidad: number;
  pct_monto_devo: number;
  ventas_mensuales: ProductMonthlySales[];
}

export interface ProductCompareData {
  codart: string;
  nomart: string;
  periodoA: ProductComparePeriod;
  periodoB: ProductComparePeriod;
  varianza: {
    monto_abs: number;
    monto_pct: number;
    cantidad_abs: number;
    cantidad_pct: number;
    pedidos_abs: number;
    pedidos_pct: number;
    devoluciones_abs: number;
    devoluciones_pct: number;
  };
}

export interface VendorListItem {
  codvend: string;
  nomvend: string;
  email: string;
  tlf1: string;
  cif: string;
  venta_total: number;
  cant_facturas: number;
  clientes_atendidos: number;
  devoluciones_monto: number;
  pct_devoluciones: number;
  meta_venta: number;
  pct_cumplimiento: number;
  is_administrative: boolean;
  cobertura_cartera: number;
  concentracion_top3: number;
}

export interface VendorTopClient {
  codcli: string;
  nomcli: string;
  monto_comprado: number;
  cant_facturas: number;
}

export interface VendorTopProduct {
  codart: string;
  nomart: string;
  cantidad_vendida: number;
  monto_vendido: number;
}

export interface VendorDormantClient {
  codcli: string;
  nomcli: string;
  monto_historico: number;
  dias_sin_comprar: number;
  ultima_compra: string;
}

export interface VendorDetail {
  codvend: string;
  nomvend: string;
  email: string;
  tlf1: string;
  cif: string;
  
  // 3.1 & 3.2 Rendimiento y Metas
  venta_total: number;
  cant_facturas: number;
  clientes_atendidos: number;
  clientes_asignados_total: number;
  pedido_promedio: number;
  tendencia_anual: number;
  meta_venta: number;
  pct_cumplimiento: number;
  
  // 3.4 Calidad de Venta & Analítica Estratégica
  devoluciones_monto: number;
  cant_devuelta: number;
  num_pedidos_afectados: number;
  pct_monto_devo: number;
  pct_pedidos_devo: number;
  cobertura_cartera: number;
  concentracion_top3: number;
  venta_cruzada_prom: number;
  tasa_fuga_churn: number;
  
  // Series y Cartera Dormida
  ventas_mensuales: { mes: string, venta: number, meta: number }[];
  top_clientes: VendorTopClient[];
  top_productos: VendorTopProduct[];
  clientes_dormidos: VendorDormantClient[];
  is_administrative: boolean;
}

export interface VendorCompareData {
  codvend: string;
  nomvend: string;
  periodoA: {
    year: string;
    venta_total: number;
    cant_facturas: number;
    clientes_atendidos: number;
    devoluciones_monto: number;
  };
  periodoB: {
    year: string;
    venta_total: number;
    cant_facturas: number;
    clientes_atendidos: number;
    devoluciones_monto: number;
  };
  varianza: {
    monto_abs: number;
    monto_pct: number;
    facturas_abs: number;
    facturas_pct: number;
    clientes_abs: number;
    clientes_pct: number;
    devoluciones_abs: number;
    devoluciones_pct: number;
  };
}

export interface CobranzaKPIs {
  total_cobrado: number;
  total_facturado_periodo: number;
  efectividad_cobro_pct: number;
  dias_pago_promedio: number;
  dias_pago_mediana: number;
  pagos_a_tiempo_pct: number;
  transacciones_cobro: number;
  monto_en_mora: number;
}

export interface AgingBucket {
  rango: string;
  monto: number;
  facturas_count: number;
  pct: number;
}

export interface PaymentVelocityBucket {
  tramo: string;
  monto: number;
  count: number;
  pct: number;
}

export interface MonthlyPaymentTrend {
  mes: string; // YYYY-MM
  monto_cobrado: number;
  dias_promedio_cobro: number;
  transacciones: number;
}

export interface VendorPaymentPerformanceItem {
  codvend: string;
  nomvend: string;
  monto_cobrado: number;
  transacciones: number;
  dias_promedio_cobro: number;
  dias_mediana_cobro: number;
  cobranza_a_tiempo_pct: number;
  mora_30plus_pct: number;
  deuda_pendiente_cartera: number;
  is_administrative: boolean;
  descuento_monto?: number;
  descuento_ponderado_pct?: number;
}

export interface ClientPaymentPerformanceItem {
  codcli: string;
  nomcli: string;
  codvend: string;
  nomvend: string;
  monto_cobrado: number;
  transacciones: number;
  dias_promedio_cobro: number;
  dias_mediana_cobro: number;
  cobranza_a_tiempo_pct: number;
  deuda_pendiente: number;
  categoria_pago: 'PUNTUAL' | 'RETRASO_LEVE' | 'RETRASO_CRITICO' | 'SIN_COBROS';
  descuento_monto?: number;
  descuento_ponderado_pct?: number;
}

export interface BankPaymentSummary {
  banco: string;
  monto: number;
  transacciones: number;
  pct: number;
}

export interface DevolucionesKPIs {
  total_devoluciones_monto: number;
  total_unidades_devueltas: number;
  tasa_devolucion_monto_pct: number;
  tasa_devolucion_volumen_pct: number;
  pedidos_afectados_count: number;
  impacto_pedidos_pct: number;
  costo_operativo_estimado: number;
}

export interface ClienteDevolucionesSummary {
  codcli: string;
  nomcli: string;
  venta_monto: number;
  devolucion_monto: number;
  unidades_devueltas: number;
  pedidos_afectados: number;
  pct_devolucion: number;
  nivel_riesgo: 'CRÍTICO' | 'MODERADO' | 'NORMAL';
}

export interface VendedorDevolucionesSummary {
  codvend: string;
  nomvend: string;
  venta_bruta: number;
  devolucion_monto: number;
  venta_neta: number;
  pedidos_afectados: number;
  pct_devolucion: number;
  is_administrative: boolean;
}

export interface ProductoDevolucionesSummary {
  codart: string;
  nomart: string;
  grupo: string;
  unidades_vendidas: number;
  unidades_devueltas: number;
  monto_devuelto: number;
  pct_devolucion_volumen: number;
  posible_defecto: boolean;
}

export interface DevolucionMensual {
  mes: string;
  venta_monto: number;
  devolucion_monto: number;
  pct_monto: number;
}

export interface InventoryIntelligenceKPIs {
  total_capital_inventario: number;
  total_venta_perdida_estimada: number;
  items_riesgo_quiebre: number;
  items_demanda_reprimida: number;
  items_sobrestock: number;
  items_saludables: number;
}

export interface InventoryItemIntelligence {
  codart: string;
  nomart: string;
  grupo: string;
  marca: string;
  precio_a: number;
  stock_actual: number;
  dias_periodo_total: number;
  dias_con_stock: number;
  pct_disponibilidad: number;
  unidades_vendidas: number;
  monto_vendido: number;
  velocidad_basica: number;
  velocidad_ajustada: number;
  dias_cobertura_real: number;
  meses_cobertura_real: number;
  venta_perdida_estimada: number;
  pendiente_transito: number;
  pendiente_produccion: number;
  sugerido_compra_90d: number;
  estado_salud: 'RIESGO_QUIEBRE' | 'DEMANDA_REPRIMIDA' | 'SALUDABLE' | 'SOBRESTOCK';
}

export interface InventoryGroupHealth {
  grupo: string;
  nomgrupo: string;
  total_items: number;
  monto_inventario: number;
  items_quiebre: number;
  items_sobrestock: number;
  venta_perdida_grupo: number;
}

export interface InventoryValuationData {
  mes: string;
  monto: number;
}

export interface ProductKardexRow {
  fecha: string;
  documento: string;
  tipo: string;
  almacen: string;
  cantidad: number;
  saldo_progresivo: number;
}

export interface ClientStatementRow {
  fecha: string;
  documento: string;
  tipo: string; // FC, NC, CA, AB
  concepto: string;
  cargo: number;
  abono: number;
  saldo_progresivo: number;
}
