'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
  RotateCcw, DollarSign, Calendar, TrendingUp, Download, AlertTriangle,
  Users, Package, UserCheck, ShieldAlert, CheckCircle2, Factory
} from 'lucide-react';
import {
  DevolucionesKPIs, ClienteDevolucionesSummary, VendedorDevolucionesSummary,
  ProductoDevolucionesSummary, DevolucionMensual
} from '@/lib/types';
import { KpiCard } from '@/components/ui/KpiCard';

interface Props {
  kpis: DevolucionesKPIs;
  mensual: DevolucionMensual[];
  clientes: ClienteDevolucionesSummary[];
  vendedores: VendedorDevolucionesSummary[];
  productos: ProductoDevolucionesSummary[];
  selectedYear: string;
  tab: string;
}

export default function DevolucionesDashboardView({
  kpis,
  mensual,
  clientes,
  vendedores,
  productos,
  selectedYear,
  tab
}: Props) {
  const router = useRouter();

  const handleYearChange = (newYear: string) => {
    router.push(`/devoluciones?tab=${tab}&year=${newYear}`);
  };

  const handleTabChange = (newTab: string) => {
    router.push(`/devoluciones?tab=${newTab}&year=${selectedYear}`);
  };

  const exportDevolucionesCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];

    if (tab === 'clientes') {
      headers = ['CodCliente', 'NombreCliente', 'VentaMonto_USD', 'DevolucionMonto_USD', 'PedidosAfectados', 'PctDevolucion', 'NivelRiesgo'];
      rows = clientes.map(c => [c.codcli, `"${c.nomcli.replace(/"/g, '""')}"`, c.venta_monto, c.devolucion_monto, c.pedidos_afectados, c.pct_devolucion, c.nivel_riesgo]);
    } else if (tab === 'vendedores') {
      headers = ['CodVendedor', 'NombreVendedor', 'VentaBruta_USD', 'DevolucionMonto_USD', 'VentaNeta_USD', 'PedidosAfectados', 'PctDevolucion'];
      rows = vendedores.map(v => [v.codvend, `"${v.nomvend.replace(/"/g, '""')}"`, v.venta_bruta, v.devolucion_monto, v.venta_neta, v.pedidos_afectados, v.pct_devolucion]);
    } else if (tab === 'productos') {
      headers = ['CodProducto', 'Descripcion', 'Grupo', 'UnidadesVendidas', 'UnidadesDevueltas', 'MontoDevuelto_USD', 'PctDevolucionVolumen', 'PosibleDefecto'];
      rows = productos.map(p => [p.codart, `"${p.nomart.replace(/"/g, '""')}"`, p.grupo, p.unidades_vendidas, p.unidades_devueltas, p.monto_devuelto, p.pct_devolucion_volumen, p.posible_defecto ? 'SI' : 'NO']);
    } else {
      headers = ['Mes', 'VentaMonto_USD', 'DevolucionMonto_USD', 'PctMonto'];
      rows = mensual.map(m => [m.mes, m.venta_monto, m.devolucion_monto, m.pct_monto]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Auditoria_Devoluciones_${tab}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* KPI Cards Header */}
      <div className="grid-dashboard">
        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Monto Total Devuelto
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f87171' }}>
            ${kpis.total_devoluciones_monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Unidades Devueltas
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {kpis.total_unidades_devueltas.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>unid.</span>
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Tasa de Devolución Financiera
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: kpis.tasa_devolucion_monto_pct > 5 ? '#f87171' : '#4ade80' }}>
            {kpis.tasa_devolucion_monto_pct}% <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 400 }}>de venta bruta</span>
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Facturas / Notas Afectadas
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#FFBB28' }}>
            {kpis.pedidos_afectados_count} <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 400 }}>({kpis.impacto_pedidos_pct}%)</span>
          </div>
        </div>
      </div>

      {/* Tabs y Filtros */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
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
            <TrendingUp size={16} /> Resumen & Tendencia Mensual
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
            <Users size={16} /> Análisis por Cliente ({clientes.length})
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
            <UserCheck size={16} /> Análisis por Vendedor ({vendedores.length})
          </button>

          <button
            onClick={() => handleTabChange('productos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'productos' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'productos' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'productos' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'productos' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Package size={16} /> Análisis por Producto ({productos.length})
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
            onClick={exportDevolucionesCSV}
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
            <Download size={15} /> CSV
          </button>
        </div>
      </div>

      {/* TAB 1: RESUMEN Y TENDENCIA MENSUAL */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={18} color="#f87171" /> Evolución Mensual de Devoluciones ($)
            </h3>

            <div style={{ flex: 1, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensual} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: any, name: any) => [`$${Number(value).toLocaleString()}`, name === 'devolucion_monto' ? 'Devolución' : 'Venta Bruta']}
                  />
                  <Bar dataKey="devolucion_monto" fill="#f87171" radius={[4, 4, 0, 0]} name="Devolución ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANÁLISIS POR CLIENTE */}
      {tab === 'clientes' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--accent-primary)" /> Devoluciones por Cliente y Nivel de Riesgo
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '1rem', width: '60px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '1rem' }}>Código Cliente</th>
                  <th style={{ padding: '1rem' }}>Nombre / Razón Social</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Venta Bruta ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Monto Devuelto ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Notas de Devolución</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Tasa Devolución %</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Nivel Riesgo</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No hay registros de devoluciones por clientes en el período.
                    </td>
                  </tr>
                ) : (
                  clientes.map((c, idx) => (
                    <tr key={`${c.codcli}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 600 }}>
                        <Link href={`/clientes/${c.codcli}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {c.codcli}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        <Link href={`/clientes/${c.codcli}`} style={{ color: '#fff', textDecoration: 'none' }}>
                          {c.nomcli}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                        ${c.venta_monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>
                        ${c.devolucion_monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                          {c.pedidos_afectados} notas
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: c.pct_devolucion > 8 ? '#f87171' : c.pct_devolucion > 3 ? '#fde047' : '#4ade80' }}>
                        {c.pct_devolucion}%
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: c.nivel_riesgo === 'CRÍTICO' ? 'rgba(239, 68, 68, 0.2)' : c.nivel_riesgo === 'MODERADO' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                          color: c.nivel_riesgo === 'CRÍTICO' ? '#f87171' : c.nivel_riesgo === 'MODERADO' ? '#fde047' : '#4ade80'
                        }}>
                          {c.nivel_riesgo}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <Link href={`/clientes/${c.codcli}`} style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                          Ver Cliente →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ANÁLISIS POR VENDEDOR */}
      {tab === 'vendedores' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={20} color="var(--accent-primary)" /> Devoluciones por Vendedor e Impacto Comercial
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '1rem', width: '60px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '1rem' }}>Código Vendedor</th>
                  <th style={{ padding: '1rem' }}>Asesor Comercial</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Venta Bruta ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Devoluciones ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Venta Neta ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Tasa Devolución %</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {vendedores.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No hay registros de devoluciones por vendedores en el período.
                    </td>
                  </tr>
                ) : (
                  vendedores.map((v, idx) => (
                    <tr key={`${v.codvend}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 600 }}>
                        <Link href={`/vendedores/${v.codvend}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {v.codvend}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        <Link href={`/vendedores/${v.codvend}`} style={{ color: '#fff', textDecoration: 'none' }}>
                          {v.nomvend}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                        ${v.venta_bruta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>
                        ${v.devolucion_monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                        ${v.venta_neta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: v.pct_devolucion > 5 ? '#f87171' : 'var(--text-secondary)' }}>
                        {v.pct_devolucion}%
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <Link href={`/vendedores/${v.codvend}`} style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                          Ver Vendedor →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ANÁLISIS POR PRODUCTO */}
      {tab === 'productos' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} color="var(--accent-primary)" /> Devoluciones por Producto y Detección de Fallas
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '1rem', width: '60px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '1rem' }}>Código Artículo</th>
                  <th style={{ padding: '1rem' }}>Descripción del Producto</th>
                  <th style={{ padding: '1rem' }}>Grupo</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Unid. Vendidas</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Unid. Devueltas</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Monto Devuelto ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Tasa Devolución %</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Alerta Calidad</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No hay registros de devoluciones por productos en el período.
                    </td>
                  </tr>
                ) : (
                  productos.map((p, idx) => (
                    <tr key={`${p.codart}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 600 }}>
                        <Link href={`/productos/${encodeURIComponent(p.codart)}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {p.codart}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        <Link href={`/productos/${encodeURIComponent(p.codart)}`} style={{ color: '#fff', textDecoration: 'none' }}>
                          {p.nomart}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {p.grupo}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                        {p.unidades_vendidas.toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>
                        {p.unidades_devueltas.toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>
                        ${p.monto_devuelto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: p.pct_devolucion_volumen > 5 ? '#f87171' : 'var(--text-secondary)' }}>
                        {p.pct_devolucion_volumen}%
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {p.posible_defecto ? (
                          <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertTriangle size={12} /> ALERTA DE DEFECTO / ERROR
                          </span>
                        ) : (
                          <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>✓ Normal</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <Link href={`/productos/${encodeURIComponent(p.codart)}`} style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                          Ver Producto →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
