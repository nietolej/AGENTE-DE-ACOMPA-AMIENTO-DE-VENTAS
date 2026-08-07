import { getInventoryIntelligence } from '@/lib/queries/inventario';
import { Boxes } from 'lucide-react';
import InventoryDashboardView from './InventoryDashboardView';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    tab?: string;
    search?: string;
    state?: string;
    limit?: string;
  }>;
}

export default async function InventarioPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedYear = resolvedParams.year || 'todos';
  const tab = resolvedParams.tab || 'velocidad';
  const search = resolvedParams.search || '';
  const filterState = resolvedParams.state || 'todos';
  const limitStr = resolvedParams.limit || '150';
  const limit = limitStr === 'todos' ? 999999 : parseInt(limitStr, 10);

  const data = await getInventoryIntelligence(selectedYear, search, limit, filterState);

  return (
    <div className="container" style={{ paddingTop: '0.75rem', paddingBottom: '2.5rem' }}>

      <header className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Boxes className="text-success" size={20} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Inteligencia de Inventario & Demanda (Módulo 6)</h1>
        </div>
        <p className="text-sub" style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem' }}>
          Velocidad de venta ajustada por Días en Stock (DIS), estimación de venta perdida por quiebres, matriz de salud y recomendador de compras.
        </p>
      </header>

      <InventoryDashboardView
        kpis={data.kpis}
        items={data.items}
        grupos={data.grupos}
        valorizacion_mensual={data.valorizacion_mensual}
        selectedYear={selectedYear}
        tab={tab}
        search={search}
        filterState={filterState}
        limit={limitStr}
      />
    </div>
  );
}
