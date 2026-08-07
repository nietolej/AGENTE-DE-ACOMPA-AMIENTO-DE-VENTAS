import React from 'react';
import Link from 'next/link';
import { getGlobalOverviewYear, getGlobalHistorical } from '../../lib/queries/clientes';
import { getTopItems } from '../../lib/queries/articulos';
import YearView from './[codcli]/YearView';
import HistoryView from './[codcli]/HistoryView';
import CompareView from './[codcli]/CompareView';
import ClientSearch from './[codcli]/ClientSearch';
import YearSelector from './[codcli]/YearSelector';
import TopItems from './TopItems';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function GlobalDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const resolvedSearchParams = await searchParams;
  const tab = typeof resolvedSearchParams.tab === 'string' ? resolvedSearchParams.tab : 'anio';
  let year: string = 'todos';
  const paramYear = resolvedSearchParams.year;
  if (paramYear) {
    year = Array.isArray(paramYear) ? paramYear.join(',') : paramYear;
  } else {
    year = new Date().getFullYear().toString();
  }
  const incluirInactivos = resolvedSearchParams.inactivos === 'true';

  // Pre-cargar historial global para obtener años disponibles
  const dataHist = await getGlobalHistorical(incluirInactivos);
  const availableYears = dataHist.resumen_anios.map((r: any) => r.anio);

  let content;
  let topItemsData: any = null;

  if (tab === 'anio') {
    const dataAnio = await getGlobalOverviewYear(year, incluirInactivos);
    content = <YearView data={dataAnio} />;

    // Obtener Top 100
    const topCantidad = await getTopItems(year, 100, 'cantidad', undefined, incluirInactivos);
    const topMonto = await getTopItems(year, 100, 'monto', undefined, incluirInactivos);
    topItemsData = { topCantidad, topMonto };

  } else if (tab === 'historico') {
    content = <HistoryView data={dataHist} />;
  } else if (tab === 'comparacion') {
    const startA = typeof resolvedSearchParams.startA === 'string' ? resolvedSearchParams.startA : '2024-01-01';
    const endA = typeof resolvedSearchParams.endA === 'string' ? resolvedSearchParams.endA : '2024-12-31';
    const startB = typeof resolvedSearchParams.startB === 'string' ? resolvedSearchParams.startB : '2025-01-01';
    const endB = typeof resolvedSearchParams.endB === 'string' ? resolvedSearchParams.endB : '2025-12-31';

    const { getClientComparison } = await import('../../lib/queries/clientes');
    const dataComp = await getClientComparison(
      'GLOBAL',
      { start: startA, end: endA },
      { start: startB, end: endB },
      incluirInactivos
    );
    content = <CompareView data={dataComp} />;
  }

  return (
    <div className="container" style={{ paddingTop: '0.75rem', paddingBottom: '2.5rem' }}>

      {/* Header Compacto - Optimización de Espacio Visual */}
      <header className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: 'var(--accent-primary)',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            &larr; Inicio
          </Link>

          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users className="text-success" size={20} /> Dashboard Global de Ventas
            </h1>
            <p className="text-sub" style={{ margin: 0, fontSize: '0.78rem' }}>
              Métricas totales de todos los clientes (Vendedor 00 {incluirInactivos ? 'Incluido' : 'Excluido'})
            </p>
          </div>
        </div>

        <div>
          <ClientSearch />
        </div>
      </header>

      {/* Tabs Compactos */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        <Link href={`/clientes?tab=anio&year=${year}${incluirInactivos ? '&inactivos=true' : ''}`} style={{ color: tab === 'anio' ? 'var(--accent-primary)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
          Análisis por Año
        </Link>
        <Link href={`/clientes?tab=historico${incluirInactivos ? '&inactivos=true' : ''}`} style={{ color: tab === 'historico' ? 'var(--accent-primary)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
          Histórico
        </Link>
        <Link href={`/clientes?tab=comparacion${incluirInactivos ? '&inactivos=true' : ''}`} style={{ color: tab === 'comparacion' ? 'var(--accent-primary)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
          Comparación de Periodos
        </Link>
      </div>

      {tab === 'anio' && (
        <YearSelector currentYear={year} availableYears={availableYears} />
      )}

      {content}

      {tab === 'anio' && topItemsData && (
        <TopItems
          topByCantidad={topItemsData.topCantidad}
          topByMonto={topItemsData.topMonto}
          isGlobal={true}
        />
      )}
    </div>
  );
}
