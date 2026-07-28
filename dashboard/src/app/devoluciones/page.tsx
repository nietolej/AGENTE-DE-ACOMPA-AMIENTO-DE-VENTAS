import Navigation from '@/components/Navigation';
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
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <Navigation />

      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <RotateCcw className="text-success" size={28} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Análisis y Auditoría de Devoluciones (Módulo 5)</h1>
        </div>
        <p className="text-sub">
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
