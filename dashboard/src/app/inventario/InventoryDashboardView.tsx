'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackageSearch, TrendingUp, AlertCircle, CheckCircle2, ShieldAlert, AlertTriangle, Download, Filter, Search, ArrowUpDown, RefreshCw, ShoppingCart, Layers } from 'lucide-react';
import {
  InventoryIntelligenceKPIs, InventoryItemIntelligence, InventoryGroupHealth, InventoryValuationData
} from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KpiCard } from '@/components/ui/KpiCard';

interface Props {
  kpis: InventoryIntelligenceKPIs;
  items: InventoryItemIntelligence[];
  grupos: InventoryGroupHealth[];
  valorizacion_mensual: InventoryValuationData[];
  selectedYear: string;
  tab: string;
  search: string;
  filterState: string;
  limit: string;
}

export default function InventoryDashboardView({
  kpis,
  items,
  grupos,
  valorizacion_mensual,
  selectedYear,
  tab,
  search: initialSearch,
  filterState: initialFilterState,
  limit: initialLimit
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [filterState, setFilterState] = useState(initialFilterState);
  const [limitState, setLimitState] = useState(initialLimit);
  const [desiredCoverageDays, setDesiredCoverageDays] = useState<number>(90);
  const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryItemIntelligence | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const requestSort = (key: keyof InventoryItemIntelligence) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = React.useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/inventario?year=${selectedYear}&tab=${tab}&search=${encodeURIComponent(search)}&state=${encodeURIComponent(filterState)}&limit=${encodeURIComponent(limitState)}`);
  };

  const handleFilterStateChange = (newState: string) => {
    setFilterState(newState);
    router.push(`/inventario?year=${selectedYear}&tab=${tab}&search=${encodeURIComponent(search)}&state=${encodeURIComponent(newState)}&limit=${encodeURIComponent(limitState)}`);
  };

  const handleLimitChange = (newLimit: string) => {
    setLimitState(newLimit);
    router.push(`/inventario?year=${selectedYear}&tab=${tab}&search=${encodeURIComponent(search)}&state=${encodeURIComponent(filterState)}&limit=${encodeURIComponent(newLimit)}`);
  };

  const handleYearChange = (yr: string) => {
    if (yr === 'todos') {
      router.push(`/inventario?tab=${tab}&year=todos&search=${encodeURIComponent(search)}&state=${encodeURIComponent(filterState)}&limit=${encodeURIComponent(limitState)}`);
      return;
    }
    
    let currentYears = selectedYear.split(',').filter(y => y !== 'todos' && y !== '');
    if (currentYears.includes(yr)) {
      currentYears = currentYears.filter(y => y !== yr);
    } else {
      currentYears.push(yr);
    }
    
    const newYear = currentYears.length > 0 ? currentYears.join(',') : 'todos';
    router.push(`/inventario?tab=${tab}&year=${newYear}&search=${encodeURIComponent(search)}&state=${encodeURIComponent(filterState)}&limit=${encodeURIComponent(limitState)}`);
  };

  const handleTabChange = (newTab: string) => {
    router.push(`/inventario?tab=${newTab}&year=${selectedYear}&search=${encodeURIComponent(search)}&state=${encodeURIComponent(filterState)}&limit=${encodeURIComponent(limitState)}`);
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
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '300px' }}>
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
            <option value="STOCK_CERO" style={{ backgroundColor: '#18181b' }}>⭕ Solo Stock Cero</option>
            <option value="RIESGO_QUIEBRE" style={{ backgroundColor: '#18181b' }}>🔴 Riesgo de Quiebre</option>
            <option value="DEMANDA_REPRIMIDA" style={{ backgroundColor: '#18181b' }}>🟡 Demanda Reprimida</option>
            <option value="SOBRESTOCK" style={{ backgroundColor: '#18181b' }}>🔵 Sobre-stock (&gt;6 mes)</option>
            <option value="SALUDABLE" style={{ backgroundColor: '#18181b' }}>🟢 Saludables</option>
          </select>

          <select
            value={limitState}
            onChange={(e) => handleLimitChange(e.target.value)}
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
            <option value="50" style={{ backgroundColor: '#18181b' }}>Mostrar 50 repuestos</option>
            <option value="100" style={{ backgroundColor: '#18181b' }}>Mostrar 100 repuestos</option>
            <option value="150" style={{ backgroundColor: '#18181b' }}>Mostrar 150 repuestos</option>
            <option value="200" style={{ backgroundColor: '#18181b' }}>Mostrar 200 repuestos</option>
            <option value="500" style={{ backgroundColor: '#18181b' }}>Mostrar 500 repuestos</option>
            <option value="todos" style={{ backgroundColor: '#18181b' }}>Mostrar TODOS los repuestos</option>
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

      {/* Gráfico de Valorización Mensual */}
      {valorizacion_mensual && valorizacion_mensual.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '0.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Valorización del Inventario por Mes (Histórico)
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valorizacion_mensual} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                  formatter={(value: any, name: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="almacen01" stackId="a" fill="var(--accent-primary)" name="Almacén 01" />
                <Bar dataKey="almacen03" stackId="a" fill="#10b981" name="Almacén 03" />
                <Bar dataKey="almacen06" stackId="a" fill="#f59e0b" name="Almacén 06" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
          {['todos', '2026', '2025', '2024', '2023'].map((yr) => {
            const isSelected = yr === 'todos' ? selectedYear === 'todos' : selectedYear.split(',').includes(yr);
            return (
              <button
                key={yr}
                onClick={() => handleYearChange(yr)}
                style={{
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.35rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {yr === 'todos' ? 'Todos' : yr}
              </button>
            );
          })}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => requestSort('nomart')}>Código / Descripción{sortConfig.key === 'nomart' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => requestSort('grupo')}>Grupo{sortConfig.key === 'grupo' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('stock_actual')}>Stock Actual{sortConfig.key === 'stock_actual' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => requestSort('dias_con_stock')}>Días con Stock (DIS){sortConfig.key === 'dias_con_stock' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('velocidad_basica')}>Vel. Básica{sortConfig.key === 'velocidad_basica' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('velocidad_ajustada')}>Vel. Real Ajustada{sortConfig.key === 'velocidad_ajustada' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => requestSort('meses_cobertura_real')}>Cobertura Real{sortConfig.key === 'meses_cobertura_real' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('venta_perdida_estimada')}>Venta Perdida ($){sortConfig.key === 'venta_perdida_estimada' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => requestSort('estado_salud')}>Estado Salud{sortConfig.key === 'estado_salud' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center p-12 text-muted-foreground">
                      No se encontraron repuestos con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((item, idx) => (
                    <TableRow key={`${item.codart}-${idx}`}>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Link href={`/productos/${encodeURIComponent(item.codart)}`} className="text-primary font-bold hover:underline">
                          {item.codart}
                        </Link>
                        <div className="text-foreground text-[0.85rem] font-medium">{item.nomart}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.grupo}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${item.stock_actual <= 0 ? 'text-red-400' : 'text-foreground'}`}>
                        {item.stock_actual.toLocaleString('en-US')}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
                          {item.dias_con_stock}d / {item.dias_periodo_total}d ({item.pct_disponibilidad}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.velocidad_basica} u/d
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-blue-400 font-mono">
                        {item.velocidad_ajustada} u/d
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${item.meses_cobertura_real < 0.5 ? 'text-red-400' : item.meses_cobertura_real > 6 ? 'text-blue-400' : 'text-green-400'}`}>
                          {item.meses_cobertura_real} mes({item.dias_cobertura_real}d)
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${item.venta_perdida_estimada > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        ${item.venta_perdida_estimada.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${
                          item.estado_salud === 'RIESGO_QUIEBRE' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          item.estado_salud === 'DEMANDA_REPRIMIDA' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          item.estado_salud === 'SOBRESTOCK' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-green-500/15 text-green-400 border-green-500/30'
                        }`}>
                          {item.estado_salud === 'RIESGO_QUIEBRE' ? '🔴 RIESGO QUIEBRE' :
                           item.estado_salud === 'DEMANDA_REPRIMIDA' ? '🟡 DEMANDA REPRIMIDA' :
                           item.estado_salud === 'SOBRESTOCK' ? '🔵 SOBRESTOCK' : '🟢 SALUDABLE'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
              
              {/* Input editable para días personalizados */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
                <input 
                  type="number" 
                  min="1"
                  value={desiredCoverageDays || ''}
                  onChange={(e) => setDesiredCoverageDays(parseInt(e.target.value) || 0)}
                  style={{
                    width: '50px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Días</span>
              </div>

              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 0.25rem' }}></div>

              {/* Botones de acceso rápido */}
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
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {dias}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => requestSort('nomart')}>Código / Descripción{sortConfig.key === 'nomart' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('stock_actual')}>Stock Actual{sortConfig.key === 'stock_actual' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('pendiente_transito')}>En Tránsito{sortConfig.key === 'pendiente_transito' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('pendiente_produccion')}>En Producción{sortConfig.key === 'pendiente_produccion' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('velocidad_ajustada')}>Velocidad Ajustada{sortConfig.key === 'velocidad_ajustada' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('velocidad_ajustada')}>Demanda {desiredCoverageDays}d{sortConfig.key === 'velocidad_ajustada' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => requestSort('sugerido_compra_90d')}>Sugerido de Compra (Unid){sortConfig.key === 'sugerido_compra_90d' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center p-12 text-muted-foreground">
                      No hay repuestos en el listado para calcular sugerido.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((item, idx) => {
                    const demanda = item.velocidad_ajustada * desiredCoverageDays;
                    const disp = item.stock_actual + item.pendiente_transito + item.pendiente_produccion;
                    const sug = Math.max(0, Math.ceil(demanda - disp));

                    return (
                      <TableRow key={`${item.codart}-${idx}`}>
                        <TableCell className="text-center font-bold text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <Link href={`/productos/${encodeURIComponent(item.codart)}`} className="text-primary font-bold hover:underline">
                            {item.codart}
                          </Link>
                          <div className="text-foreground text-[0.85rem]">{item.nomart}</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.stock_actual}
                        </TableCell>
                        <TableCell className="text-right text-blue-400">
                          {item.pendiente_transito > 0 ? `+${item.pendiente_transito}` : '0'}
                        </TableCell>
                        <TableCell className="text-right text-yellow-400">
                          {item.pendiente_produccion > 0 ? `+${item.pendiente_produccion}` : '0'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-400">
                          {item.velocidad_ajustada} u/d
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {Math.round(demanda)} unid
                        </TableCell>
                        <TableCell className={`text-right font-extrabold font-mono text-[1.05rem] ${sug > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                          <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${sug > 0 ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-muted-foreground'}`}>
                            {sug > 0 ? `${sug.toLocaleString('en-US')} UNID` : '✓ Abastecido'}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead>Código Grupo</TableHead>
                  <TableHead>Familia / Nombre</TableHead>
                  <TableHead className="text-center">Total Ítems</TableHead>
                  <TableHead className="text-right">Capital Inmovilizado ($)</TableHead>
                  <TableHead className="text-center">Ítems en Quiebre</TableHead>
                  <TableHead className="text-center">Ítems Sobre-stock</TableHead>
                  <TableHead className="text-right">Venta Perdida ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center p-12 text-muted-foreground">
                      No hay familias para mostrar.
                    </TableCell>
                  </TableRow>
                ) : (
                  grupos.map((g, idx) => (
                    <TableRow key={`${g.grupo}-${idx}`}>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-primary">
                        {g.grupo}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {g.nomgrupo}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">
                          {g.total_items} ítems
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        ${g.monto_inventario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-center font-bold ${g.items_quiebre > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {g.items_quiebre}
                      </TableCell>
                      <TableCell className={`text-center font-bold ${g.items_sobrestock > 0 ? 'text-blue-400' : 'text-muted-foreground'}`}>
                        {g.items_sobrestock}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${g.venta_perdida_grupo > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        ${g.venta_perdida_grupo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
