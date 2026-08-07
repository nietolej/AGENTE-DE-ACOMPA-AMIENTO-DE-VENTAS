'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
  UserCheck, DollarSign, ArrowLeft, ShoppingCart, Percent,
  AlertTriangle, Users, Calendar, TrendingUp, Download, Mail, Phone, FileText, Package, BarChart2,
  PieChart, ShieldAlert, Zap, UserX, Compass
} from 'lucide-react';
import { VendorDetail, VendorCompareData } from '@/lib/types';
import { KpiCard } from '@/components/ui/KpiCard';
import VendorCompareView from './VendorCompareView';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  data: VendorDetail;
  selectedYear: string;
  tab: string;
  yearA: string;
  yearB: string;
  compareData: VendorCompareData | null;
}

export default function VendorDetailView({
  data,
  selectedYear,
  tab,
  yearA,
  yearB,
  compareData
}: Props) {
  const router = useRouter();

  const handleYearChange = (newYear: string) => {
    const encodedCod = encodeURIComponent(data.codvend);
    router.push(`/vendedores/${encodedCod}?tab=${tab}&year=${newYear}`);
  };

  const handleTabChange = (newTab: string) => {
    const encodedCod = encodeURIComponent(data.codvend);
    router.push(`/vendedores/${encodedCod}?tab=${newTab}&year=${selectedYear}&yearA=${yearA}&yearB=${yearB}`);
  };

  const exportCSV = () => {
    const headers = [
      'CodVendedor', 'NombreVendedor', 'Email', 'Telefono', 'CIF',
      'VentaTotal_USD', 'CantFacturas', 'ClientesAtendidos', 'ClientesAsignados', 'CoberturaPct',
      'ConcentracionTop3Pct', 'VentaCruzadaProm', 'TasaFugaChurnPct', 'Devoluciones_USD', 'PctDevoluciones'
    ];
    const row = [
      data.codvend,
      `"${data.nomvend.replace(/"/g, '""')}"`,
      data.email,
      data.tlf1,
      data.cif,
      data.venta_total,
      data.cant_facturas,
      data.clientes_atendidos,
      data.clientes_asignados_total,
      data.cobertura_cartera,
      data.concentracion_top3,
      data.venta_cruzada_prom,
      data.tasa_fuga_churn,
      data.devoluciones_monto,
      data.pct_monto_devo
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ficha_Vendedor_${data.codvend}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Diagnóstico de Estrategia Sugerida por IA
  let strategyInsight = null;
  if (data.concentracion_top3 > 60) {
    strategyInsight = {
      type: 'danger',
      title: 'Riesgo Alto de Concentración de Ingresos',
      text: `El ${data.concentracion_top3}% de las ventas de este asesor depende de solo 3 clientes. Se recomienda asignarle metas de diversificación para evitar pérdida de ingresos si una cuenta clave migra.`
    };
  } else if (data.cobertura_cartera < 40 && data.clientes_asignados_total > 5) {
    strategyInsight = {
      type: 'warning',
      title: 'Zona de Confort / Baja Cobertura de Cartera',
      text: `El asesor solo atiende al ${data.cobertura_cartera}% de su cartera asignada (${data.clientes_atendidos} de ${data.clientes_asignados_total} clientes). Existen ${data.clientes_dormidos.length} cuentas dormidas sin visitas recientes.`
    };
  } else if (data.pct_monto_devo > 5) {
    strategyInsight = {
      type: 'danger',
      title: 'Alerta de Calidad de Venta (Alta Devolución)',
      text: `El índice de devoluciones es del ${data.pct_monto_devo}%. Se sugiere revisar si se están despachando repuestos equivocados o forzando cierres de venta no acordados.`
    };
  } else if (data.pct_cumplimiento >= 100) {
    strategyInsight = {
      type: 'success',
      title: 'Desempeño Sobresaliente',
      text: `Asesor cumpliendo la meta al ${data.pct_cumplimiento}%. Recomendar para incentivo de volumen y asignación de nuevas cuentas clave.`
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Volver y Header */}
      <div>
        <Link
          href="/vendedores"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            marginBottom: '1rem'
          }}
        >
          <ArrowLeft size={16} /> Volver a Fuerza de Ventas
        </Link>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{
                fontFamily: 'var(--font-geist-mono)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid rgba(59, 130, 246, 0.4)'
              }}>
                CÓDIGO: {data.codvend}
              </span>
              {data.is_administrative && (
                <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                  CÓDIGO ADMINISTRATIVO / INACTIVO
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              {data.nomvend}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {data.tlf1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={14} color="#60a5fa" /> <span>{data.tlf1}</span>
                </div>
              )}
              {data.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={14} color="#60a5fa" /> <span>{data.email}</span>
                </div>
              )}
              {data.cif && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FileText size={14} color="#60a5fa" /> <span>RIF/CIF: {data.cif}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={exportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', gap: '0.5rem', overflowX: 'auto' }}>
        <button
          onClick={() => handleTabChange('anio')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: tab === 'anio' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: tab === 'anio' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: tab === 'anio' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontWeight: tab === 'anio' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Calendar size={16} /> Vista General / Anual
        </button>

        <button
          onClick={() => handleTabChange('strategy')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: tab === 'strategy' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: tab === 'strategy' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: tab === 'strategy' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontWeight: tab === 'strategy' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Compass size={16} /> Analítica Estratégica & Cartera Dormida ({data.clientes_dormidos.length})
        </button>

        <button
          onClick={() => handleTabChange('compare')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: tab === 'compare' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: tab === 'compare' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: tab === 'compare' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontWeight: tab === 'compare' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <BarChart2 size={16} /> Comparativa Multianual
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
          <Users size={16} /> Cartera Activa ({data.clientes_atendidos})
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
          <Package size={16} /> Productos Vendidos ({data.top_productos.length})
        </button>
      </div>

      {/* TAB 1: VISTA ANUAL */}
      {tab === 'anio' && (
        <>
          {/* Selector de Años */}
          <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <Calendar size={18} />
              <span>Filtrar período de análisis:</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['todos', '2026', '2025', '2024'].map((yr) => (
                <button
                  key={yr}
                  onClick={() => handleYearChange(yr)}
                  style={{
                    backgroundColor: selectedYear === yr ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedYear === yr ? '#fff' : 'var(--text-secondary)',
                    border: selectedYear === yr ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '0.4rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {yr === 'todos' ? 'Todos los Años' : `Año ${yr}`}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs Principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <KpiCard
              title="Venta Total ($)"
              value={`$${data.venta_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<DollarSign size={20} color="var(--accent-primary)" />}
            />
            <KpiCard
              title="Facturas Emitidas"
              value={data.cant_facturas}
              icon={<ShoppingCart size={20} color="#00C49F" />}
            />
            <KpiCard
              title="Clientes Atendidos"
              value={`${data.clientes_atendidos} / ${data.clientes_asignados_total}`}
              icon={<Users size={20} color="#60a5fa" />}
            />
            <KpiCard
              title="Pedido Promedio"
              value={`$${data.pedido_promedio.toLocaleString()}`}
              icon={<DollarSign size={20} color="#FFBB28" />}
            />
            <KpiCard
              title="% Cumplimiento Meta"
              value={`${data.pct_cumplimiento.toFixed(1)}%`}
              icon={<Percent size={20} color={data.pct_cumplimiento >= 100 ? '#4ade80' : '#fde047'} />}
              valueColor={data.pct_cumplimiento >= 100 ? '#4ade80' : '#fde047'}
            />
            <KpiCard
              title="Tasa Devoluciones ($)"
              value={`${data.pct_monto_devo.toFixed(1)}%`}
              icon={<AlertTriangle size={20} color={data.pct_monto_devo > 5 ? '#f87171' : 'var(--text-secondary)'} />}
              valueColor={data.pct_monto_devo > 5 ? '#f87171' : 'var(--text-secondary)'}
            />
          </div>

          {/* Gráfico de Ventas Mensuales */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--accent-primary)" /> Rendimiento Comercial Mensual vs Meta ($)
            </h3>

            {data.ventas_mensuales.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No hay facturas registradas en el período seleccionado.
              </div>
            ) : (
              <div style={{ flex: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ventas_mensuales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Venta']}
                    />
                    <Bar dataKey="venta" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Venta Real ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB ESTRATÉGICO: ANALÍTICA Y CARTERA DORMIDA */}
      {tab === 'strategy' && (
        <>
          {/* Insight IA */}
          {strategyInsight && (
            <div className="glass-panel" style={{
              borderLeft: `4px solid ${strategyInsight.type === 'danger' ? '#f87171' : strategyInsight.type === 'warning' ? '#fde047' : '#4ade80'}`,
              backgroundColor: strategyInsight.type === 'danger' ? 'rgba(255, 68, 68, 0.1)' : strategyInsight.type === 'warning' ? 'rgba(255, 187, 40, 0.1)' : 'rgba(0, 200, 150, 0.1)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Zap size={20} color={strategyInsight.type === 'danger' ? '#f87171' : strategyInsight.type === 'warning' ? '#fde047' : '#4ade80'} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: strategyInsight.type === 'danger' ? '#f87171' : strategyInsight.type === 'warning' ? '#fde047' : '#4ade80' }}>
                  {strategyInsight.title}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{strategyInsight.text}</p>
            </div>
          )}

          {/* Grid de 4 Métricas Estratégicas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Cobertura de Cartera
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: data.cobertura_cartera > 50 ? '#4ade80' : '#fde047' }}>
                {data.cobertura_cartera}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {data.clientes_atendidos} de {data.clientes_asignados_total} clientes comprando
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Riesgo Concentración (Top 3)
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: data.concentracion_top3 > 60 ? '#f87171' : 'var(--accent-primary)' }}>
                {data.concentracion_top3}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Venta dependiente de sus 3 mayores clientes
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Venta Cruzada (Cross-Selling)
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa' }}>
                {data.venta_cruzada_prom}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Líneas/familias distintas por pedido
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Tasa Fuga de Clientes (Churn)
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: data.tasa_fuga_churn > 20 ? '#f87171' : 'var(--text-secondary)' }}>
                {data.tasa_fuga_churn}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {data.clientes_dormidos.length} clientes sin comprar recientemente
              </div>
            </div>
          </div>

          {/* Tabla Clientes Dormidos */}
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserX size={20} color="#f87171" /> Clientes Dormidos / En Riesgo de Fuga ({data.clientes_dormidos.length})
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Cuentas asignadas sin ventas en el período seleccionado
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead>Código Cliente</TableHead>
                    <TableHead>Nombre / Razón Social</TableHead>
                    <TableHead className="text-right">Venta Histórica ($)</TableHead>
                    <TableHead className="text-center">Última Compra</TableHead>
                    <TableHead className="text-center">Días Sin Comprar</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clientes_dormidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center p-12 text-green-400">
                        ¡Excelente! No hay clientes dormidos en la cartera asignada a este vendedor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.clientes_dormidos.map((c, idx) => (
                      <TableRow key={`${c.codcli}-${idx}`}>
                        <TableCell className="text-center font-bold text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          <Link href={`/clientes/${c.codcli}`} className="text-primary hover:underline">
                            {c.codcli}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/clientes/${c.codcli}`} className="text-white hover:underline">
                            {c.nomcli}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          ${c.monto_historico.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {c.ultima_compra}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.dias_sin_comprar > 90 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {c.dias_sin_comprar >= 999 ? '> 1 año' : `${c.dias_sin_comprar} días`}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Link href={`/clientes/${c.codcli}`} className="text-primary text-sm font-semibold hover:underline">
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
        </>
      )}

      {/* TAB COMPARATIVA */}
      {tab === 'compare' && compareData && (
        <VendorCompareView data={compareData} yearA={yearA} yearB={yearB} />
      )}

      {/* TAB CARTERA ACTIVA */}
      {tab === 'clientes' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--accent-primary)" /> Cartera de Clientes Atendidos por {data.nomvend}
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>Código Cliente</TableHead>
                  <TableHead>Nombre / Razón Social</TableHead>
                  <TableHead className="text-center">Facturas / Compras</TableHead>
                  <TableHead className="text-right">Monto Vendido ($)</TableHead>
                  <TableHead className="text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_clientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center p-12 text-muted-foreground">
                      No hay clientes asignados/atendidos en el período.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.top_clientes.map((c, idx) => (
                    <TableRow key={`${c.codcli}-${idx}`}>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        <Link href={`/clientes/${c.codcli}`} className="text-primary hover:underline">
                          {c.codcli}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <Link href={`/clientes/${c.codcli}`} className="text-white hover:underline">
                          {c.nomcli}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="bg-white/10 px-2 py-1 rounded-full text-xs">
                          {c.cant_facturas} facturas
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        ${c.monto_comprado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/clientes/${c.codcli}`} className="text-primary text-sm font-semibold hover:underline">
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

      {/* TAB PRODUCTOS VENDIDOS */}
      {tab === 'productos' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} color="var(--accent-primary)" /> Productos Más Vendidos por {data.nomvend}
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>Código Artículo</TableHead>
                  <TableHead>Descripción del Producto</TableHead>
                  <TableHead className="text-right">Unidades Vendidas</TableHead>
                  <TableHead className="text-right">Monto Vendido ($)</TableHead>
                  <TableHead className="text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_productos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center p-12 text-muted-foreground">
                      No hay productos vendidos en el período.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.top_productos.map((p, idx) => (
                    <TableRow key={`${p.codart}-${idx}`}>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        <Link href={`/productos/${encodeURIComponent(p.codart)}`} className="text-primary hover:underline">
                          {p.codart}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <Link href={`/productos/${encodeURIComponent(p.codart)}`} className="text-white hover:underline">
                          {p.nomart}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {p.cantidad_vendida.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        ${p.monto_vendido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/productos/${encodeURIComponent(p.codart)}`} className="text-primary text-sm font-semibold hover:underline">
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
