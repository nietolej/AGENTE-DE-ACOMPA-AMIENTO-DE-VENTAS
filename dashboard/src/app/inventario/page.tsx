import Navigation from '@/components/Navigation';
import { getInventoryIntelligence } from '@/lib/queries/inventario';
import { Boxes } from 'lucide-react';
import InventoryDashboardView from './InventoryDashboardView';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    tab?: string;
    search?: string;
    state?: string;
  }>;
}

export default async function InventarioPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedYear = resolvedParams.year || 'todos';
  const tab = resolvedParams.tab || 'velocidad';
  const search = resolvedParams.search || '';
  const filterState = resolvedParams.state || 'todos';

  const data = await getInventoryIntelligence(selectedYear, search, 150, filterState);

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <Navigation />

      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Boxes className="text-success" size={28} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Inteligencia de Inventario & Demanda (Módulo 6)</h1>
        </div>
        <p className="text-sub">
          Velocidad de venta ajustada por Días en Stock (DIS), estimación de venta perdida por quiebres, matriz de salud y recomendador de compras.
        </p>
      </header>

      <InventoryDashboardView
        kpis={data.kpis}
        items={data.items}
        grupos={data.grupos}
        selectedYear={selectedYear}
        tab={tab}
        search={search}
        filterState={filterState}
      />
    </div>
  );
}
