'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Download, AlertTriangle, Users, Building2, UserCheck, Clock, Search, Filter, TrendingUp, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CobranzaKPIs,
  AgingBucket,
  PaymentVelocityBucket,
  MonthlyPaymentTrend,
  VendorPaymentPerformanceItem,
  ClientPaymentPerformanceItem,
  BankPaymentSummary
} from '@/lib/types';

interface Props {
  kpis: CobranzaKPIs;
  aging: AgingBucket[];
  velocidad: PaymentVelocityBucket[];
  tendenciaMensual: MonthlyPaymentTrend[];
  bancos: BankPaymentSummary[];
  vendedores: VendorPaymentPerformanceItem[];
  clientes: ClientPaymentPerformanceItem[];
  selectedYear: string;
  tab: string;
}

export default function CobranzasDashboardView({
  kpis,
  aging,
  velocidad,
  tendenciaMensual,
  bancos,
  vendedores,
  clientes,
  selectedYear,
  tab
}: Props) {
  const router = useRouter();
  const [clientSearch, setClientSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'TODOS' | 'PUNTUAL' | 'RETRASO_LEVE' | 'RETRASO_CRITICO' | 'CON_DEUDA'>('TODOS');

  const handleYearChange = (newYear: string) => {
    router.push(`/cobranzas?tab=${tab}&year=${newYear}`);
  };

  const handleTabChange = (newTab: string) => {
    router.push(`/cobranzas?tab=${newTab}&year=${selectedYear}`);
  };

  const exportVendedoresCSV = () => {
    const headers = [
      'CodVendedor', 'NombreVendedor', 'MontoCobrado_USD', 'Transacciones',
      'DiasPromedioCobro', 'DiasMedianaCobro', 'CobranzaATiempo_Pct', 'Mora30Plus_Pct', 'DeudaPendiente_USD'
    ];
    const rows = vendedores.map(v => [
      v.codvend,
      `"${v.nomvend.replace(/"/g, '""')}"`,
      v.monto_cobrado,
      v.transacciones,
      v.dias_promedio_cobro,
      v.dias_mediana_cobro,
      v.cobranza_a_tiempo_pct,
      v.mora_30plus_pct,
      v.deuda_pendiente_cartera
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Promedio_Pago_Vendedores_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportClientesCSV = () => {
    const headers = [
      'CodCliente', 'NombreCliente', 'CodVendedor', 'NombreVendedor',
      'MontoCobrado_USD', 'Transacciones', 'DiasPromedioCobro', 'DiasMedianaCobro',
      'CobranzaATiempo_Pct', 'DeudaPendiente_USD', 'CategoriaPago'
    ];
    const rows = filteredClientes.map(c => [
      c.codcli,
      `"${c.nomcli.replace(/"/g, '""')}"`,
      c.codvend,
      `"${c.nomvend.replace(/"/g, '""')}"`,
      c.monto_cobrado,
      c.transacciones,
      c.dias_promedio_cobro,
      c.dias_mediana_cobro,
      c.cobranza_a_tiempo_pct,
      c.deuda_pendiente,
      c.categoria_pago
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Promedio_Pago_Clientes_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado de clientes para Tab 3
  const filteredClientes = clientes.filter(c => {
    const matchesSearch = clientSearch.trim() === '' ||
      c.nomcli.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.codcli.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.nomvend.toLowerCase().includes(clientSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === 'PUNTUAL') return c.categoria_pago === 'PUNTUAL';
    if (categoryFilter === 'RETRASO_LEVE') return c.categoria_pago === 'RETRASO_LEVE';
    if (categoryFilter === 'RETRASO_CRITICO') return c.categoria_pago === 'RETRASO_CRITICO';
    if (categoryFilter === 'CON_DEUDA') return c.deuda_pendiente > 0;

    return true;
  });

  // Calidad de dato en bancos
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
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {kpis.transacciones_cobro.toLocaleString()} pagos procesados
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Promedio Días de Pago (DSO Global)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#60a5fa' }}>
            {kpis.dias_pago_promedio} <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>días</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Mediana: {kpis.dias_pago_mediana} días
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Cobranza a Tiempo (≤30 días)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#4ade80' }}>
            {kpis.pagos_a_tiempo_pct}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Porcentaje de cobros dentro de término
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Efectividad de Cobro (%)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#38bdf8' }}>
            {kpis.efectividad_cobro_pct}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Cobrado vs Total Facturado
          </div>
        </div>
      </div>

      {/* Tabs y Controles */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
            <Clock size={16} /> Resumen & Velocidad de Cobro
          </button>

          <button
            onClick={() => handleTabChange('vendedores')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'vendedores' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'vendedores' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'vendedores' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'vendedores' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <UserCheck size={16} /> Promedio por Vendedor ({vendedores.length})
          </button>

          <button
            onClick={() => handleTabChange('clientes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'clientes' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'clientes' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'clientes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'clientes' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Users size={16} /> Promedio por Cliente ({clientes.length})
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
            <Building2 size={16} /> Bancos & Canales ({bancos.length})
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

          {tab === 'vendedores' && (
            <button
              onClick={exportVendedoresCSV}
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
              <Download size={15} /> Exportar Vendedores CSV
            </button>
          )}

          {tab === 'clientes' && (
            <button
              onClick={exportClientesCSV}
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
              <Download size={15} /> Exportar Clientes CSV
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: RESUMEN Y VELOCIDAD DE COBRO */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Fila 1: Tramos de Velocidad de Pago vs Antigüedad de Deuda */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            {/* Tramos de Velocidad de Pago (Cash Inflow Velocity) */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="var(--accent-primary)" /> Distribución de Velocidad de Cobro ($ Real Cobrado)
              </h3>

              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocidad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="tramo" stroke="var(--text-secondary)" fontSize={11} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Monto Cobrado']}
                    />
                    <Bar dataKey="monto" fill="#4ade80" radius={[4, 4, 0, 0]} name="Monto Cobrado ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {velocidad.map((v, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.tramo}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.2rem', color: idx === 0 ? '#4ade80' : idx === 1 ? '#60a5fa' : idx === 2 ? '#fde047' : '#f87171' }}>
                      ${v.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      {v.pct}% del cobro total ({v.count} pagos)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Antigüedad de Saldos de Deuda (Aging) */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="#fde047" /> Antigüedad de Saldos de Deuda Abierta (Aging)
              </h3>

              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aging} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="rango" stroke="var(--text-secondary)" fontSize={11} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Deuda Pendiente']}
                    />
                    <Bar dataKey="monto" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Deuda ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {aging.map((b, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '0.85rem' }}>{b.rango}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: idx >= 2 ? '#f87171' : idx === 1 ? '#fde047' : '#4ade80' }}>
                      ${b.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({b.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fila 2: Tendencia Mensual de Días Promedio de Pago */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--accent-primary)" /> Tendencia Mensual de Días Promedio de Pago (DSO por Mes)
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Comportamiento histórico de la velocidad de recuperación de cartera mes a mes.
            </p>

            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tendenciaMensual} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} />
                  <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={12} label={{ value: 'Días Promedio', angle: -90, position: 'insideLeft', fill: '#60a5fa' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={12} label={{ value: 'Monto Cobrado ($)', angle: 90, position: 'insideRight', fill: '#4ade80' }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: any, name?: any) => [
                      name === 'Días Promedio' ? `${value} días` : `$${Number(value).toLocaleString()}`,
                      name || ''
                    ]}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="dias_promedio_cobro" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} name="Días Promedio" />
                  <Line yAxisId="right" type="monotone" dataKey="monto_cobrado" stroke="#4ade80" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Monto Cobrado ($)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROMEDIO DE PAGO POR VENDEDOR */}
      {tab === 'vendedores' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={20} color="var(--accent-primary)" /> Análisis de Días de Pago por Asesor Comercial
              </h3>
              <p className="text-sub" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                Evaluación de la velocidad de cobro de la cartera administrada por cada vendedor.
              </p>
            </div>
            <button
              onClick={exportVendedoresCSV}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Asesor Comercial</TableHead>
                  <TableHead className="text-right">Monto Cobrado ($)</TableHead>
                  <TableHead className="text-center">Nº Cobros</TableHead>
                  <TableHead className="text-center">Prom. Días Pago</TableHead>
                  <TableHead className="text-center">Mediana Días</TableHead>
                  <TableHead className="text-center">% Cobranza a Tiempo (≤30d)</TableHead>
                  <TableHead className="text-center">% Mora (&gt;30d)</TableHead>
                  <TableHead className="text-right">Deuda Cartera ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center p-12 text-muted-foreground">
                      No hay datos registrados de vendedores en el período seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendedores.map((v, idx) => {
                    const statusColor = v.dias_promedio_cobro <= 30 ? 'text-green-400 border-green-500/30 bg-green-500/10' : v.dias_promedio_cobro <= 60 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10';
                    return (
                      <TableRow key={`${v.codvend}-${idx}`}>
                        <TableCell className="text-center font-bold text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-primary">
                          {v.codvend}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {v.nomvend}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          ${v.monto_cobrado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
                            {v.transacciones}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                            {v.dias_promedio_cobro} días
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {v.dias_mediana_cobro} d
                        </TableCell>
                        <TableCell className={`text-center font-bold ${v.cobranza_a_tiempo_pct >= 75 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {v.cobranza_a_tiempo_pct}%
                        </TableCell>
                        <TableCell className={`text-center font-bold ${v.mora_30plus_pct > 30 ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {v.mora_30plus_pct}%
                        </TableCell>
                        <TableCell className={`text-right font-bold font-mono ${v.deuda_pendiente_cartera > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                          ${v.deuda_pendiente_cartera.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 3: PROMEDIO DE PAGO POR CLIENTE */}
      {tab === 'clientes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Barra de Filtros y Búsqueda */}
          <div className="glass-panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '280px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, código o vendedor..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.6rem 0.6rem 2.4rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Filter size={15} /> Filtrar:
              </span>
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'PUNTUAL', label: 'Puntuales (≤30d)' },
                { id: 'RETRASO_LEVE', label: 'Mora Leve (31-60d)' },
                { id: 'RETRASO_CRITICO', label: 'Mora Crítica (>60d)' },
                { id: 'CON_DEUDA', label: 'Con Deuda Pendiente' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id as any)}
                  style={{
                    backgroundColor: categoryFilter === f.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    color: categoryFilter === f.id ? '#fff' : 'var(--text-secondary)',
                    border: categoryFilter === f.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="var(--accent-primary)" /> Análisis de Promedio de Pago por Cliente ({filteredClientes.length})
                </h3>
                <p className="text-sub" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  Detalle individual de DSO por cliente, mediana de días, puntualidad de pagos y saldo abierto.
                </p>
              </div>
              <button
                onClick={exportClientesCSV}
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
                <Download size={16} /> Exportar CSV Clientes
              </button>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">#</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Asesor Comercial</TableHead>
                    <TableHead className="text-right">Monto Cobrado ($)</TableHead>
                    <TableHead className="text-center">Cobros</TableHead>
                    <TableHead className="text-center">Prom. Días</TableHead>
                    <TableHead className="text-center">Mediana Días</TableHead>
                    <TableHead className="text-center">% A Tiempo</TableHead>
                    <TableHead className="text-right">Deuda Pendiente ($)</TableHead>
                    <TableHead className="text-center">Comportamiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center p-12 text-muted-foreground">
                        No se encontraron clientes que coincidan con la búsqueda o filtro seleccionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClientes.map((c, idx) => {
                      let badgeClass = 'bg-white/5 text-muted-foreground';
                      let badgeLabel = 'SIN COBROS';

                      if (c.categoria_pago === 'PUNTUAL') {
                        badgeClass = 'bg-green-500/15 text-green-400 border border-green-500/30';
                        badgeLabel = 'PUNTUAL (≤30d)';
                      } else if (c.categoria_pago === 'RETRASO_LEVE') {
                        badgeClass = 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30';
                        badgeLabel = 'MORA LEVE (31-60d)';
                      } else if (c.categoria_pago === 'RETRASO_CRITICO') {
                        badgeClass = 'bg-red-500/15 text-red-400 border border-red-500/30';
                        badgeLabel = 'MORA CRÍTICA (>60d)';
                      }

                      return (
                        <TableRow key={`${c.codcli}-${idx}`}>
                          <TableCell className="text-center font-bold text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-primary">
                            {c.codcli}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {c.nomcli}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.nomvend}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            ${c.monto_cobrado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
                              {c.transacciones}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {c.transacciones > 0 ? `${c.dias_promedio_cobro} d` : '-'}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {c.transacciones > 0 ? `${c.dias_mediana_cobro} d` : '-'}
                          </TableCell>
                          <TableCell className={`text-center font-bold ${c.cobranza_a_tiempo_pct >= 75 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {c.transacciones > 0 ? `${c.cobranza_a_tiempo_pct}%` : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-bold font-mono ${c.deuda_pendiente > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                            ${c.deuda_pendiente.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${badgeClass}`}>
                              {badgeLabel}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BANCOS Y MEDIOS DE PAGO */}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead>Entidad Bancaria</TableHead>
                    <TableHead className="text-center">Nº Transacciones</TableHead>
                    <TableHead className="text-right">Monto Cobrado ($)</TableHead>
                    <TableHead className="text-right">Participación (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bancos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center p-12 text-muted-foreground">
                        No hay registros bancarios en el período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bancos.map((b, idx) => (
                      <TableRow key={`${b.banco}-${idx}`}>
                        <TableCell className="text-center font-bold text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className={`font-semibold ${b.banco === 'NO ESPECIFICADO' ? 'text-yellow-400' : 'text-foreground'}`}>
                          {b.banco}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
                            {b.transacciones} pagos
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          ${b.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {b.pct}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
