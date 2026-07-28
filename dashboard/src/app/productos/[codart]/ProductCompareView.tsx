'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Percent, AlertTriangle, ArrowRight } from 'lucide-react';
import { ProductCompareData } from '@/lib/types';

interface Props {
  data: ProductCompareData;
  yearA: string;
  yearB: string;
}

export default function ProductCompareView({ data, yearA, yearB }: Props) {
  const router = useRouter();

  const handleCompareYearsChange = (newYearA: string, newYearB: string) => {
    const encodedCod = encodeURIComponent(data.codart);
    router.push(`/productos/${encodedCod}?tab=compare&yearA=${newYearA}&yearB=${newYearB}`);
  };

  // Construcción de la serie de tiempo combinada mes a mes
  const monthsMap = new Map<string, { mesName: string, montoA: number, montoB: number }>();
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let i = 1; i <= 12; i++) {
    const mStr = i.toString().padStart(2, '0');
    monthsMap.set(mStr, { mesName: monthNames[i - 1], montoA: 0, montoB: 0 });
  }

  for (const m of data.periodoA.ventas_mensuales) {
    const mNum = m.mes.split('-')[1];
    if (monthsMap.has(mNum)) {
      monthsMap.get(mNum)!.montoA = m.monto;
    }
  }

  for (const m of data.periodoB.ventas_mensuales) {
    const mNum = m.mes.split('-')[1];
    if (monthsMap.has(mNum)) {
      monthsMap.get(mNum)!.montoB = m.monto;
    }
  }

  const chartData = Array.from(monthsMap.values());

  const renderDelta = (abs: number, pct: number, isCurrency: boolean = false, isNegativeGood: boolean = false) => {
    const isPositive = pct > 0;
    const isGood = isNegativeGood ? !isPositive : isPositive;
    const color = isGood ? '#4ade80' : pct === 0 ? 'var(--text-secondary)' : '#f87171';
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color, fontSize: '0.85rem', fontWeight: 600, marginTop: '0.35rem' }}>
        <Icon size={14} />
        <span>{pct > 0 ? `+${pct}%` : `${pct}%`}</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.25rem' }}>
          ({abs > 0 ? `+` : ''}{isCurrency ? `$${abs.toLocaleString()}` : abs})
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Controles de Selección de Años A vs B */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Comparativa Multianual:</span>
          <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-geist-mono)' }}>Año {yearA}</span>
          <ArrowRight size={16} />
          <span style={{ color: '#00C49F', fontFamily: 'var(--font-geist-mono)' }}>Año {yearB}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Período Base (A):</span>
            <select
              value={yearA}
              onChange={(e) => handleCompareYearsChange(e.target.value, yearB)}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <option value="2024" style={{ background: '#111' }}>2024</option>
              <option value="2025" style={{ background: '#111' }}>2025</option>
              <option value="2026" style={{ background: '#111' }}>2026</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Período Comparación (B):</span>
            <select
              value={yearB}
              onChange={(e) => handleCompareYearsChange(yearA, e.target.value)}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <option value="2025" style={{ background: '#111' }}>2025</option>
              <option value="2026" style={{ background: '#111' }}>2026</option>
              <option value="2024" style={{ background: '#111' }}>2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fila de Tarjetas de Comparación de KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Venta Total */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Venta Total ($)</span>
            <DollarSign size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearA}: </span>
              <span style={{ fontWeight: 600 }}>${data.periodoA.monto_vendido.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearB}: </span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>${data.periodoB.monto_vendido.toLocaleString()}</span>
            </div>
          </div>
          {renderDelta(data.varianza.monto_abs, data.varianza.monto_pct, true)}
        </div>

        {/* Unidades Vendidas */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Unidades Vendidas</span>
            <Package size={18} color="#60a5fa" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearA}: </span>
              <span style={{ fontWeight: 600 }}>{data.periodoA.cantidad_vendida.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearB}: </span>
              <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '1.1rem' }}>{data.periodoB.cantidad_vendida.toLocaleString()}</span>
            </div>
          </div>
          {renderDelta(data.varianza.cantidad_abs, data.varianza.cantidad_pct, false)}
        </div>

        {/* Pedidos */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Nº de Pedidos / Facturas</span>
            <ShoppingCart size={18} color="#00C49F" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearA}: </span>
              <span style={{ fontWeight: 600 }}>{data.periodoA.num_pedidos}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearB}: </span>
              <span style={{ fontWeight: 700, color: '#00C49F', fontSize: '1.1rem' }}>{data.periodoB.num_pedidos}</span>
            </div>
          </div>
          {renderDelta(data.varianza.pedidos_abs, data.varianza.pedidos_pct, false)}
        </div>

        {/* Devoluciones */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Devoluciones ($)</span>
            <AlertTriangle size={18} color="#f87171" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearA}: </span>
              <span style={{ fontWeight: 600 }}>${data.periodoA.devoluciones_monto.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearB}: </span>
              <span style={{ fontWeight: 700, color: '#f87171', fontSize: '1.1rem' }}>${data.periodoB.devoluciones_monto.toLocaleString()}</span>
            </div>
          </div>
          {renderDelta(data.varianza.devoluciones_abs, data.varianza.devoluciones_pct, true, true)}
        </div>
      </div>

      {/* Gráfico Comparativo Mensual Superpuesto */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '420px' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="var(--accent-primary)" /> Ventas Mes a Mes: {yearA} vs {yearB} ($)
        </h3>

        <div style={{ flex: 1, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mesName" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                formatter={(value: any, name: any) => [`$${Number(value).toLocaleString()}`, name === 'montoA' ? `Año ${yearA}` : `Año ${yearB}`]}
              />
              <Legend formatter={(value) => value === 'montoA' ? `Año ${yearA}` : `Año ${yearB}`} />
              <Bar dataKey="montoA" fill="#3b82f6" opacity={0.6} radius={[4, 4, 0, 0]} name="montoA" />
              <Bar dataKey="montoB" fill="#10b981" radius={[4, 4, 0, 0]} name="montoB" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
