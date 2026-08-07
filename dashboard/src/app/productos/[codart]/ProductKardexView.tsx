'use client';

import React, { useState, useMemo } from 'react';
import { ProductKardexRow, formatDateDisplay } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, ListFilter, Download } from 'lucide-react';

interface Props {
  data: ProductKardexRow[];
}

export default function ProductKardexView({ data }: Props) {
  const [almacenFilter, setAlmacenFilter] = useState<string>('todos');

  const almacenesUnicos = useMemo(() => {
    const almacenes = new Set<string>();
    data.forEach(row => almacenes.add(row.almacen));
    return Array.from(almacenes).sort();
  }, [data]);

  // Filtrar y recalcular el saldo progresivo si se filtra por almacén
  const filteredData = useMemo(() => {
    let filtered = data;
    if (almacenFilter !== 'todos') {
      filtered = data.filter(row => row.almacen === almacenFilter);
    }

    // Recalcular el saldo progresivo basado en el filtro
    let saldo = 0;
    return filtered.map(row => {
      saldo += row.cantidad;
      return { ...row, saldo_progresivo: saldo };
    });
  }, [data, almacenFilter]);

  const exportCSV = () => {
    const headers = ['Fecha', 'Documento', 'Tipo', 'Almacén', 'Cantidad', 'Saldo Progresivo'];
    const rows = filteredData.map(row => [
      formatDateDisplay(row.fecha),
      row.documento,
      row.tipo,
      row.almacen,
      row.cantidad,
      row.saldo_progresivo
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kardex_Producto.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', margin: 0 }}>
            Kardex de Movimientos
          </h2>
          <p className="text-sub" style={{ margin: 0, marginTop: '0.25rem' }}>
            Registro cronológico detallado de entradas y salidas de inventario.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
            <ListFilter size={18} color="var(--text-secondary)" />
            <select
              value={almacenFilter}
              onChange={(e) => setAlmacenFilter(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <option value="todos" style={{ color: '#000' }}>Todos los Almacenes</option>
              {almacenesUnicos.map(alm => (
                <option key={alm} value={alm} style={{ color: '#000' }}>Almacén {alm}</option>
              ))}
            </select>
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
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <TableHead style={{ width: '120px' }}>Fecha</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Cantidad</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Saldo Progresivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No se encontraron movimientos para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, index) => {
                const isEntrada = row.cantidad > 0;
                return (
                  <TableRow key={`${row.documento}-${index}`}>
                    <TableCell style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>
                      {formatDateDisplay(row.fecha)}
                    </TableCell>
                    <TableCell style={{ fontWeight: 500 }}>{row.documento}</TableCell>
                    <TableCell>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: isEntrada ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                        color: isEntrada ? '#4ade80' : '#f87171',
                      }}>
                        {isEntrada ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {row.tipo}
                      </span>
                    </TableCell>
                    <TableCell>{row.almacen}</TableCell>
                    <TableCell style={{ textAlign: 'right', fontWeight: 600, color: isEntrada ? '#4ade80' : '#f87171' }}>
                      {isEntrada ? '+' : ''}{row.cantidad}
                    </TableCell>
                    <TableCell style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-geist-mono)' }}>
                      {row.saldo_progresivo}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
