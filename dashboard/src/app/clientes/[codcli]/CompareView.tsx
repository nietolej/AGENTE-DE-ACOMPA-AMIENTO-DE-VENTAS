'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ComparisonData, formatDateDisplay } from '@/lib/types';
import { StatementTable } from '@/components/ui/StatementTable';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a288fe'];

export default function CompareView({ data }: { data: ComparisonData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialStartA = searchParams.get('startA') || '2024-01-01';
  const initialEndA = searchParams.get('endA') || '2024-12-31';
  const initialStartB = searchParams.get('startB') || '2025-01-01';
  const initialEndB = searchParams.get('endB') || '2025-12-31';

  const [startA, setStartA] = useState(initialStartA);
  const [endA, setEndA] = useState(initialEndA);
  const [startB, setStartB] = useState(initialStartB);
  const [endB, setEndB] = useState(initialEndB);

  const handleApplyComparison = () => {
    const query = new URLSearchParams(searchParams.toString());
    query.set('tab', 'comparacion');
    query.set('startA', startA);
    query.set('endA', endA);
    query.set('startB', startB);
    query.set('endB', endB);
    router.push(`${pathname}?${query.toString()}`);
  };

  // Helpers para calcular varianzas visuales
  const renderVarianza = (abs: number, pct: number, isGoodWhenUp: boolean = true) => {
    let isPositive = pct > 0;
    if (!isGoodWhenUp) isPositive = pct < 0; // Para devoluciones y mora, bajar es bueno.
    const isNeutral = pct === 0;

    let color = 'var(--text-secondary)';
    if (!isNeutral) {
      color = isPositive ? 'var(--accent-success)' : 'var(--accent-danger)';
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color, fontWeight: 'bold' }}>
        {pct > 0 ? <ArrowUpRight size={16} /> : pct < 0 ? <ArrowDownRight size={16} /> : <Minus size={16} />}
        <span>{Math.abs(pct).toFixed(1)}%</span>
        <span style={{ fontSize: '0.8em', opacity: 0.8, marginLeft: '0.25rem' }}>
          ({abs > 0 ? '+' : ''}{abs.toLocaleString('en-US', {maximumFractionDigits:1})})
        </span>
      </div>
    );
  };

  // Cálculos derivados
  const tkA = data.periodoA.pedidos_compra > 0 ? data.periodoA.venta_total / data.periodoA.pedidos_compra : 0;
  const tkB = data.periodoB.pedidos_compra > 0 ? data.periodoB.venta_total / data.periodoB.pedidos_compra : 0;
  
  const iDevMontoA = data.periodoA.venta_total > 0 ? (data.periodoA.devoluciones_monto / data.periodoA.venta_total) * 100 : 0;
  const iDevMontoB = data.periodoB.venta_total > 0 ? (data.periodoB.devoluciones_monto / data.periodoB.venta_total) * 100 : 0;

  const iDevItemsA = data.periodoA.venta_items > 0 ? (data.periodoA.devoluciones_items / data.periodoA.venta_items) * 100 : 0;
  const iDevItemsB = data.periodoB.venta_items > 0 ? (data.periodoB.devoluciones_items / data.periodoB.venta_items) * 100 : 0;

  const iDevPedidosA = data.periodoA.pedidos_compra > 0 ? (data.periodoA.devoluciones_pedidos / data.periodoA.pedidos_compra) * 100 : 0;
  const iDevPedidosB = data.periodoB.pedidos_compra > 0 ? (data.periodoB.devoluciones_pedidos / data.periodoB.pedidos_compra) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Selector de Fechas para Comparación */}
      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="text-sub" style={{ fontWeight: 'bold' }}>Periodo A (Base)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="date" value={startA} onChange={(e) => setStartA(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#111', color: 'white', border: '1px solid var(--glass-border)' }} />
            <input type="date" value={endA} onChange={(e) => setEndA(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#111', color: 'white', border: '1px solid var(--glass-border)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="text-sub" style={{ fontWeight: 'bold' }}>Periodo B (Comparar vs Base)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="date" value={startB} onChange={(e) => setStartB(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#111', color: 'white', border: '1px solid var(--glass-border)' }} />
            <input type="date" value={endB} onChange={(e) => setEndB(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#111', color: 'white', border: '1px solid var(--glass-border)' }} />
          </div>
        </div>

        <button onClick={handleApplyComparison} style={{ padding: '0.65rem 1.5rem', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          Aplicar Comparación
        </button>
      </div>

      {/* BLOQUE 1: Tarjetas de Varianza */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        {/* Venta Total */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Venta Total ($)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo A</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${data.periodoA.venta_total.toLocaleString('en-US')}</p></div>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo B</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${data.periodoB.venta_total.toLocaleString('en-US')}</p></div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
            {renderVarianza(data.varianza.venta_total_abs, data.varianza.venta_total_pct, true)}
          </div>
        </div>

        {/* Venta Ítems */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Cantidad Ítems</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo A</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoA.venta_items.toLocaleString('en-US')}</p></div>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo B</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoB.venta_items.toLocaleString('en-US')}</p></div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
            {renderVarianza(data.varianza.venta_items_abs, data.varianza.venta_items_pct, true)}
          </div>
        </div>

        {/* Pedidos de Compra */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Pedidos de Compra</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo A</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoA.pedidos_compra}</p></div>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo B</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoB.pedidos_compra}</p></div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
            {renderVarianza(data.varianza.pedidos_compra_abs, data.varianza.pedidos_compra_pct, true)}
          </div>
        </div>

        {/* Pedido Promedio */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Pedido Promedio (Ticket)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo A</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${tkA.toLocaleString('en-US', {maximumFractionDigits:2})}</p></div>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo B</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${tkB.toLocaleString('en-US', {maximumFractionDigits:2})}</p></div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Varianza calculada implícita.
          </div>
        </div>

        {/* Devoluciones ($) */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Devoluciones ($)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo A</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-danger)' }}>${data.periodoA.devoluciones_monto.toLocaleString('en-US')}</p></div>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo B</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-danger)' }}>${data.periodoB.devoluciones_monto.toLocaleString('en-US')}</p></div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
            {renderVarianza(data.varianza.devoluciones_monto_abs, data.varianza.devoluciones_monto_pct, false)}
          </div>
        </div>

        {/* Devoluciones (Ítems) */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Devoluciones (Ítems)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo A</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoA.devoluciones_items}</p></div>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo B</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoB.devoluciones_items}</p></div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
            {renderVarianza(data.varianza.devoluciones_items_abs, data.varianza.devoluciones_items_pct, false)}
          </div>
        </div>

        {/* Devoluciones (Pedidos) */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Devoluciones (Pedidos)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo A</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoA.devoluciones_pedidos}</p></div>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo B</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoB.devoluciones_pedidos}</p></div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
            {renderVarianza(data.varianza.devoluciones_pedidos_abs, data.varianza.devoluciones_pedidos_pct, false)}
          </div>
        </div>

        {/* Índices de Devolución */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Índices de Devolución</h3>
          <table style={{ width: '100%', fontSize: '0.9rem', textAlign: 'center' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th>Tipo</th><th>Periodo A</th><th>Periodo B</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ textAlign: 'left', padding: '0.2rem 0' }}>En $</td><td>{iDevMontoA.toFixed(1)}%</td><td>{iDevMontoB.toFixed(1)}%</td></tr>
              <tr><td style={{ textAlign: 'left', padding: '0.2rem 0' }}>En Ítems</td><td>{iDevItemsA.toFixed(1)}%</td><td>{iDevItemsB.toFixed(1)}%</td></tr>
              <tr><td style={{ textAlign: 'left', padding: '0.2rem 0' }}>En Pedidos</td><td>{iDevPedidosA.toFixed(1)}%</td><td>{iDevPedidosB.toFixed(1)}%</td></tr>
            </tbody>
          </table>
        </div>

        {/* Descuento Ponderado */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Descuento Ponderado</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo A</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoA.descuento_ponderado.toFixed(1)}%</p></div>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo B</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoB.descuento_ponderado.toFixed(1)}%</p></div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
            {renderVarianza(data.varianza.descuento_ponderado_abs, data.varianza.descuento_ponderado_pct, false)}
          </div>
        </div>

        {/* Días de Pago Promedio */}
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Días Pago (Promedio)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo A</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoA.dias_pago.toFixed(1)} d</p></div>
            <div><p className="text-sub" style={{ fontSize: '0.8rem' }}>Periodo B</p><p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.periodoB.dias_pago.toFixed(1)} d</p></div>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
            {renderVarianza(data.varianza.dias_pago_abs, data.varianza.dias_pago_pct, false)}
          </div>
        </div>

      </div>

      {/* BLOQUE 2: Gráficos Comparativos */}
      <div className="glass-panel">
        <h3 style={{ marginBottom: '1.5rem' }}>Porcentaje de Pagos (Comparación)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: '350px' }}>
          
          <div style={{ textAlign: 'center', height: '100%' }}>
            <h4 className="text-sub">Periodo A</h4>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.periodoA.mix_pagos} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="monto" nameKey="moneda" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {data.periodoA.mix_pagos.map((e: any, i: number) => <Cell key={`a-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ textAlign: 'center', height: '100%' }}>
            <h4 className="text-sub">Periodo B</h4>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.periodoB.mix_pagos} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="monto" nameKey="moneda" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {data.periodoB.mix_pagos.map((e: any, i: number) => <Cell key={`b-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BLOQUE 3: Snapshot Global */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem' }}>Última Compra (Global)</h3>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{formatDateDisplay(data.ultima_compra)}</p>
        </div>
        <div className="glass-panel">
          <h3 className="text-sub" style={{ marginBottom: '1rem' }}>Condiciones Globales</h3>
          <p><strong>Deuda Actual:</strong> <span className="text-danger">${data.deuda_actual.toLocaleString('en-US')}</span></p>
          <p><strong>Fecha Vencimiento CxC:</strong> <span>{formatDateDisplay(data.vencimiento_cxc)}</span></p>
        </div>
      </div>

      <StatementTable data={data.estado_cuenta} />

    </div>
  );
}

