'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Boxes, DollarSign, Calendar, TrendingUp, Download, AlertTriangle,
  Search, ShieldAlert, CheckCircle2, ShoppingCart, RefreshCw, Layers
} from 'lucide-react';
import {
  InventoryIntelligenceKPIs, InventoryItemIntelligence, InventoryGroupHealth
} from '@/lib/types';
import { KpiCard } from '@/components/ui/KpiCard';

interface Props {
  kpis: InventoryIntelligenceKPIs;
  items: InventoryItemIntelligence[];
  grupos: InventoryGroupHealth[];
  selectedYear: string;
  tab: string;
  search: string;
  filterState: string;
}

export default function InventoryDashboardView({
  kpis,
  items,
  grupos,
  selectedYear,
  tab,
  search: initialSearch,
  filterState: initialFilterState
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [filterState, setFilterState] = useState(initialFilterState);
  const [desiredCoverageDays, setDesiredCoverageDays] = useState<number>(90);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/inventario?tab=${tab}&year=${selectedYear}&search=${encodeURIComponent(search)}&state=${filterState}`);
  };

  const handleFilterStateChange = (newState: string) => {
    setFilterState(newState);
    router.push(`/inventario?tab=${tab}&year=${selectedYear}&search=${encodeURIComponent(search)}&state=${newState}`);
  };

  const handleYearChange = (newYear: string) => {
    router.push(`/inventario?tab=${tab}&year=${newYear}&search=${encodeURIComponent(search)}&state=${filterState}`);
  };

  const handleTabChange = (newTab: string) => {
    router.push(`/inventario?tab=${newTab}&year=${selectedYear}&search=${encodeURIComponent(search)}&state=${filterState}`);
  };

  const exportInventoryCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];

    if (tab === 'sugerido') {
      headers = [
        'CodProducto', 'Descripcion', 'Grupo', 'StockActual', 'Transito', 'Produccion',
        'VelocidadAjustada_UnidDia', 'CoberturaActual_Dias', `SugeridoCompra_${desiredCoverageDays}Dias_Unidades`
      ];
      rows = items.map(i => {
        const demanda = i.velocidad_ajustada * desiredCoverageDays;
        const disp = i.stock_actual + i.pendiente_transito + i.pendiente_produccion;
        const sug = Math.max(0, Math.ceil(demanda - disp));
        return [
          i.codart, `"${i.nomart.replace(/"/g, '""')}"`, i.grupo, i.stock_actual,
          i.pendiente_transito, i.pendiente_produccion, i.velocidad_ajustada, i.dias_cobertura_real, sug
        ];
      });
    } else {
      headers = [
        'CodProducto', 'Descripcion', 'Grupo', 'Precio_A', 'StockActual', 'DiasConStock_DIS',
        'PctDisponibilidad', 'UnidadesVendidas', 'VelocidadBasica_UnidDia', 'VelocidadAjustada_UnidDia',
        'DiasCoberturaReal', 'MesesCoberturaReal', 'VentaPerdidaEstimada_USD', 'EstadoSalud'
      ];
      rows = items.map(i => [
        i.codart, `"${i.nomart.replace(/"/g, '""')}"`, i.grupo, i.precio_a, i.stock_actual,
        i.dias_con_stock, i.pct_disponibilidad, i.unidades_vendidas, i.velocidad_basica,
        i.velocidad_ajustada, i.dias_cobertura_real, i.meses_cobertura_real, i.venta_perdida_estimada, i.estado_salud
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inteligencia_Inventario_${tab}_${selectedYear}.csv`);
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
            Capital Inmovilizado en Stock
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            ${kpis.total_capital_inventario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Venta Perdida Estimada ($)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f87171' }}>
            ${kpis.total_venta_perdida_estimada.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Ítems en Riesgo de Quiebre
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f87171' }}>
            {kpis.items_riesgo_quiebre} <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 400 }}>repuestos</span>
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Demanda Reprimida / Alto Potencial
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fde047' }}>
            {kpis.items_demanda_reprimida} <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 400 }}>repuestos</span>
          </div>
        </div>
      </div>

      {/* Bar de Controles y Búsqueda */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Buscar por código, descripción, grupo o marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.2rem',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Buscar
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            value={filterState}
            onChange={(e) => handleFilterStateChange(e.target.value)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              padding: '0.6rem 1rem',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="todos" style={{ backgroundColor: '#18181b' }}>Todos los Estados de Salud</option>
            <option value="RIESGO_QUIEBRE" style={{ backgroundColor: '#18181b' }}>🔴 Riesgo de Quiebre</option>
            <option value="DEMANDA_REPRIMIDA" style={{ backgroundColor: '#18181b' }}>🟡 Demanda Reprimida</option>
            <option value="SOBRESTOCK" style={{ backgroundColor: '#18181b' }}>🔵 Sobre-stock (&gt;6 mes)</option>
            <option value="SALUDABLE" style={{ backgroundColor: '#18181b' }}>🟢 Saludables</option>
          </select>

          <button
            onClick={exportInventoryCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handleTabChange('velocidad')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'velocidad' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'velocidad' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'velocidad' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'velocidad' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <TrendingUp size={16} /> Velocidad Ajustada & Salud de Stock ({items.length})
          </button>

          <button
            onClick={() => handleTabChange('sugerido')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'sugerido' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'sugerido' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'sugerido' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'sugerido' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <ShoppingCart size={16} /> Sugerido de Órdenes de Compra
          </button>

          <button
            onClick={() => handleTabChange('grupos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'grupos' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'grupos' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'grupos' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'grupos' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Layers size={16} /> Salud por Grupo / Familia ({grupos.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
      </div>

      {/* TAB 1: VELOCIDAD AJUSTADA Y SALUD */}
      {tab === 'velocidad' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--accent-primary)" /> Matriz de Velocidad Ajustada por Días en Stock (DIS)
            </h3>
            <p className="text-sub" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
              Compara la velocidad básica vs la **Velocidad Real Ajustada** (eliminando días agotados) y estima las ventas perdidas por quiebres.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '1rem', width: '50px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '1rem' }}>Código / Descripción</th>
                  <th style={{ padding: '1rem' }}>Grupo</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Stock Actual</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Días con Stock (DIS)</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Vel. Básica</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Vel. Real Ajustada</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Cobertura Real</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Venta Perdida ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Estado Salud</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No se encontraron repuestos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={`${item.codart}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <Link href={`/productos/${encodeURIComponent(item.codart)}`} style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'none' }}>
                          {item.codart}
                        </Link>
                        <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>{item.nomart}</div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {item.grupo}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: item.stock_actual <= 0 ? '#f87171' : '#fff' }}>
                        {item.stock_actual.toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                          {item.dias_con_stock}d / {item.dias_periodo_total}d ({item.pct_disponibilidad}%)
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {item.velocidad_basica} u/d
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#60a5fa', fontFamily: 'var(--font-geist-mono)' }}>
                        {item.velocidad_ajustada} u/d
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: item.meses_cobertura_real < 0.5 ? '#f87171' : item.meses_cobertura_real > 6 ? '#60a5fa' : '#4ade80' }}>
                          {item.meses_cobertura_real} mes({item.dias_cobertura_real}d)
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: item.venta_perdida_estimada > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                        ${item.venta_perdida_estimada.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor:
                            item.estado_salud === 'RIESGO_QUIEBRE' ? 'rgba(239, 68, 68, 0.2)' :
                            item.estado_salud === 'DEMANDA_REPRIMIDA' ? 'rgba(234, 179, 8, 0.2)' :
                            item.estado_salud === 'SOBRESTOCK' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                          color:
                            item.estado_salud === 'RIESGO_QUIEBRE' ? '#f87171' :
                            item.estado_salud === 'DEMANDA_REPRIMIDA' ? '#fde047' :
                            item.estado_salud === 'SOBRESTOCK' ? '#60a5fa' : '#4ade80'
                        }}>
                          {item.estado_salud === 'RIESGO_QUIEBRE' ? '🔴 RIESGO QUIEBRE' :
                           item.estado_salud === 'DEMANDA_REPRIMIDA' ? '🟡 DEMANDA REPRIMIDA' :
                           item.estado_salud === 'SOBRESTOCK' ? '🔵 SOBRESTOCK' : '🟢 SALUDABLE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUGERIDO DE ÓRDENES DE COMPRA */}
      {tab === 'sugerido' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={20} color="#60a5fa" /> Calculadora de Sugerido de Órdenes de Compra
              </h3>
              <p className="text-sub" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                Calcula automáticamente las unidades requeridas descontando Stock Actual, Tránsito y Producción.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cobertura Deseada:</span>
              {[60, 90, 120, 180].map((dias) => (
                <button
                  key={dias}
                  onClick={() => setDesiredCoverageDays(dias)}
                  style={{
                    backgroundColor: desiredCoverageDays === dias ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    color: desiredCoverageDays === dias ? '#fff' : 'var(--text-secondary)',
                    border: desiredCoverageDays === dias ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {dias} Días ({Math.round(dias/30)} meses)
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '1rem', width: '50px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '1rem' }}>Código / Descripción</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Stock Actual</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>En Tránsito</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>En Producción</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Velocidad Ajustada</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Demanda {desiredCoverageDays}d</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Sugerido de Compra (Unid)</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No hay repuestos en el listado para calcular sugerido.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const demanda = item.velocidad_ajustada * desiredCoverageDays;
                    const disp = item.stock_actual + item.pendiente_transito + item.pendiente_produccion;
                    const sug = Math.max(0, Math.ceil(demanda - disp));

                    return (
                      <tr key={`${item.codart}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <Link href={`/productos/${encodeURIComponent(item.codart)}`} style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'none' }}>
                            {item.codart}
                          </Link>
                          <div style={{ color: '#fff', fontSize: '0.85rem' }}>{item.nomart}</div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                          {item.stock_actual}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: '#60a5fa' }}>
                          {item.pendiente_transito > 0 ? `+${item.pendiente_transito}` : '0'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: '#fde047' }}>
                          {item.pendiente_produccion > 0 ? `+${item.pendiente_produccion}` : '0'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#60a5fa' }}>
                          {item.velocidad_ajustada} u/d
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {Math.round(demanda)} unid
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: sug > 0 ? '#4ade80' : 'var(--text-secondary)', fontSize: '1.05rem', fontFamily: 'var(--font-geist-mono)' }}>
                          {sug > 0 ? `${sug.toLocaleString()} UNID` : '✓ Abastecido'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SALUD POR GRUPO / FAMILIA */}
      {tab === 'grupos' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} color="var(--accent-primary)" /> Salud de Inventario por Familia de Repuestos
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '1rem', width: '50px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '1rem' }}>Código Grupo</th>
                  <th style={{ padding: '1rem' }}>Familia / Nombre</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Total Ítems</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Capital Inmovilizado ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Ítems en Quiebre</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Ítems Sobre-stock</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Venta Perdida ($)</th>
                </tr>
              </thead>
              <tbody>
                {grupos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No hay familias para mostrar.
                    </td>
                  </tr>
                ) : (
                  grupos.map((g, idx) => (
                    <tr key={`${g.grupo}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {g.grupo}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {g.nomgrupo}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                          {g.total_items} ítems
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        ${g.monto_inventario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: g.items_quiebre > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                        {g.items_quiebre}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: g.items_sobrestock > 0 ? '#60a5fa' : 'var(--text-secondary)' }}>
                        {g.items_sobrestock}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: g.venta_perdida_grupo > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                        ${g.venta_perdida_grupo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
