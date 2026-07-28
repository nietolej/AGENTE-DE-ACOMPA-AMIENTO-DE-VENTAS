'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function YearSelector({ 
  currentYear, 
  availableYears, 
  codcli 
}: { 
  currentYear: number | string, 
  availableYears: number[], 
  codcli?: string 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentYearStr = currentYear ? currentYear.toString() : 'todos';
  const isMultiInitial = currentYearStr.includes(',');
  const [mode, setMode] = useState<'single' | 'multi'>(isMultiInitial ? 'multi' : 'single');

  const selectedYearsList = currentYearStr === 'todos' 
    ? availableYears.map(y => y.toString())
    : currentYearStr.split(',').map(y => y.trim());

  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set(selectedYearsList));

  useEffect(() => {
    if (currentYearStr.includes(',')) {
      setMode('multi');
    }
  }, [currentYearStr]);

  const updateYearQuery = (newYearValue: string) => {
    const inactivos = searchParams.get('inactivos');
    const query = new URLSearchParams();
    query.set('tab', 'anio');
    query.set('year', newYearValue);
    if (inactivos === 'true') {
      query.set('inactivos', 'true');
    }
    const path = codcli ? `/clientes/${codcli}` : `/clientes`;
    router.push(`${path}?${query.toString()}`);
  };

  const handleSingleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateYearQuery(e.target.value);
  };

  const handleCheckboxToggle = (yearStr: string) => {
    const updated = new Set(selectedYears);
    if (updated.has(yearStr)) {
      if (updated.size > 1) {
        updated.delete(yearStr);
      }
    } else {
      updated.add(yearStr);
    }
    setSelectedYears(updated);

    const sortedSelected = (Array.from(updated) as string[])
      .map(y => parseInt(y, 10))
      .filter(y => !isNaN(y))
      .sort((a, b) => b - a)
      .map(y => y.toString());

    if (sortedSelected.length === availableYears.length) {
      updateYearQuery('todos');
    } else {
      updateYearQuery(sortedSelected.join(','));
    }
  };

  const handleSelectAll = () => {
    const allSet = new Set(availableYears.map(y => y.toString()));
    setSelectedYears(allSet);
    updateYearQuery('todos');
  };

  const yearsToRender = Array.from(new Set([
    ...availableYears,
    ...(currentYear !== 'todos' && !currentYearStr.includes(',') ? [Number(currentYear)] : [])
  ])).filter(y => !isNaN(y)).sort((a, b) => b - a);

  return (
    <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Toggle Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Filtro de Periodos:</span>
          <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '6px', padding: '3px' }}>
            <button
              type="button"
              onClick={() => {
                setMode('single');
                if (currentYearStr.includes(',')) {
                  updateYearQuery(availableYears[0]?.toString() || 'todos');
                }
              }}
              style={{
                padding: '0.4rem 0.8rem',
                backgroundColor: mode === 'single' ? 'var(--accent-primary)' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: mode === 'single' ? 'bold' : 'normal'
              }}
            >
              1 Periodo
            </button>
            <button
              type="button"
              onClick={() => setMode('multi')}
              style={{
                padding: '0.4rem 0.8rem',
                backgroundColor: mode === 'multi' ? 'var(--accent-primary)' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: mode === 'multi' ? 'bold' : 'normal'
              }}
            >
              Varios Periodos
            </button>
          </div>
        </div>

        {/* Controls */}
        {mode === 'single' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="text-sub" style={{ fontSize: '0.85rem' }}>Año Seleccionado:</label>
            <select 
              style={{ 
                padding: '0.45rem 0.8rem', 
                borderRadius: '6px', 
                backgroundColor: 'rgba(0,0,0,0.6)', 
                color: 'white', 
                border: '1px solid var(--glass-border)', 
                cursor: 'pointer',
                fontSize: '0.85rem',
                outline: 'none'
              }}
              value={currentYearStr.includes(',') ? 'todos' : currentYearStr}
              onChange={handleSingleYearChange}
            >
              <option value="todos">Todo el Histórico</option>
              {yearsToRender.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Seleccionar Años:</span>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {yearsToRender.map(y => {
                const yStr = y.toString();
                const isChecked = currentYearStr === 'todos' || selectedYears.has(yStr);
                return (
                  <label 
                    key={y} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem', 
                      backgroundColor: isChecked ? 'rgba(0, 136, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                      padding: '0.35rem 0.75rem', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      userSelect: 'none',
                      color: isChecked ? 'white' : 'var(--text-secondary)'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => handleCheckboxToggle(yStr)}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                    />
                    {y}
                  </label>
                );
              })}
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  padding: '0.35rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Todos
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
