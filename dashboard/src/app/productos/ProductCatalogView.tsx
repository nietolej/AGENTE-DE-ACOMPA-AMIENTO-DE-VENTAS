'use client';

import React, { useState } from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Search, ArrowUpDown, Filter, Download, Layers, List } from 'lucide-react';
import { ProductListItem, ProductGroupSummary } from '@/lib/types';

interface Props {
  productos: ProductListItem[];
  grupos: ProductGroupSummary[];
  selectedYear: string;
  searchTerm: string;
  orderBy: 'monto' | 'cantidad' | 'stock';
  tab: string;
}

export default function ProductCatalogView({
  productos,
  grupos,
  selectedYear,
  searchTerm,
  orderBy,
  tab
}: Props) {
  const router = useRouter();

  const handleTabChange = (newTab: string) => {
    router.push(`/productos?tab=${newTab}&year=${selectedYear}&search=${encodeURIComponent(searchTerm)}&orderBy=${orderBy}`);
  };

  const exportCatalogCSV = () => {
    const headers = ['Codigo', 'Descripcion', 'Grupo', 'Marca', 'Precio_A', 'StockActual', 'UnidadesVendidas', 'VentaTotal_USD', 'Devoluciones_USD', 'UltimaVenta'];
    const rows = productos.map(p => [
      p.codart,
      `"${p.nomart.replace(/"/g, '""')}"`,
      p.grupo,
      p.marca,
      p.precio_a,
      p.stock_actual,
      p.cantidad_vendida,
      p.monto_vendido,
      p.devoluciones_monto,
      p.ultima_venta
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Catalogo_Productos_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs del catálogo
  const totalProductos = productos.length;
  const totalMontoVendido = productos.reduce((acc, p) => acc + p.monto_vendido, 0);
  const totalCantidadVendida = productos.reduce((acc, p) => acc + p.cantidad_vendida, 0);
  const productoEstrella = productos.length > 0 ? productos[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header KPI Cards */}
      <div className="grid-dashboard">
        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Productos en Catálogo
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {totalProductos} <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>ítems</span>
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Venta Total acumulada
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            ${totalMontoVendido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Unidades Vendidas
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {totalCantidadVendida.toLocaleString('en-US')} <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>unid.</span>
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Producto Líder en Ventas
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {productoEstrella ? productoEstrella.nomart : 'N/A'}
          </div>
          {productoEstrella && (
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginTop: '0.25rem' }}>
              ${productoEstrella.monto_vendido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({productoEstrella.cantidad_vendida.toLocaleString('en-US')} unid.)
            </div>
          )}
        </div>
      </div>

      {/* Tabs de Selección entre Catálogo General y Grupos */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handleTabChange('items')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: tab === 'items' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tab === 'items' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderBottom: tab === 'items' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: tab === 'items' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <List size={16} /> Catálogo de Artículos
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
            <Layers size={16} /> Análisis por Grupos / Familias ({grupos.length})
          </button>
        </div>

        <button
          onClick={exportCatalogCSV}
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
            cursor: 'pointer',
            marginBottom: '0.5rem'
          }}
        >
          <Download size={16} /> Exportar Catálogo CSV
        </button>
      </div>

      {/* TAB 1: CATÁLOGO DE ARTÍCULOS */}
      {tab === 'items' && (
        <>
          {/* Bar de Filtros y Búsqueda */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <form method="GET" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <input type="hidden" name="tab" value="items" />
              
              <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Search size={18} style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }} />
                <input
                  type="text"
                  name="search"
                  defaultValue={searchTerm}
                  placeholder="Buscar por código, nombre, grupo o marca..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    width: '100%',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
                <select
                  name="year"
                  defaultValue={selectedYear}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="todos" style={{ background: '#111' }}>Todos los Años</option>
                  <option value="2026" style={{ background: '#111' }}>Año 2026</option>
                  <option value="2025" style={{ background: '#111' }}>Año 2025</option>
                  <option value="2024" style={{ background: '#111' }}>Año 2024</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowUpDown size={16} style={{ color: 'var(--text-secondary)' }} />
                <select
                  name="orderBy"
                  defaultValue={orderBy}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="monto" style={{ background: '#111' }}>Ordenar por Venta ($)</option>
                  <option value="cantidad" style={{ background: '#111' }}>Ordenar por Cantidad Vendida</option>
                  <option value="stock" style={{ background: '#111' }}>Ordenar por Stock Actual</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Filtrar
              </button>
            </form>
          </div>

          {/* Tabla Catálogo de Productos */}
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción del Producto</TableHead>
                    <TableHead>Grupo / Marca</TableHead>
                    <TableHead className="text-right">Precio A</TableHead>
                    <TableHead className="text-right">Stock Actual</TableHead>
                    <TableHead className="text-right">Unid. Vendidas</TableHead>
                    <TableHead className="text-right">Monto Vendido ($)</TableHead>
                    <TableHead className="text-right">Devoluciones ($)</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No se encontraron productos que coincidan con la búsqueda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    productos.map((prod, idx) => {
                      const encodedCod = encodeURIComponent(prod.codart);
                      return (
                        <TableRow key={`${prod.codart}-${idx}`}>
                          <TableCell className="font-mono font-medium">
                            <Link href={`/productos/${encodedCod}`} className="text-primary hover:underline">
                              {prod.codart}
                            </Link>
                          </TableCell>
                          <TableCell className="font-medium max-w-[280px]">
                            <Link href={`/productos/${encodedCod}`} className="hover:underline">
                              {prod.nomart}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {prod.grupo || 'GENÉRICO'} {prod.marca ? `• ${prod.marca}` : ''}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${prod.precio_a.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${prod.stock_actual > 20 ? 'bg-emerald-500/10 text-emerald-500' : prod.stock_actual > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-destructive/10 text-destructive'}`}>
                              {prod.stock_actual} unid.
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {prod.cantidad_vendida.toLocaleString('en-US')}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            ${prod.monto_vendido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={`text-right ${prod.devoluciones_monto > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {prod.devoluciones_monto > 0 ? `$${prod.devoluciones_monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Link
                              href={`/productos/${encodedCod}`}
                              className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-8 px-3"
                            >
                              Ver Ficha →
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: ANÁLISIS POR GRUPOS / FAMILIAS */}
      {tab === 'grupos' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} color="var(--accent-primary)" /> Resumen de Ventas por Grupo / Familia de Repuestos
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '1rem', width: '60px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '1rem' }}>Código Grupo</th>
                  <th style={{ padding: '1rem' }}>Nombre de la Familia</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Total Ítems</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Unid. Vendidas</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Venta Total ($)</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Devoluciones ($)</th>
                  <th style={{ padding: '1rem' }}>Producto Líder de la Familia</th>
                </tr>
              </thead>
              <tbody>
                {grupos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No hay datos de grupos disponibles.
                    </td>
                  </tr>
                ) : (
                  grupos.map((g, idx) => (
                    <tr key={`${g.grupo}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 600, color: '#60a5fa' }}>
                        {g.grupo}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {g.nomgrupo}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                          {g.total_articulos} artículos
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                        {g.cantidad_vendida.toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        ${g.monto_vendido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: g.devoluciones_monto > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                        {g.devoluciones_monto > 0 ? `$${g.devoluciones_monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                        {g.producto_lider}
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
