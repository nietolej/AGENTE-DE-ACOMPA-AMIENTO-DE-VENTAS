import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number | string;
    isPositive: boolean;
    label?: string;
  };
  valueColor?: string;
}

export function KpiCard({ title, value, icon, trend, valueColor }: KpiCardProps) {
  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        {icon && <span>{icon}</span>}
        <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 500 }} className="text-sub">{title}</h3>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.5rem', color: valueColor || 'inherit' }}>
          {value}
        </span>
        {trend && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem', 
            color: trend.isPositive ? 'var(--accent-success)' : 'var(--accent-danger)', 
            fontWeight: 'bold',
            fontSize: '0.85rem',
            backgroundColor: trend.isPositive ? 'rgba(0, 200, 150, 0.1)' : 'rgba(255, 68, 68, 0.1)',
            padding: '0.2rem 0.4rem',
            borderRadius: '4px'
          }}>
            <span>{trend.value}</span>
            {trend.label && <span style={{ opacity: 0.8, fontWeight: 'normal' }}>{trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
