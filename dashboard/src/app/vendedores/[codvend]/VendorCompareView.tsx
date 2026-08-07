'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, AlertTriangle, ArrowRight } from 'lucide-react';
import { VendorCompareData } from '@/lib/types';

interface Props {
  data: VendorCompareData;
  yearA: string;
  yearB: string;
}

export default function VendorCompareView({ data, yearA, yearB }: Props) {
  const router = useRouter();

  const handleCompareYearsChange = (newYearA: string, newYearB: string) => {
    const encodedCod = encodeURIComponent(data.codvend);
    router.push(`/vendedores/${encodedCod}?tab=compare&yearA=${newYearA}&yearB=${newYearB}`);
  };

  const renderDelta = (abs: number, pct: number, isCurrency: boolean = false, isNegativeGood: boolean = false) => {
    if (isNaN(pct) || !isFinite(pct)) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.35rem' }}>
          <span>N/D</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.25rem' }}>
            (Sin histórico)
          </span>
        </div>
      );
    }

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
      {/* Selector Años A vs B */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Comparativa Multianual Asesor:</span>
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

      {/* Grid de Comparaciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Venta Total ($)</span>
            <DollarSign size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearA}: </span>
              <span style={{ fontWeight: 600 }}>${data.periodoA.venta_total.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearB}: </span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>${data.periodoB.venta_total.toLocaleString()}</span>
            </div>
          </div>
          {renderDelta(data.varianza.monto_abs, data.varianza.monto_pct, true)}
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Facturas Emitidas</span>
            <ShoppingCart size={18} color="#00C49F" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearA}: </span>
              <span style={{ fontWeight: 600 }}>{data.periodoA.cant_facturas}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearB}: </span>
              <span style={{ fontWeight: 700, color: '#00C49F', fontSize: '1.1rem' }}>{data.periodoB.cant_facturas}</span>
            </div>
          </div>
          {renderDelta(data.varianza.facturas_abs, data.varianza.facturas_pct, false)}
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Clientes Atendidos</span>
            <Users size={18} color="#60a5fa" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearA}: </span>
              <span style={{ fontWeight: 600 }}>{data.periodoA.clientes_atendidos}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{yearB}: </span>
              <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '1.1rem' }}>{data.periodoB.clientes_atendidos}</span>
            </div>
          </div>
          {renderDelta(data.varianza.clientes_abs, data.varianza.clientes_pct, false)}
        </div>

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
    </div>
  );
}
