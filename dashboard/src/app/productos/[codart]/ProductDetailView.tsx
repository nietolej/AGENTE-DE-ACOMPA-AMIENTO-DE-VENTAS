'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
  Package, DollarSign, ArrowLeft, RefreshCw, ShoppingCart, Percent,
  AlertTriangle, Truck, Factory, Users, Calendar, TrendingUp, Download, Building2, BarChart2
} from 'lucide-react';
import { ProductDetail, ProductCompareData, ProductWarehouseStock } from '@/lib/types';
import { KpiCard } from '@/components/ui/KpiCard';
import ProductCompareView from './ProductCompareView';

interface Props {
  data: ProductDetail;
  selectedYear: string;
  tab: string;
  yearA: string;
  yearB: string;
  compareData: ProductCompareData | null;
  warehouseStock: ProductWarehouseStock[];
}

export default function ProductDetailView({
  data,
  selectedYear,
  tab,
  yearA,
  yearB,
  compareData,
  warehouseStock
}: Props) {
  const router = useRouter();

  const handleYearChange = (newYear: string) => {
    const encodedCod = encodeURIComponent(data.codart);
    router.push(`/productos/${encodedCod}?tab=${tab}&year=${newYear}`);
  };

  const handleTabChange = (newTab: string) => {
    const encodedCod = encodeURIComponent(data.codart);
    router.push(`/productos/${encodedCod}?tab=${newTab}&year=${selectedYear}&yearA=${yearA}&yearB=${yearB}`);
  };

  const exportCSV = () => {
    const headers = [
      'Codigo', 'Descripcion', 'Grupo', 'Marca', 'Precio_A', 'VentaTotal_USD', 'UnidadesVendidas',
      'NumPedidos', 'Devoluciones_USD', 'StockActual', 'DiasInventario', 'TasaDevolucionPct'
    ];
    const row = [
      data.codart,
      `"${data.nomart.replace(/"/g, '""')}"`,
      data.grupo,
      data.marca,
      data.precio_a,
      data.monto_vendido,
      data.cantidad_vendida,
      data.num_pedidos,
      data.monto_devuelto,
      data.stock_actual,
      data.dias_inventario,
      data.pct_monto_devo
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ficha_Producto_${data.codart}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Nivel de salud de inventario
  let inventoryHealth = { label: 'Stock Normal', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)' };
  if (data.stock_actual <= 0) {
    inventoryHealth = { label: 'Agotado (Sin Stock)', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' };
  } else if (data.dias_inventario < 15) {
    inventoryHealth = { label: 'Riesgo Quiebre (< 15 días)', color: '#fde047', bg: 'rgba(234, 179, 8, 0.15)' };
  } else if (data.dias_inventario > 180) {
    inventoryHealth = { label: 'Sobre-stock (> 6 meses)', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Botón Volver y Header de Producto */}
      <div>
        <Link
          href="/productos"
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
          <ArrowLeft size={16} /> Volver al Catálogo de Productos
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
                {data.codart}
              </span>
              {data.grupo && (
                <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  Grupo: {data.grupo}
                </span>
              )}
              {data.marca && (
                <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  Marca: {data.marca}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              {data.nomart}
            </h1>
            <p className="text-sub" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Última venta registrada: <strong style={{ color: '#fff' }}>{data.ultima_venta}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Precios de Lista */}
            <div style={{ display: 'flex', gap: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Precio A</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-geist-mono)' }}>
                  ${data.precio_a.toFixed(2)}
                </div>
              </div>
              {data.precio_b > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Precio B</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-geist-mono)' }}>
                    ${data.precio_b.toFixed(2)}
                  </div>
                </div>
              )}
              {data.precio_d > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Precio D</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-geist-mono)' }}>
                    ${data.precio_d.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Botón Exportar CSV */}
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
      </div>

      {/* Tabs de Navegación de la Ficha */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', gap: '0.5rem' }}>
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
          onClick={() => handleTabChange('almacenes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: tab === 'almacenes' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: tab === 'almacenes' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: tab === 'almacenes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            fontWeight: tab === 'almacenes' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <Building2 size={16} /> Stock por Almacén ({warehouseStock.length})
        </button>
      </div>

      {/* RENDER TAB 1: VISTA ANUAL / GENERAL */}
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
              value={`$${data.monto_vendido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<DollarSign size={20} color="var(--accent-primary)" />}
            />
            <KpiCard
              title="Unidades Vendidas"
              value={data.cantidad_vendida.toLocaleString()}
              icon={<Package size={20} color="#60a5fa" />}
            />
            <KpiCard
              title="Pedidos / Facturas"
              value={data.num_pedidos}
              icon={<ShoppingCart size={20} color="#00C49F" />}
            />
            <KpiCard
              title="Stock Actual Disponible"
              value={`${data.stock_actual} unid.`}
              icon={<RefreshCw size={20} color={inventoryHealth.color} />}
              valueColor={inventoryHealth.color}
            />
            <KpiCard
              title="Días de Inventario"
              value={data.dias_inventario >= 999 ? 'Sin consumo' : `${data.dias_inventario} días`}
              icon={<Calendar size={20} color="#FFBB28" />}
            />
            <KpiCard
              title="Tasa Devolución ($)"
              value={`${data.pct_monto_devo.toFixed(1)}%`}
              icon={<Percent size={20} color={data.pct_monto_devo > 5 ? '#f87171' : '#4ade80'} />}
              valueColor={data.pct_monto_devo > 5 ? '#f87171' : '#4ade80'}
            />
          </div>

          {/* Gráfico de Tendencia Mensual y Panel de Rotación */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="var(--accent-primary)" /> Tendencia de Ventas Mensuales ($)
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Año: {selectedYear}</span>
              </div>

              {data.ventas_mensuales.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No hay movimientos de venta registrados en el período seleccionado.
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
                      <Bar dataKey="monto" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Venta ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
                <RefreshCw size={18} color="#FFBB28" /> Análisis de Rotación e Inventario
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', backgroundColor: inventoryHealth.bg, border: `1px solid ${inventoryHealth.color}` }}>
                <span style={{ fontWeight: 600, color: inventoryHealth.color }}>Estado de Inventario:</span>
                <span style={{ fontWeight: 700, color: inventoryHealth.color }}>{inventoryHealth.label}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Velocidad Diaria de Venta</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem' }}>
                    {data.velocidad_diaria} <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>unid/día</span>
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meses de Inventario</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', color: '#FFBB28' }}>
                    {data.meses_inventario >= 99 ? 'N/A' : `${data.meses_inventario} meses`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Truck size={18} color="#60a5fa" />
                    <span>Mercancía en Tránsito (Pend. por llegar)</span>
                  </div>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-geist-mono)' }}>
                    {data.pendiente_transito} unid.
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Factory size={18} color="#a288fe" />
                    <span>En Orden de Producción</span>
                  </div>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-geist-mono)' }}>
                    {data.pendiente_produccion} unid.
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} color={data.monto_devuelto > 0 ? '#f87171' : 'var(--text-secondary)'} />
                    <span>Devoluciones en Período</span>
                  </div>
                  <span style={{ fontWeight: 700, color: data.monto_devuelto > 0 ? '#f87171' : '#fff' }}>
                    ${data.monto_devuelto.toLocaleString()} ({data.cantidad_devuelta} unid.)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top 50 Clientes Compradores */}
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="var(--accent-primary)" /> Top 50 Clientes Compradores de este Producto
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Mostrando {data.top_clientes.length} clientes principales
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '1rem', width: '60px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '1rem' }}>Código Cliente</th>
                    <th style={{ padding: '1rem' }}>Nombre / Razón Social</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Unidades Compradas</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Monto Comprado ($)</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Facturas / Compras</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_clientes.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No hay registros de ventas a clientes para este producto en el período.
                      </td>
                    </tr>
                  ) : (
                    data.top_clientes.map((c, idx) => (
                      <tr
                        key={`${c.codcli}-${idx}`}
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                      >
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 600 }}>
                          <Link href={`/clientes/${c.codcli}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                            {c.codcli}
                          </Link>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 500 }}>
                          <Link href={`/clientes/${c.codcli}`} style={{ color: '#fff', textDecoration: 'none' }}>
                            {c.nomcli}
                          </Link>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                          {c.cantidad_comprada.toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          ${c.monto_comprado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                            {c.num_compras} compras
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <Link
                            href={`/clientes/${c.codcli}`}
                            style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                          >
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
        </>
      )}

      {/* RENDER TAB 2: COMPARATIVA MULTIANUAL */}
      {tab === 'compare' && compareData && (
        <ProductCompareView data={compareData} yearA={yearA} yearB={yearB} />
      )}

      {/* RENDER TAB 3: STOCK POR ALMACÉN */}
      {tab === 'almacenes' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="var(--accent-primary)" /> Distribución de Existencias por Almacén
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {warehouseStock.map((w, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Código Almacén: <strong style={{ color: '#fff' }}>{w.almacen}</strong>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{w.nomalm}</div>
                  <div style={{ fontSize: '0.75rem', color: w.es_vendible ? '#4ade80' : '#f87171', marginTop: '0.25rem' }}>
                    {w.es_vendible ? '✓ Almacén Apto para Venta' : '⚠️ No Vendible (Garantía/Tránsito)'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-geist-mono)' }}>
                    {w.stock}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>unidades</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
