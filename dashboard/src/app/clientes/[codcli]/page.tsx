import { formatDateDisplay } from '@/lib/types';
import Link from 'next/link';
import { getClientInfo, getClientOverviewYear, getClientHistorical, getClientComparison, getClientStatement } from '../../../lib/queries/clientes';
import { getTopItems } from '../../../lib/queries/articulos';
import YearView from './YearView';
import HistoryView from './HistoryView';
import CompareView from './CompareView';
import ClientSearch from './ClientSearch';
import YearSelector from './YearSelector';
import TopItems from '../TopItems';
import StatementView from './StatementView';

// Fuerzo render dinámico porque usamos searchParams
export const dynamic = 'force-dynamic';

export default async function ClientePage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ codcli: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { codcli } = resolvedParams;
  const tab = typeof resolvedSearchParams.tab === 'string' ? resolvedSearchParams.tab : 'anio';
  let year: string = 'todos';
  const paramYear = resolvedSearchParams.year;
  if (paramYear) {
    year = Array.isArray(paramYear) ? paramYear.join(',') : paramYear;
  } else {
    year = new Date().getFullYear().toString();
  }

  const incluirInactivos = resolvedSearchParams.inactivos === 'true';

  // Obtener info del cliente (Nombre, Vendedor) y resolver el codcli real
  const clientInfo = await getClientInfo(codcli);
  const realCodcli = clientInfo.codcli; // 00000500 incluso si buscaron "ANGULO"

  // Pre-cargar historial para obtener años disponibles
  const dataHist = await getClientHistorical(realCodcli, incluirInactivos);
  const availableYears = dataHist.resumen_anios.map((r: any) => r.anio);

  // Router interno basado en tabs
  let content;
  let topItemsData: any = null;

  if (tab === 'anio') {
    const dataAnio = await getClientOverviewYear(realCodcli, year, incluirInactivos);
    content = <YearView data={dataAnio} />;

    // Fetch Top ítems para este cliente
    const topCantidad = await getTopItems(year, 100, 'cantidad', realCodcli, incluirInactivos);
    const topMonto = await getTopItems(year, 100, 'monto', realCodcli, incluirInactivos);
    topItemsData = { topCantidad, topMonto };

  } else if (tab === 'historico') {
    const dataHistTab = await getClientHistorical(realCodcli, incluirInactivos);
    content = <HistoryView data={dataHistTab} />;
  } else if (tab === 'comparacion') {
    const startA = typeof resolvedSearchParams.startA === 'string' ? resolvedSearchParams.startA : '2024-01-01';
    const endA = typeof resolvedSearchParams.endA === 'string' ? resolvedSearchParams.endA : '2024-12-31';
    const startB = typeof resolvedSearchParams.startB === 'string' ? resolvedSearchParams.startB : '2025-01-01';
    const endB = typeof resolvedSearchParams.endB === 'string' ? resolvedSearchParams.endB : '2025-12-31';

    const dataComp = await getClientComparison(
      realCodcli, 
      {start: startA, end: endA}, 
      {start: startB, end: endB},
      incluirInactivos
    );
    content = <CompareView data={dataComp} />;
  } else if (tab === 'estadocuenta') {
    const dataStatement = await getClientStatement(realCodcli, year);
    content = <StatementView data={dataStatement} />;
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      {/* Encabezado: Torre de Control */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div style={{ flex: 1, marginRight: '2rem' }}>
          <Link href="/clientes" style={{ color: 'var(--accent-primary)', textDecoration: 'none', marginBottom: '0.5rem', display: 'inline-block' }}>&larr; Volver a Búsqueda Global</Link>
          <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '2rem', margin: 0 }}>{clientInfo.nomcli}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-secondary)' }}>
              <div><strong>Código:</strong> {realCodcli}</div>
              <div><strong>RIF:</strong> {clientInfo.rif}</div>
              <div><strong>Vendedor:</strong> {clientInfo.vendedor_nombre}</div>
              <div><strong>Última Compra:</strong> {formatDateDisplay(dataHist.total_historico.ultima_compra)}</div>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <strong>Dirección:</strong> {clientInfo.direccion}
            </div>
          </div>
        </div>
        <div style={{ paddingTop: '1.5rem' }}>
          <ClientSearch initialSearchTerm={clientInfo.nomcli} />
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
        <Link 
          href={`/clientes/${codcli}?tab=anio`}
          style={{ 
            textDecoration: 'none', 
            padding: '0.5rem 1rem', 
            borderRadius: '4px',
            fontWeight: 'bold',
            backgroundColor: tab === 'anio' ? 'var(--accent-primary)' : 'transparent',
            color: tab === 'anio' ? 'white' : 'var(--text-secondary)'
          }}
        >
          Análisis por Año
        </Link>
        <Link 
          href={`/clientes/${codcli}?tab=historico`}
          style={{ 
            textDecoration: 'none', 
            padding: '0.5rem 1rem', 
            borderRadius: '4px',
            fontWeight: 'bold',
            backgroundColor: tab === 'historico' ? 'var(--accent-primary)' : 'transparent',
            color: tab === 'historico' ? 'white' : 'var(--text-secondary)'
          }}
        >
          Análisis Total (Histórico)
        </Link>
        <Link 
          href={`/clientes/${codcli}?tab=comparacion`}
          style={{ 
            textDecoration: 'none', 
            padding: '0.5rem 1rem', 
            borderRadius: '4px',
            fontWeight: 'bold',
            backgroundColor: tab === 'comparacion' ? 'var(--accent-primary)' : 'transparent',
            color: tab === 'comparacion' ? 'white' : 'var(--text-secondary)'
          }}
        >
          Comparación de Periodos
        </Link>
        <Link 
          href={`/clientes/${codcli}?tab=estadocuenta`}
          style={{ 
            textDecoration: 'none', 
            padding: '0.5rem 1rem', 
            borderRadius: '4px',
            fontWeight: 'bold',
            backgroundColor: tab === 'estadocuenta' ? 'var(--accent-primary)' : 'transparent',
            color: tab === 'estadocuenta' ? 'white' : 'var(--text-secondary)'
          }}
        >
          Estado de Cuenta (Detalle)
        </Link>
      </div>

      {/* Control de Año (Solo para tab año y estadocuenta) */}
      {(tab === 'anio' || tab === 'estadocuenta') && (
        <YearSelector currentYear={year} availableYears={availableYears} codcli={codcli} />
      )}

      {/* Renderizado Dinámico de la Sub-vista */}
      <main>
        {content}
        
        {/* Render Top Items */}
        {tab === 'anio' && topItemsData && (
          <TopItems 
            topByCantidad={topItemsData.topCantidad} 
            topByMonto={topItemsData.topMonto} 
            isGlobal={false} 
          />
        )}
      </main>

    </div>
  );
}
