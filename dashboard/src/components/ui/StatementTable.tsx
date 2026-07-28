import React from 'react';
import { FacturaEstadoCuenta, formatDateDisplay } from '@/lib/types';

interface StatementTableProps {
  data: FacturaEstadoCuenta[];
}

export function StatementTable({ data }: StatementTableProps) {
  return (
    <div className="glass-panel">
      <h3 style={{ marginBottom: '1rem' }}>Estado de Cuenta del Cliente</h3>
      {data && data.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Nro Nota/Factura</th>
                <th style={{ padding: '1rem' }}>Monto Deuda ($)</th>
                <th style={{ padding: '1rem' }}>Monto Abono ($)</th>
                <th style={{ padding: '1rem' }}>Saldo Pendiente ($)</th>
                <th style={{ padding: '1rem' }}>Fecha Vencimiento</th>
                <th style={{ padding: '1rem' }}>Estado (Mora)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((factura: FacturaEstadoCuenta, idx: number) => {
                const moraDays = factura.mora || 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{factura.nota}</td>
                    <td style={{ padding: '1rem' }}>${factura.deuda_original.toLocaleString('en-US')}</td>
                    <td style={{ padding: '1rem', color: 'var(--accent-success)' }}>${factura.abonado.toLocaleString('en-US')}</td>
                    <td style={{ padding: '1rem', color: 'var(--accent-danger)' }}>${factura.saldo.toLocaleString('en-US')}</td>
                    <td style={{ padding: '1rem' }}>{formatDateDisplay(factura.vencimiento)}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.3rem 0.6rem', 
                        borderRadius: '4px', 
                        backgroundColor: moraDays > 0 ? 'rgba(255, 68, 68, 0.2)' : 'rgba(0, 200, 150, 0.2)',
                        color: moraDays > 0 ? 'var(--accent-danger)' : 'var(--accent-success)',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}>
                        {moraDays > 0 ? `${moraDays} días mora` : 'Al día'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <p>El cliente no tiene facturas abiertas / notas no canceladas.</p>
        </div>
      )}
    </div>
  );
}
