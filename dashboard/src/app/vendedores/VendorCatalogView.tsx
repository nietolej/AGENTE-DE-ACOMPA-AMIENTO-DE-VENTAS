'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, Filter, ArrowUpDown, Download, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { VendorListItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  vendedores: VendorListItem[];
  selectedYear: string;
  searchTerm: string;
  orderBy: 'monto' | 'pedidos' | 'clientes';
  incluirAdministrativos: boolean;
}

export default function VendorCatalogView({
  vendedores,
  selectedYear,
  searchTerm,
  orderBy,
  incluirAdministrativos
}: Props) {
  const router = useRouter();

  const handleToggleAdmin = (val: boolean) => {
    router.push(`/vendedores?year=${selectedYear}&search=${encodeURIComponent(searchTerm)}&orderBy=${orderBy}&admin=${val}`);
  };

  const exportVendorCSV = () => {
    const headers = [
      'CodVendedor', 'NombreVendedor', 'Email', 'Telefono', 'CIF',
      'VentaTotal_USD', 'CantFacturas', 'ClientesAtendidos', 'Devoluciones_USD', 'PctDevoluciones', 'PctCumplimiento'
    ];
    const rows = vendedores.map(v => [
      v.codvend,
      `"${v.nomvend.replace(/"/g, '""')}"`,
      v.email,
      v.tlf1,
      v.cif,
      v.venta_total,
      v.cant_facturas,
      v.clientes_atendidos,
      v.devoluciones_monto,
      v.pct_devoluciones,
      v.pct_cumplimiento
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ranking_Vendedores_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs
  const totalVendedores = vendedores.length;
  const totalVentaFuerza = vendedores.reduce((acc, v) => acc + v.venta_total, 0);
  const totalFacturas = vendedores.reduce((acc, v) => acc + v.cant_facturas, 0);
  const promedioPorAsesor = totalVendedores > 0 ? totalVentaFuerza / totalVendedores : 0;
  const vendedorLider = vendedores.length > 0 ? vendedores[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header KPI Cards */}
      <div className="grid-dashboard">
        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Asesores en Ranking
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {totalVendedores} <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>vendedores</span>
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Venta Total Fuerza de Ventas
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            ${totalVentaFuerza.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Promedio Venta por Asesor
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#60a5fa' }}>
            ${promedioPorAsesor.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Asesor Líder Comercial
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {vendedorLider ? vendedorLider.nomvend : 'N/A'}
          </div>
          {vendedorLider && (
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginTop: '0.25rem' }}>
              ${vendedorLider.venta_total.toLocaleString()} ({vendedorLider.clientes_atendidos} clientes)
            </div>
          )}
        </div>
      </div>

      {/* Bar de Filtros y Búsqueda */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <form method="GET" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', flex: 1 }}>
            <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Search size={18} style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }} />
              <input
                type="text"
                name="search"
                defaultValue={searchTerm}
                placeholder="Buscar por código, nombre, email..."
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
                <option value="pedidos" style={{ background: '#111' }}>Ordenar por Facturas</option>
                <option value="clientes" style={{ background: '#111' }}>Ordenar por Clientes</option>
              </select>
            </div>

            {/* Checkbox para códigos administrativos */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                name="admin"
                value="true"
                defaultChecked={incluirAdministrativos}
                onChange={(e) => handleToggleAdmin(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Incluir Administrativos / Inactivos (00, C3-C9)</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
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

            <button
              type="button"
              onClick={exportVendorCSV}
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
              <Download size={16} /> CSV
            </button>
          </div>
        </form>
      </div>

      {/* Tabla Ranking de Fuerza de Ventas */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">#</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Asesor Comercial</TableHead>
                <TableHead>Contacto / Teléfono</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-center">Cobertura</TableHead>
                <TableHead className="text-center">Conc. Top 3</TableHead>
                <TableHead className="text-center">Facturas</TableHead>
                <TableHead className="text-right">Venta Total ($)</TableHead>
                <TableHead className="text-right">Devoluciones (%)</TableHead>
                <TableHead className="text-center">Cumplimiento Meta</TableHead>
                <TableHead className="text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center p-12 text-muted-foreground">
                    No se encontraron vendedores que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                vendedores.map((v, idx) => {
                  const encodedCod = encodeURIComponent(v.codvend);
                  return (
                    <TableRow
                      key={`${v.codvend}-${idx}`}
                      style={{
                        opacity: v.is_administrative ? 0.7 : 1,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        <Link href={`/vendedores/${encodedCod}`} className="text-primary hover:underline">
                          {v.codvend}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <Link href={`/vendedores/${encodedCod}`} className="flex items-center gap-2 hover:underline">
                          <span>{v.nomvend}</span>
                          {v.is_administrative && (
                            <span className="text-[0.7rem] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                              ADMINISTRATIVO
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {v.tlf1 || v.email || 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="bg-white/5 px-2 py-0.5 rounded-full text-xs">
                          {v.clientes_atendidos} clientes
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={v.cobertura_cartera > 50 ? 'text-green-400 font-semibold' : 'text-yellow-400 font-semibold'}>
                          {v.cobertura_cartera}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={v.concentracion_top3 > 60 ? 'text-red-400 font-bold' : 'text-muted-foreground'}>
                          {v.concentracion_top3}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {v.cant_facturas}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        ${v.venta_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={v.pct_devoluciones > 5 ? 'text-red-400 font-bold' : 'text-muted-foreground'}>
                          {v.pct_devoluciones.toFixed(1)}% (${v.devoluciones_monto.toLocaleString()})
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${v.pct_cumplimiento >= 100 ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'}`}>
                          {v.pct_cumplimiento.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Link
                          href={`/vendedores/${encodedCod}`}
                          className="inline-block bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
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
    </div>
  );
}
