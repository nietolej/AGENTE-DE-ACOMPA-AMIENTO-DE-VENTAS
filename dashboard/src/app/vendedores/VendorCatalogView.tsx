'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, Filter, ArrowUpDown, Download, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { VendorListItem } from '@/lib/types';

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
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '1rem', width: '60px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '1rem' }}>Código</th>
                <th style={{ padding: '1rem' }}>Asesor Comercial</th>
                <th style={{ padding: '1rem' }}>Contacto / Teléfono</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Clientes</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Cobertura</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Conc. Top 3</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Facturas</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Venta Total ($)</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Devoluciones (%)</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Cumplimiento Meta</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No se encontraron vendedores que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                vendedores.map((v, idx) => {
                  const encodedCod = encodeURIComponent(v.codvend);
                  return (
                    <tr
                      key={`${v.codvend}-${idx}`}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        opacity: v.is_administrative ? 0.7 : 1,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'var(--font-geist-mono)', fontWeight: 600 }}>
                        <Link href={`/vendedores/${encodedCod}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {v.codvend}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        <Link href={`/vendedores/${encodedCod}`} style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{v.nomvend}</span>
                          {v.is_administrative && (
                            <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              ADMINISTRATIVO
                            </span>
                          )}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {v.tlf1 || v.email || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                          {v.clientes_atendidos} clientes
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          color: v.cobertura_cartera > 50 ? '#4ade80' : '#fde047',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}>
                          {v.cobertura_cartera}%
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          color: v.concentracion_top3 > 60 ? '#f87171' : 'var(--text-secondary)',
                          fontWeight: v.concentracion_top3 > 60 ? 700 : 400,
                          fontSize: '0.85rem'
                        }}>
                          {v.concentracion_top3}%
                        </span>
                      </td>

                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>
                        {v.cant_facturas}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        ${v.venta_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <span style={{
                          color: v.pct_devoluciones > 5 ? '#f87171' : 'var(--text-secondary)',
                          fontWeight: v.pct_devoluciones > 5 ? 700 : 400
                        }}>
                          {v.pct_devoluciones.toFixed(1)}% (${v.devoluciones_monto.toLocaleString()})
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          backgroundColor: v.pct_cumplimiento >= 100 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: v.pct_cumplimiento >= 100 ? '#4ade80' : '#fde047',
                          border: v.pct_cumplimiento >= 100 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)'
                        }}>
                          {v.pct_cumplimiento.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <Link
                          href={`/vendedores/${encodedCod}`}
                          style={{
                            display: 'inline-block',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          Ver Ficha →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
