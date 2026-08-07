'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Package, DollarSign, AlertCircle, Target, ShoppingCart, Percent, CreditCard, Clock, Lightbulb } from 'lucide-react';
import { CustomerKPIs, formatDateDisplay } from '@/lib/types';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatementTable } from '@/components/ui/StatementTable';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a288fe'];

export default function YearView({ data }: { data: CustomerKPIs }) {
  const dataMeta = data.meta_venta || 0;
  const cumplimiento = data.porcentaje_cumplimiento || 0;
  const indiceDevMonto = data.indice_dev_monto || 0;

  // Insight Sugerido (MVP IA)
  let insight = null;
  if (data.deuda_actual > 0) {
    const facturasMora = data.estado_cuenta.filter(f => (f.mora ?? 0) > 0);
    if (facturasMora.length > 0) {
      insight = {
        type: 'danger',
        text: `Alerta: El cliente tiene ${facturasMora.length} factura(s) en mora. Se recomienda suspender créditos y contactar para cobranza.`
      };
    } else {
      insight = {
        type: 'warning',
        text: `El cliente tiene una deuda activa de $${data.deuda_actual.toLocaleString('en-US', {maximumFractionDigits:2})}. Monitorear fechas de vencimiento.`
      };
    }
  } else if (indiceDevMonto > 5) {
     insight = {
        type: 'danger',
        text: `Atención: El índice de devoluciones ($) es del ${indiceDevMonto.toFixed(1)}%. Superior al rango aceptable. Investigar calidad del último lote.`
     };
  } else if (cumplimiento > 100) {
     insight = {
        type: 'success',
        text: `¡Excelente! El cliente proyecta superar la meta en un ${(cumplimiento - 100).toFixed(1)}%. Considerar ofrecer programa de lealtad o volumen.`
     };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Insight Panel */}
      {insight && (
        <div className="glass-panel" style={{ 
          borderLeft: `4px solid var(--accent-${insight.type})`, 
          backgroundColor: insight.type === 'danger' ? 'rgba(255, 68, 68, 0.1)' : insight.type === 'warning' ? 'rgba(255, 187, 40, 0.1)' : 'rgba(0, 200, 150, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Lightbulb size={20} color={`var(--accent-${insight.type})`} />
            <h3 style={{ margin: 0, color: `var(--accent-${insight.type})` }}>Insight Sugerido por IA</h3>
          </div>
          <p style={{ margin: 0 }}>{insight.text}</p>
        </div>
      )}

      {/* BLOQUE 1: KPIs Principales (18 Indicadores) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        
        {/* Grupo 1: Finanzas y Metas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem', margin: '0 0 0.2rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Finanzas y Metas</h3>
           <KpiCard 
             title="Venta Total ($)" 
             value={`$${(data.venta_total || 0).toLocaleString('en-US', {maximumFractionDigits:2})}`}
             icon={<DollarSign size={20} color="var(--accent-primary)" />}
           />
           <KpiCard 
             title="Tendencia de Venta" 
             value={`$${(data.tendencia_anual || 0).toLocaleString('en-US', {maximumFractionDigits:2})}`}
             icon={<Target size={20} color="var(--accent-primary)" />}
           />
           <KpiCard 
             title="Meta de Venta ($)" 
             value={`$${(data.meta_venta || 0).toLocaleString('en-US', {maximumFractionDigits:2})}`}
             icon={<Target size={20} color="#FFBB28" />}
           />
           <KpiCard 
             title="% Cumplimiento Tendencia" 
             value={`${(data.porcentaje_cumplimiento || 0).toFixed(1)}%`}
             icon={<Percent size={20} color={cumplimiento >= 100 ? 'var(--accent-success)' : 'var(--accent-danger)'} />}
             valueColor={cumplimiento >= 100 ? 'var(--accent-success)' : 'var(--accent-danger)'}
           />
        </div>

        {/* Grupo 2: Volumen y Operaciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem', margin: '0 0 0.2rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volumen y Operaciones</h3>
           <KpiCard 
             title="Pedidos de Compra" 
             value={data.pedidos_compra || 0}
             icon={<Package size={20} color="#00C49F" />}
           />
           <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.75rem 0.9rem', flex: 1 }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.35rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                 <ShoppingCart size={18} color="#00C49F" />
                 <h3 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 500 }} className="text-sub">Pedido Promedio ($)</h3>
               </div>
               <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#60a5fa' }}>
                 ${(data.pedido_promedio || 0).toLocaleString('en-US', {maximumFractionDigits:2})}
               </span>
             </div>
             
             <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
               <div style={{ flex: 1, backgroundColor: 'rgba(0, 196, 159, 0.08)', border: '1px solid rgba(0, 196, 159, 0.2)', padding: '0.3rem 0.45rem', borderRadius: '6px' }}>
                 <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Alm. 01 (Bqto)</div>
                 <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#00C49F' }}>
                   ${(data.pedido_promedio_bqto || 0).toLocaleString('en-US', {maximumFractionDigits:2})}
                 </div>
               </div>
               <div style={{ flex: 1, backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.3rem 0.45rem', borderRadius: '6px' }}>
                 <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Alm. 06 (Ccs)</div>
                 <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#3b82f6' }}>
                   ${(data.pedido_promedio_ccs || 0).toLocaleString('en-US', {maximumFractionDigits:2})}
                 </div>
               </div>
             </div>
           </div>
           <KpiCard 
             title="Venta por Cantidad Ítems" 
             value={(data.venta_items || 0).toLocaleString('en-US')}
             icon={<Package size={20} color="#00C49F" />}
           />
        </div>

        {/* Grupo 3: Calidad (Devoluciones) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem', margin: '0 0 0.2rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Devoluciones</h3>
           <KpiCard 
             title="Devoluciones ($)" 
             value={`$${(data.devoluciones_monto || 0).toLocaleString('en-US', {maximumFractionDigits:2})}`}
             icon={<AlertCircle size={20} color="var(--accent-danger)" />}
             valueColor={(data.devoluciones_monto || 0) > 0 ? 'var(--accent-danger)' : 'inherit'}
             trend={{ value: `${(data.indice_dev_monto || 0).toFixed(1)}% (Índice $)`, isPositive: false, label: '' }}
           />
           <KpiCard 
             title="Devoluciones Ítems" 
             value={(data.devoluciones_items || 0).toLocaleString('en-US')}
             icon={<AlertCircle size={20} color="var(--accent-danger)" />}
             trend={{ value: `${(data.indice_dev_items || 0).toFixed(1)}% (Índice Ítems)`, isPositive: false, label: '' }}
           />
           <KpiCard 
             title="Devoluciones Pedido" 
             value={(data.devoluciones_pedidos || 0).toLocaleString('en-US')}
             icon={<AlertCircle size={20} color="var(--accent-danger)" />}
             trend={{ value: `${(data.indice_dev_pedidos || 0).toFixed(1)}% (Índice Pedidos)`, isPositive: false, label: '' }}
           />
        </div>

        {/* Grupo 4: Cobranzas, CxC y Descuentos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem', margin: '0 0 0.2rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cobranzas y CxC</h3>
           <KpiCard 
             title="Días de Pago Promedio" 
             value={`${(data.dias_pago_promedio || 0).toFixed(1)} d`}
             icon={<Clock size={20} color="#FFBB28" />}
           />
           <KpiCard 
             title="Deuda Actual (CxC)" 
             value={`$${(data.deuda_actual || 0).toLocaleString('en-US', {maximumFractionDigits:2})}`}
             icon={<CreditCard size={20} color="#FFBB28" />}
             valueColor={(data.deuda_actual || 0) > 0 ? 'var(--accent-danger)' : 'inherit'}
           />
           
           {/* Card Consolidado Compacto de Descuentos Ponderados */}
           <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem 0.9rem', flex: 1 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.35rem' }}>
               <Percent size={17} color="#FFBB28" />
               <h3 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 500 }} className="text-sub">Descuentos Ponderados</h3>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.1rem' }}>
               {/* Descuento Facturación */}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.55rem', borderRadius: '6px' }}>
                 <div>
                   <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>Descuento Facturación</div>
                   <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>${(data.descuento_factura_monto ?? data.descuento_monto ?? 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} otorgados</div>
                 </div>
                 <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#00C49F' }}>
                   {(data.descuento_factura_ponderado ?? data.descuento_ponderado ?? 0).toFixed(2)}%
                 </span>
               </div>

               {/* Descuento Pronto Pago */}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.55rem', borderRadius: '6px' }}>
                 <div>
                   <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>Descuento Pronto Pago</div>
                   <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>${(data.descuento_pp_monto ?? 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} otorgados</div>
                 </div>
                 <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#3b82f6' }}>
                   {(data.descuento_pp_ponderado ?? 0).toFixed(2)}%
                 </span>
               </div>

               {/* Descuento Total */}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.35rem 0.55rem', borderRadius: '6px' }}>
                 <div>
                   <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b' }}>Descuento Total Ponderado</div>
                   <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>${(data.descuento_total_monto ?? 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} otorgados</div>
                 </div>
                 <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#f59e0b' }}>
                   {(data.descuento_total_ponderado ?? 0).toFixed(2)}%
                 </span>
               </div>
             </div>
           </div>
           {data.vencimiento_cxc && (
             <KpiCard 
               title="Vencimiento CxC" 
               value={formatDateDisplay(data.vencimiento_cxc)}
               icon={<Clock size={20} color="var(--accent-danger)" />}
             />
           )}
           {data.ultima_compra && (
             <KpiCard 
               title="Última Compra" 
               value={formatDateDisplay(data.ultima_compra)}
               icon={<ShoppingCart size={20} color="var(--text-secondary)" />}
             />
           )}
        </div>

      </div>

      {/* BLOQUE 2: Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Gráfico de Barras */}
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3>Evolución Mensual (Ventas vs Devoluciones)</h3>
          <div style={{ width: '100%', height: '90%', marginTop: '1rem' }}>
            {data.ventas_mensuales && data.ventas_mensuales.some(m => m.ventas > 0 || m.devoluciones > 0) ? (
              <ResponsiveContainer>
                <BarChart data={data.ventas_mensuales} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="mes" stroke="#888" />
                  <YAxis stroke="#888" />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                  <Legend />
                  <Bar dataKey="ventas" stackId="a" fill="var(--accent-primary)" name="Ventas ($)" />
                  <Bar dataKey="devoluciones" stackId="a" fill="var(--accent-danger)" name="Devoluciones ($)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                Sin registros de ventas o devoluciones en el periodo seleccionado
              </div>
            )}
          </div>
        </div>

        {/* Mix de Pagos */}
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3>Porcentaje de Pagos (Moneda/Vía)</h3>
          <div style={{ width: '100%', height: '90%', marginTop: '1rem' }}>
            {data.mix_pagos && data.mix_pagos.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.mix_pagos}
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
                    {data.mix_pagos.map((entry: any, index: number) => (
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
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                Sin registros de pagos en el periodo seleccionado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BLOQUE 3: Tabla Estado de Cuenta */}
      <StatementTable data={data.estado_cuenta} />
    </div>
  );
}
