'use client';

import React, { useState } from 'react';
import { formatDateDisplay } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Item = { 
  codart?: string,
  descrip: string, 
  cantidad: number, 
  monto: number,
  devoluciones_cantidad: number,
  devoluciones_monto: number,
  ultima_venta: string,
  stock_disponible?: number
};

interface TopItemsProps {
  topByCantidad: Item[];
  topByMonto: Item[];
  isGlobal: boolean;
}

export default function TopItems({ topByCantidad, topByMonto, isGlobal }: TopItemsProps) {
  const [orderBy, setOrderBy] = useState<'cantidad' | 'monto'>('monto');
  const [limit, setLimit] = useState<number>(10);

  const rawItems = orderBy === 'cantidad' ? topByCantidad : topByMonto;
  const items = limit === 0 ? rawItems : rawItems.slice(0, limit);
  const currentCount = items.length;

  return (
    <div className="glass-panel" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>🏆 Top {currentCount} Ítems Más Vendidos</h2>
          <p className="text-sub">Productos con mayor rotación en el periodo seleccionado.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Limit Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mostrar Top:</span>
            <select 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'white',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                padding: '0.45rem 0.8rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={0}>Todos ({rawItems.length})</option>
            </select>
          </div>

          {/* Toggle Switch */}
          <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '4px' }}>
            <button 
              onClick={() => setOrderBy('monto')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: orderBy === 'monto' ? 'var(--accent-primary)' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: orderBy === 'monto' ? 'bold' : 'normal'
              }}
            >
              Por Facturación ($)
            </button>
            <button 
              onClick={() => setOrderBy('cantidad')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: orderBy === 'cantidad' ? 'var(--accent-primary)' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: orderBy === 'cantidad' ? 'bold' : 'normal'
              }}
            >
              Por Cantidad (Unds)
            </button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Descripción del Producto</TableHead>
              <TableHead className="text-right">Última Venta</TableHead>
              <TableHead className="text-right">
                Devoluciones <br/>
                <span className="text-[10px] text-red-400">
                  {orderBy === 'cantidad' ? '(Unds)' : '($)'}
                </span>
              </TableHead>
              <TableHead className="text-right">Stock Dispon.</TableHead>
              <TableHead className="text-right">Cantidad Vendida</TableHead>
              <TableHead className="text-right">Monto Total ($)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => {
              const stock = item.stock_disponible ?? 0;
              const stockClass = stock > 20 ? 'bg-green-500/15 text-green-400 border border-green-500/30' : stock > 0 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30';

              return (
                <TableRow key={i}>
                  <TableCell>
                    <span className="text-muted-foreground mr-4 font-bold">#{i+1}</span>
                    <span className="font-semibold">{item.descrip}</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatDateDisplay(item.ultima_venta)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-400">
                    {orderBy === 'cantidad' 
                      ? item.devoluciones_cantidad.toLocaleString('en-US') 
                      : `$${item.devoluciones_monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${stockClass}`}>
                      {stock > 0 ? `${stock.toLocaleString('en-US')} unds.` : 'Agotado'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {item.cantidad.toLocaleString('en-US')}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    ${item.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                  No hay ventas registradas para este periodo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
