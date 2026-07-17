'use client';

import React, { useState } from 'react';

type Item = { 
  descrip: string, 
  cantidad: number, 
  monto: number,
  devoluciones_cantidad: number,
  devoluciones_monto: number,
  ultima_venta: string
};

interface TopItemsProps {
  topByCantidad: Item[];
  topByMonto: Item[];
  isGlobal: boolean;
}

export default function TopItems({ topByCantidad, topByMonto, isGlobal }: TopItemsProps) {
  const [orderBy, setOrderBy] = useState<'cantidad' | 'monto'>('monto');
  const items = orderBy === 'cantidad' ? topByCantidad : topByMonto;

  return (
    <div className="glass-panel" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>🏆 Top {isGlobal ? '100' : '10'} Ítems Más Vendidos</h2>
          <p className="text-sub">Productos con mayor rotación en el periodo seleccionado.</p>
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

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem', width: '50%' }}>Descripción del Producto</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Última Venta</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>
                Devoluciones <br/>
                <span style={{ fontSize: '0.8rem', color: 'var(--error)' }}>
                  {orderBy === 'cantidad' ? '(Unds)' : '($)'}
                </span>
              </th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Cantidad Vendida</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Monto Total ($)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '1rem' }}>#{i+1}</span>
                  {item.descrip}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {item.ultima_venta}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--error)' }}>
                  {orderBy === 'cantidad' 
                    ? item.devoluciones_cantidad.toLocaleString('en-US') 
                    : `$${item.devoluciones_monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  }
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {item.cantidad.toLocaleString('en-US')}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--accent-secondary)' }}>
                  ${item.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay ventas registradas para este periodo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
