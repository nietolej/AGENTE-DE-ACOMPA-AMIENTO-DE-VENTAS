'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
  CreditCard, DollarSign, Calendar, TrendingUp, Download, Clock,
  AlertTriangle, CheckCircle2, ShieldAlert, Building2, Percent, Users, Award
} from 'lucide-react';
import { CobranzaKPIs, AgingBucket, VendorCommissionItem, BankPaymentSummary } from '@/lib/types';
import { KpiCard } from '@/components/ui/KpiCard';

interface Props {
  kpis: CobranzaKPIs;
  aging: AgingBucket[];
  vendedoresComisiones: VendorCommissionItem[];
  bancos: BankPaymentSummary[];
  selectedYear: string;
  tab: string;
}

export default function CobranzasDashboardView({
  kpis,
  aging,
  vendedoresComisiones,
  bancos,
  selectedYear,
  tab
}: Props) {
  const router = useRouter();

  const handleYearChange = (newYear: string) => {
    router.push(`/cobranzas?tab=${tab}&year=${newYear}`);
  };

  const handleTabChange = (newTab: string) => {
    router.push(`/cobranzas?tab=${newTab}&year=${selectedYear}`);
  };

  const exportComisionesCSV = () => {
    const headers = [
      'CodVendedor', 'NombreVendedor', 'MontoCobrado_USD', 'ComisionGanada_USD',
      'TasaEfectiva_Pct', 'DiasPromedioCobro', 'CobranzaATiempo_Pct'
    ];
    const rows = vendedoresComisiones.map(v => [
      v.codvend,
      `"${v.nomvend.replace(/"/g, '""')}"`,
      v.monto_cobrado,
      v.comision_ganada,
      v.tasa_efectiva,
      v.dias_promedio_cobro,
      v.cobranza_a_tiempo_pct
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Comisiones_Cobranzas_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Métrica de calidad de datos en bancos
  const unclassifiedBank = bancos.find(b => b.banco === 'NO ESPECIFICADO');
  const unclassifiedPct = unclassifiedBank ? unclassifiedBank.pct : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* KPI Cards Header */}
      <div className="grid-dashboard">
        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Total Cobranza Efectiva
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            ${kpis.total_cobrado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Efectividad de Cobro (%)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#4ade80' }}>
            {kpis.efectividad_cobro_pct}%
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Días Promedio de Cobro (DSO)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#60a5fa' }}>
            {kpis.dias_pago_promedio} <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>días</span>
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Comisiones a Pagar (Sobre Cobro)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#FFBB28' }}>
            ${kpis.comisiones_totales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Tabs y Controles */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handleTabChange('resumen')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'resumen' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'resumen' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'resumen' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'resumen' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Clock size={16} /> Resumen & Morosidad (Aging)
          </button>

          <button
            onClick={() => handleTabChange('comisiones')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'comisiones' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'comisiones' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'comisiones' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'comisiones' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Award size={16} /> Comisiones por Vendedor ({vendedoresComisiones.length})
          </button>

          <button
            onClick={() => handleTabChange('bancos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'bancos' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'bancos' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'bancos' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'bancos' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Building2 size={16} /> Bancos & Formas de Pago ({bancos.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['todos', '2026', '2025', '2024'].map((yr) => (
              <button
                key={yr}
                onClick={() => handleYearChange(yr)}
                style={{
                  backgroundColor: selectedYear === yr ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedYear === yr ? '#fff' : 'var(--text-secondary)',
                  border: selectedYear === yr ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.35rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {yr === 'todos' ? 'Todos' : yr}
              </button>
            ))}
          </div>

          <button
            onClick={exportComisionesCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* TAB 1: RESUMEN Y MOROSIDAD (AGING) */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Gráfico y Tabla de Antigüedad de Saldos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '380px' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--accent-primary)" /> Antigüedad de Saldos de Deuda (Aging)
              </h3>

              <div style={{ flex: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aging} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="rango" stroke="var(--text-secondary)" fontSize={11} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Monto Deuda']}
                    />
                    <Bar dataKey="monto" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Monto Deuda ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
                Desglose de Cartera por Tramo de Vencimiento
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {aging.map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{b.rango}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.facturas_count} documentos en este tramo</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: idx >= 2 ? '#f87171' : idx === 1 ? '#fde047' : '#4ade80', fontFamily: 'var(--font-geist-mono)' }}>
                        ${b.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.pct}% de la cartera</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMISIONES POR VENDEDOR */}
      {tab === 'comisiones' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} color="#FFBB28" /> Reporte de Comisiones por Asesor Comercial
              </h3>
              <p className="text-sub" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                Calculadas estrictamente sobre **Cobro Efectivo Real** con escala de penalización por mora.
              </p>
            </div>
            <button
              onClick={exportComisionesCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '1rem', width: '60px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '1rem' }}>Código</th>
                  <th style={{ padding: '1rem' }}>Asesor Comercial</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Monto Cobrado Efectivo ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Días Promedio Cobro</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Cobranza a Tiempo (%)</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Tasa Efectiva %</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Comisión Ganada ($)</th>
                </tr>
              </thead>
              <tbody>
                {vendedoresComisiones.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No se registraron cobranzas efectivas para calcular comisiones en el período.
                    </td>
                  </tr>
                ) : (
                  vendedoresComisiones.map((v, idx) => (
                    <tr key={`${v.codvend}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {v.codvend}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {v.nomvend}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>
                        ${v.monto_cobrado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                          {v.dias_promedio_cobro} días
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: v.cobranza_a_tiempo_pct > 70 ? '#4ade80' : '#fde047', fontWeight: 600 }}>
                        {v.cobranza_a_tiempo_pct}%
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {v.tasa_efectiva}%
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#FFBB28', fontSize: '1.05rem', fontFamily: 'var(--font-geist-mono)' }}>
                        ${v.comision_ganada.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BANCOS Y MEDIOS DE PAGO */}
      {tab === 'bancos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Alerta de Calidad de Dato en Bancos */}
          {unclassifiedPct > 0 && (
            <div className="glass-panel" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', borderLeft: '4px solid #fde047', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={20} color="#fde047" />
                <div>
                  <div style={{ fontWeight: 700, color: '#fde047' }}>Calidad de Datos en Cobranzas</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    El {unclassifiedPct}% de los cobros en `pagos_detalle` no tiene banco clasificado ("NO ESPECIFICADO").
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} color="var(--accent-primary)" /> Distribución de Cobranzas por Banco
              </h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '1rem', width: '60px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '1rem' }}>Entidad Bancaria</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Nº Transacciones</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Monto Cobrado ($)</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Participación (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {bancos.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No hay registros bancarios en el período.
                      </td>
                    </tr>
                  ) : (
                    bancos.map((b, idx) => (
                      <tr key={`${b.banco}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600, color: b.banco === 'NO ESPECIFICADO' ? '#fde047' : '#fff' }}>
                          {b.banco}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                            {b.transacciones} pagos
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          ${b.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                          {b.pct}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
