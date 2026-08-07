import React from 'react';
import { FacturaEstadoCuenta, formatDateDisplay } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StatementTableProps {
  data: FacturaEstadoCuenta[];
}

export function StatementTable({ data }: StatementTableProps) {
  return (
    <div className="glass-panel">
      <h3 style={{ marginBottom: '1rem' }}>Estado de Cuenta del Cliente</h3>
      {data && data.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nro Nota/Factura</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Monto Deuda ($)</TableHead>
                <TableHead>Monto Abono ($)</TableHead>
                <TableHead>Saldo Pendiente ($)</TableHead>
                <TableHead>Fecha Vencimiento</TableHead>
                <TableHead>Estado (Mora)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((factura: FacturaEstadoCuenta, idx: number) => {
                const moraDays = factura.mora || 0;
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-bold">{factura.nota}</TableCell>
                    <TableCell>{formatDateDisplay(factura.emision)}</TableCell>
                    <TableCell>${factura.deuda_original.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-green-400 font-semibold">${factura.abonado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-red-400 font-bold">${factura.saldo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{formatDateDisplay(factura.vencimiento)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-md text-[13px] font-bold ${moraDays > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {moraDays > 0 
                          ? `${moraDays} ${moraDays === 1 ? 'día' : 'días'} de vencido` 
                          : moraDays < 0 
                            ? `${Math.abs(moraDays)} ${Math.abs(moraDays) === 1 ? 'día' : 'días'} por vencer` 
                            : 'Al día'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center p-12 text-muted-foreground">
          <p>El cliente no tiene facturas abiertas / notas no canceladas.</p>
        </div>
      )}
    </div>
  );
}
