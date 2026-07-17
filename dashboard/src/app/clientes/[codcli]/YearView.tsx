'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Package, DollarSign, AlertCircle, Target, ShoppingCart, Percent, CreditCard, Clock, Lightbulb } from 'lucide-react';
import { CustomerKPIs } from '@/lib/types';
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        {/* Grupo 1: Finanzas y Metas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem', margin: 0, color: 'var(--text-secondary)' }}>Finanzas y Metas</h3>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem', margin: 0, color: 'var(--text-secondary)' }}>Volumen y Operaciones</h3>
           <KpiCard 
             title="Pedidos de Compra" 
             value={data.pedidos_compra || 0}
             icon={<Package size={20} color="#00C49F" />}
           />
           <KpiCard 
             title="Pedido Promedio ($)" 
             value={`$${(data.pedido_promedio || 0).toLocaleString('en-US', {maximumFractionDigits:2})}`}
             icon={<ShoppingCart size={20} color="#00C49F" />}
           />
           <KpiCard 
             title="Venta por Cantidad Ítems" 
             value={(data.venta_items || 0).toLocaleString('en-US')}
             icon={<Package size={20} color="#00C49F" />}
           />
           <KpiCard 
             title="Descuento Ponderado" 
             value={`${(data.descuento_ponderado || 0).toFixed(2)}%`}
             icon={<Percent size={20} color="#00C49F" />}
           />
        </div>

        {/* Grupo 3: Calidad (Devoluciones) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem', margin: 0, color: 'var(--text-secondary)' }}>Devoluciones</h3>
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

        {/* Grupo 4: Condiciones Comerciales e Histórico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem', margin: 0, color: 'var(--text-secondary)' }}>Cobranzas y CxC</h3>
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
           {data.vencimiento_cxc && (
             <KpiCard 
               title="Vencimiento CxC" 
               value={data.vencimiento_cxc}
               icon={<Clock size={20} color="var(--accent-danger)" />}
             />
           )}
           {data.ultima_compra && (
             <KpiCard 
               title="Última Compra" 
               value={data.ultima_compra}
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
          </div>
        </div>

        {/* Mix de Pagos */}
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3>Porcentaje de Pagos (Moneda/Vía)</h3>
          <div style={{ width: '100%', height: '90%', marginTop: '1rem' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.mix_pagos}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="monto"
                  nameKey="moneda"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                >
                  {data.mix_pagos.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BLOQUE 3: Tabla Estado de Cuenta */}
      <StatementTable data={data.estado_cuenta} />
    </div>
  );
}
