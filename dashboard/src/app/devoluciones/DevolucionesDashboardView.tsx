'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Download, AlertTriangle, Users, Building2, UserCheck, Package, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>Código Cliente</TableHead>
                  <TableHead>Nombre / Razón Social</TableHead>
                  <TableHead className="text-right">Venta Bruta ($)</TableHead>
                  <TableHead className="text-right">Monto Devuelto ($)</TableHead>
                  <TableHead className="text-center">Notas de Devolución</TableHead>
                  <TableHead className="text-right">Tasa Devolución %</TableHead>
                  <TableHead className="text-center">Nivel Riesgo</TableHead>
                  <TableHead className="text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center p-12 text-muted-foreground">
                      No hay registros de devoluciones por clientes en el período.
                    </TableCell>
                  </TableRow>
                ) : (
                  clientes.map((c, idx) => (
                    <TableRow key={`${c.codcli}-${idx}`}>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        <Link href={`/clientes/${c.codcli}`} className="text-primary hover:underline">
                          {c.codcli}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <Link href={`/clientes/${c.codcli}`} className="text-foreground hover:underline">
                          {c.nomcli}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${c.venta_monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-400">
                        ${c.devolucion_monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
                          {c.pedidos_afectados} notas
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${c.pct_devolucion > 8 ? 'text-red-400' : c.pct_devolucion > 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {c.pct_devolucion}%
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${c.nivel_riesgo === 'CRÍTICO' ? 'bg-red-500/20 text-red-400' : c.nivel_riesgo === 'MODERADO' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/15 text-green-400'}`}>
                          {c.nivel_riesgo}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/clientes/${c.codcli}`} className="text-primary text-xs font-semibold hover:underline">
                          Ver Cliente →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>Código Vendedor</TableHead>
                  <TableHead>Asesor Comercial</TableHead>
                  <TableHead className="text-right">Venta Bruta ($)</TableHead>
                  <TableHead className="text-right">Devoluciones ($)</TableHead>
                  <TableHead className="text-right">Venta Neta ($)</TableHead>
                  <TableHead className="text-right">Tasa Devolución %</TableHead>
                  <TableHead className="text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center p-12 text-muted-foreground">
                      No hay registros de devoluciones por vendedores en el período.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendedores.map((v, idx) => (
                    <TableRow key={`${v.codvend}-${idx}`}>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        <Link href={`/vendedores/${v.codvend}`} className="text-primary hover:underline">
                          {v.codvend}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <Link href={`/vendedores/${v.codvend}`} className="text-foreground hover:underline">
                          {v.nomvend}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${v.venta_bruta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-400">
                        ${v.devolucion_monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-400">
                        ${v.venta_neta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${v.pct_devolucion > 5 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {v.pct_devolucion}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/vendedores/${v.codvend}`} className="text-primary text-xs font-semibold hover:underline">
                          Ver Vendedor →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>Código Artículo</TableHead>
                  <TableHead>Descripción del Producto</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-right">Unid. Vendidas</TableHead>
                  <TableHead className="text-right">Unid. Devueltas</TableHead>
                  <TableHead className="text-right">Monto Devuelto ($)</TableHead>
                  <TableHead className="text-right">Tasa Devolución %</TableHead>
                  <TableHead className="text-center">Alerta Calidad</TableHead>
                  <TableHead className="text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center p-12 text-muted-foreground">
                      No hay registros de devoluciones por productos en el período.
                    </TableCell>
                  </TableRow>
                ) : (
                  productos.map((p, idx) => (
                    <TableRow key={`${p.codart}-${idx}`}>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        <Link href={`/productos/${encodeURIComponent(p.codart)}`} className="text-primary hover:underline">
                          {p.codart}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <Link href={`/productos/${encodeURIComponent(p.codart)}`} className="text-foreground hover:underline">
                          {p.nomart}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.grupo}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {p.unidades_vendidas.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-400">
                        {p.unidades_devueltas.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-400">
                        ${p.monto_devuelto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${p.pct_devolucion_volumen > 5 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {p.pct_devolucion_volumen}%
                      </TableCell>
                      <TableCell className="text-center">
                        {p.posible_defecto ? (
                          <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle size={12} /> ALERTA DEFECTO
                          </span>
                        ) : (
                          <span className="text-green-400 text-xs">✓ Normal</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/productos/${encodeURIComponent(p.codart)}`} className="text-primary text-xs font-semibold hover:underline">
                          Ver Producto →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
