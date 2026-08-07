import { getDevolucionesOverview } from '@/lib/queries/devoluciones';
import { RotateCcw } from 'lucide-react';
import DevolucionesDashboardView from './DevolucionesDashboardView';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    tab?: string;
  }>;
}

export default async function DevolucionesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedYear = resolvedParams.year || 'todos';
  const tab = resolvedParams.tab || 'resumen';

  const data = await getDevolucionesOverview(selectedYear);

  return (
    <div className="container" style={{ paddingTop: '0.75rem', paddingBottom: '2.5rem' }}>

      <header className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <RotateCcw className="text-success" size={20} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Análisis y Auditoría de Devoluciones (Módulo 5)</h1>
        </div>
        <p className="text-sub" style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem' }}>
          Control de notas de crédito, tasas de devolución por Cliente, Vendedor y Producto, alertas de calidad y reducción de costos operativos.
        </p>
      </header>

      <DevolucionesDashboardView
        kpis={data.kpis}
        mensual={data.mensual}
        clientes={data.clientes}
        vendedores={data.vendedores}
        productos={data.productos}
        selectedYear={selectedYear}
        tab={tab}
      />
    </div>
  );
}
