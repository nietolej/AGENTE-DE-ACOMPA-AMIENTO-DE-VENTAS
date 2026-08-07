'use client';

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { ShoppingCart, DollarSign, AlertCircle, CreditCard } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateDisplay } from '@/lib/types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a288fe'];

export default function HistoryView({ data }: { data: any }) {
  const [selectedMetric, setSelectedMetric] = useState('venta_total');
  const th = data.total_historico;

  // Cálculos derivados históricos
  const ticketPromedio = th.pedidos_compra > 0 ? (th.venta_total / th.pedidos_compra) : 0;
  const indiceDevMonto = (th.devoluciones_monto / th.venta_total) * 100;
  const indiceDevItems = (th.devoluciones_items / th.venta_items) * 100;
  const indiceDevPedidos = (th.devoluciones_pedidos / th.pedidos_compra) * 100;

  const metricConfig: Record<string, { label: string, color: string, format?: (val: number) => string }> = {
    venta_total: { label: 'Venta Total ($)', color: 'var(--accent-primary)', format: (val) => `$${val.toLocaleString('en-US')}` },
    venta_items: { label: 'Ítems Vendidos', color: '#00C49F', format: (val) => val.toLocaleString('en-US') },
    pedidos: { label: 'Cantidad de Pedidos', color: '#FFBB28', format: (val) => val.toString() },
    devoluciones_monto: { label: 'Devoluciones ($)', color: 'var(--accent-danger)', format: (val) => `$${val.toLocaleString('en-US')}` },
    dias_pago: { label: 'Días de Pago Promedio', color: '#a288fe', format: (val) => `${val.toFixed(1)} d` },
    descuento: { label: 'Descuento Promedio (%)', color: '#FF8042', format: (val) => `${val.toFixed(1)}%` }
  };

  const currentConfig = metricConfig[selectedMetric];

  // Generar datos para el gráfico agregando la barra de tendencia anualizada para el año en curso
  const rawResumen = data.resumen_anios || [];
  const currentYearStr = new Date().getFullYear().toString();
  const currentYearItem = rawResumen.find((r: any) => r.anio?.toString() === currentYearStr);

  const chartData = [...rawResumen];
  if (currentYearItem) {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const diasTranscurridos = Math.max(1, Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)));
    const factorTendencia = 365 / diasTranscurridos;

    chartData.push({
      ...currentYearItem,
      anio: `${currentYearStr} (Tendencia)`,
      isTendencia: true,
      venta_total: (currentYearItem.venta_total || 0) * factorTendencia,
      venta_items: Math.round((currentYearItem.venta_items || 0) * factorTendencia),
      pedidos: Math.round((currentYearItem.pedidos || 0) * factorTendencia),
      devoluciones_monto: (currentYearItem.devoluciones_monto || 0) * factorTendencia,
      devoluciones_items: Math.round((currentYearItem.devoluciones_items || 0) * factorTendencia),
      devoluciones_pedidos: Math.round((currentYearItem.devoluciones_pedidos || 0) * factorTendencia),
      dias_pago: currentYearItem.dias_pago || 0,
      descuento: currentYearItem.descuento || 0
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* BLOQUE 1: KPIs Históricos Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        {/* Grupo 1: Volumen de Ventas (Acumulado) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            <ShoppingCart size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem' }}>Operaciones Totales (Acumulado)</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-sub">Venta Total (Histórica)</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>${th.venta_total.toLocaleString('en-US')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sub">Cantidad Ítems</span>
            <span style={{ fontWeight: 'bold' }}>{th.venta_items.toLocaleString('en-US')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sub">Pedidos de Compra</span>
            <span style={{ fontWeight: 'bold' }}>{th.pedidos_compra}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sub">Pedido Promedio (Ticket)</span>
            <span style={{ fontWeight: 'bold' }}>${ticketPromedio.toLocaleString('en-US', {maximumFractionDigits:2})}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sub">Última Compra</span>
            <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{th.ultima_compra}</span>
          </div>
        </div>

        {/* Grupo 2: Calidad (Devoluciones Acumuladas) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            <AlertCircle size={20} color="var(--accent-danger)" />
            <h3 style={{ fontSize: '1.1rem' }}>Devoluciones y Calidad (Acumulado)</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-sub">Monto Devuelto</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-danger)' }}>${th.devoluciones_monto.toLocaleString('en-US')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sub">Ítems Devueltos</span>
            <span style={{ fontWeight: 'bold' }}>{th.devoluciones_items}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sub">Pedidos con Devolución</span>
            <span style={{ fontWeight: 'bold' }}>{th.devoluciones_pedidos}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
            <span className="text-sub" style={{ fontSize: '0.8rem' }}>Índices de Devolución Históricos</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>$ Monto</span><br/>{indiceDevMonto.toFixed(1)}%
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ítems</span><br/>{indiceDevItems.toFixed(1)}%
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pedidos</span><br/>{indiceDevPedidos.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Grupo 3: Condiciones Comerciales e Historial de Pago */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            <CreditCard size={20} color="#FFBB28" />
            <h3 style={{ fontSize: '1.1rem' }}>Comportamiento de Pago</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-sub">Deuda Actual</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: th.deuda_actual > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
              ${th.deuda_actual.toLocaleString('en-US')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sub">Descuento Ponderado</span>
            <span style={{ fontWeight: 'bold', color: '#FFBB28' }}>{th.descuento_ponderado.toFixed(1)}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sub">Días de Pago Promedio</span>
            <span style={{ fontWeight: 'bold' }}>{th.dias_pago_promedio.toFixed(1)} d</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-sub">Vencimiento CxC</span>
            <span style={{ fontWeight: 'bold' }}>{th.vencimiento_cxc || 'N/A'}</span>
          </div>
        </div>

      </div>

      {/* BLOQUE 2: Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Gráfico de Barras Dinámicas por Año */}
        <div className="glass-panel" style={{ height: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Evolución Anual</h3>
            <select 
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#111', color: 'white', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
            >
              <option value="venta_total">Venta Total ($)</option>
              <option value="venta_items">Ítems Vendidos</option>
              <option value="pedidos">Cantidad de Pedidos</option>
              <option value="devoluciones_monto">Devoluciones ($)</option>
              <option value="dias_pago">Días de Pago Promedio</option>
              <option value="descuento">Descuento Promedio (%)</option>
            </select>
          </div>
          <div style={{ width: '100%', height: '85%', marginTop: '1.5rem' }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="anio" stroke="#888" />
                <YAxis stroke="#888" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                  formatter={(value: any) => currentConfig.format ? currentConfig.format(Number(value || 0)) : (value ?? 0)}
                />
                <Legend />
                <Bar dataKey={selectedMetric} name={currentConfig.label} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isTendencia ? '#FFBB28' : currentConfig.color} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mix de Pagos Histórico */}
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3>Porcentaje de Pagos Histórico (Moneda)</h3>
          <div style={{ width: '100%', height: '90%', marginTop: '1rem' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={th.mix_pagos}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={5}
                  dataKey="monto"
                  nameKey="moneda"
                  label={({ name, value, percent }: { name?: string; value?: number; percent?: number }) => 
                    `${name || ''}: $${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${((percent || 0) * 100).toFixed(1)}%)`
                  }
                >
                  {th.mix_pagos.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value: any, entry: any) => {
                    const item = entry.payload;
                    const val = item?.monto ?? item?.value ?? item?.payload?.monto ?? item?.payload?.value ?? 0;
                    return `${value}: $${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }}
                />
                <RechartsTooltip 
                  formatter={(value: any) => [`$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Monto ($)']}
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BLOQUE 3: Tablas */}
      <div className="glass-panel">
        <div style={{ marginBottom: '1rem' }}>
          <h3>Matriz de Indicadores por Año</h3>
          <p className="text-sub">Desglose anual comparativo.</p>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Año</TableHead>
                <TableHead>Ventas ($)</TableHead>
                <TableHead>Ítems</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>T. Promedio</TableHead>
                <TableHead>Dev. ($)</TableHead>
                <TableHead>Índice Dev ($)</TableHead>
                <TableHead>Días Pago</TableHead>
                <TableHead>Dcto (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.resumen_anios.map((row: any, idx: number) => {
                const tkProm = row.pedidos > 0 ? (row.venta_total / row.pedidos) : 0;
                const iDevMonto = (row.devoluciones_monto / row.venta_total) * 100;
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-bold text-primary">{row.anio}</TableCell>
                    <TableCell className="font-bold">${row.venta_total.toLocaleString('en-US')}</TableCell>
                    <TableCell>{row.venta_items.toLocaleString('en-US')}</TableCell>
                    <TableCell>{row.pedidos}</TableCell>
                    <TableCell>${tkProm.toLocaleString('en-US', {maximumFractionDigits: 2})}</TableCell>
                    <TableCell className="text-red-400 font-bold">${row.devoluciones_monto.toLocaleString('en-US')}</TableCell>
                    <TableCell>{iDevMonto.toFixed(1)}%</TableCell>
                    <TableCell>{row.dias_pago.toFixed(1)}</TableCell>
                    <TableCell>{row.descuento.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Estado de Cuenta del Cliente (Global)</h3>
        </div>
        
        {th.estado_cuenta.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nro Nota/Factura</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Monto Deuda ($)</TableHead>
                  <TableHead>Monto Abono ($)</TableHead>
                  <TableHead>Saldo Pendiente ($)</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead>Estado (Mora)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {th.estado_cuenta.map((factura: any, idx: number) => {
                  const moraDays = factura.mora || 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-bold">{factura.nota}</TableCell>
                      <TableCell>{formatDateDisplay(factura.emision)}</TableCell>
                      <TableCell>${factura.deuda_original.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-green-400 font-semibold">${factura.abonado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-red-400 font-bold">${factura.saldo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>{formatDateDisplay(factura.vencimiento)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-md text-[13px] font-bold ${moraDays > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {moraDays > 0 
                            ? `${moraDays} ${moraDays === 1 ? 'día' : 'días'} de vencido` 
                            : moraDays < 0 
                              ? `${Math.abs(moraDays)} ${Math.abs(moraDays) === 1 ? 'día' : 'días'} por vencer` 
                              : 'Al día'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p>El cliente no tiene facturas abiertas / notas no canceladas.</p>
          </div>
        )}
      </div>

    </div>
  );
}
