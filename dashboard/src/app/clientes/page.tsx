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

export const dynamic = 'force-dynamic';

export default async function GlobalDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const resolvedSearchParams = await searchParams;
  const tab = typeof resolvedSearchParams.tab === 'string' ? resolvedSearchParams.tab : 'anio';
  let year: number | 'todos' = 'todos';
  if (resolvedSearchParams.year && resolvedSearchParams.year !== 'todos') {
    year = parseInt(typeof resolvedSearchParams.year === 'string' ? resolvedSearchParams.year : new Date().getFullYear().toString(), 10);
  } else if (!resolvedSearchParams.year) {
    year = new Date().getFullYear();
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
    // Para el global, por ahora usamos el mock global o la firma de comparación (que retorna mock)
    const { getClientComparison } = await import('../../lib/queries/clientes');
    const dataComp = await getClientComparison('GLOBAL', {start: '2026-01-01', end: '2026-03-31'}, {start: '2026-04-01', end: '2026-06-30'});
    content = <CompareView data={dataComp} />;
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div style={{ flex: 1, marginRight: '2rem' }}>
          <Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none', marginBottom: '0.5rem', display: 'inline-block' }}>&larr; Volver al Inicio</Link>
          <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Dashboard Global de Ventas</h1>
            <p className="text-sub" style={{ margin: 0 }}>Métricas totales de todos los clientes (Vendedor 00 {incluirInactivos ? 'Incluido' : 'Excluido'})</p>
          </div>
        </div>
        <div style={{ paddingTop: '1.5rem' }}>
          <ClientSearch />
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <Link href={`/clientes?tab=anio&year=${year}${incluirInactivos ? '&inactivos=true' : ''}`} style={{ color: tab === 'anio' ? 'var(--accent-primary)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold' }}>
          Análisis por Año
        </Link>
        <Link href={`/clientes?tab=historico${incluirInactivos ? '&inactivos=true' : ''}`} style={{ color: tab === 'historico' ? 'var(--accent-primary)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold' }}>
          Histórico
        </Link>
        <Link href={`/clientes?tab=comparacion${incluirInactivos ? '&inactivos=true' : ''}`} style={{ color: tab === 'comparacion' ? 'var(--accent-primary)' : 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold' }}>
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
