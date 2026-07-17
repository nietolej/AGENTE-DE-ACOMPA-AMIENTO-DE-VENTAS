'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function YearSelector({ currentYear, availableYears, codcli }: { currentYear: number | 'todos', availableYears: number[], codcli?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = e.target.value;
    const inactivos = searchParams.get('inactivos');
    const query = new URLSearchParams();
    query.set('tab', 'anio');
    query.set('year', newYear);
    if (inactivos === 'true') {
      query.set('inactivos', 'true');
    }
    const path = codcli ? `/clientes/${codcli}` : `/clientes`;
    router.push(`${path}?${query.toString()}`);
  };

  // Asegurar que el año actual esté en la lista aunque no haya compras (para no romper el select), a menos que sea 'todos'
  const yearsToRender = Array.from(new Set([...availableYears, ...(currentYear !== 'todos' ? [currentYear] : [])])).sort((a, b) => b - a);

  return (
    <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <label className="text-sub">Seleccionar Año:</label>
      <select 
        style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#111', color: 'white', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
        value={currentYear}
        onChange={handleYearChange}
      >
        <option value="todos">Todo el Histórico</option>
        {yearsToRender.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
