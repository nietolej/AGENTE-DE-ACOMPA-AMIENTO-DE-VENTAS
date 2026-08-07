'use client';

import React from 'react';
import { ClientStatementRow, formatDateDisplay } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, ArrowRightCircle, ArrowLeftCircle, HelpCircle } from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';

interface Props {
  data: ClientStatementRow[];
}

export default function StatementView({ data }: Props) {
  
  const totalCargos = data.reduce((acc, row) => acc + row.cargo, 0);
  const totalAbonos = data.reduce((acc, row) => acc + row.abono, 0);
  const saldoFinal = data.length > 0 ? data[data.length - 1].saldo_progresivo : 0;

  const exportCSV = () => {
    const headers = ['Fecha', 'Documento', 'Tipo', 'Concepto/Referencia', 'Cargo ($)', 'Abono ($)', 'Saldo Progresivo ($)'];
    const rows = data.map(row => [
      formatDateDisplay(row.fecha),
      row.documento,
      row.tipo,
      `"${row.concepto.replace(/"/g, '""')}"`,
      row.cargo,
      row.abono,
      row.saldo_progresivo
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Estado_de_Cuenta.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTipoInfo = (tipo: string, concepto: string) => {
    switch (tipo) {
      case 'FC': return { icon: <FileText size={14} />, color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.1)', text: 'Factura' };
      case 'CA': return { icon: <ArrowRightCircle size={14} />, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)', text: 'Pago/Abono' };
      case 'NC': 
        if (concepto.toUpperCase().includes('PRONTO PAGO')) {
          return { icon: <ArrowRightCircle size={14} />, color: '#e879f9', bg: 'rgba(232, 121, 249, 0.1)', text: 'Pronto Pago' };
        } else if (concepto.toUpperCase().includes('DEVOLUCION')) {
          return { icon: <ArrowLeftCircle size={14} />, color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', text: 'Devolución' };
        }
        return { icon: <ArrowRightCircle size={14} />, color: '#fde047', bg: 'rgba(253, 224, 71, 0.1)', text: 'Nota de Crédito' };
      case 'AB': return { icon: <ArrowRightCircle size={14} />, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)', text: 'Abono/Anticipo' };
      default: return { icon: <HelpCircle size={14} />, color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', text: tipo };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', margin: 0 }}>
            Estado de Cuenta y Movimientos
          </h2>
          <p className="text-sub" style={{ margin: 0, marginTop: '0.25rem' }}>
            Registro cronológico detallado de cargos (facturas) y abonos (pagos, devoluciones, descuentos).
          </p>
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
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Download size={16} /> Exportar Detalle
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <KpiCard
          title="Total Cargos (Debe)"
          value={`$${totalCargos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<ArrowLeftCircle size={24} color="#f87171" />}
        />
        <KpiCard
          title="Total Abonos (Haber)"
          value={`$${totalAbonos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<ArrowRightCircle size={24} color="#4ade80" />}
        />
        <KpiCard
          title="Saldo Final del Período"
          value={`$${saldoFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<FileText size={24} color={saldoFinal > 0 ? "#f87171" : "#4ade80"} />}
        />
      </div>

      <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <TableHead style={{ width: '120px' }}>Fecha</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo / Concepto</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Cargo (Debe)</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Abono (Haber)</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Saldo Progresivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No se encontraron movimientos registrados en este período.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                const tipoInfo = getTipoInfo(row.tipo, row.concepto);
                return (
                  <TableRow key={`${row.documento}-${index}`}>
                    <TableCell style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>
                      {formatDateDisplay(row.fecha)}
                    </TableCell>
                    <TableCell style={{ fontWeight: 500 }}>{row.documento}</TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: tipoInfo.bg,
                          color: tipoInfo.color,
                          width: 'fit-content'
                        }}>
                          {tipoInfo.icon} {tipoInfo.text}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {row.concepto}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell style={{ textAlign: 'right', fontWeight: 600, color: row.cargo > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                      {row.cargo > 0 ? `$${row.cargo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell style={{ textAlign: 'right', fontWeight: 600, color: row.abono > 0 ? '#4ade80' : 'var(--text-secondary)' }}>
                      {row.abono > 0 ? `$${row.abono.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-geist-mono)' }}>
                      ${row.saldo_progresivo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
