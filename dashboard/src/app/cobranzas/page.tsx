import Navigation from '@/components/Navigation';
import { getCobranzasOverview, getComisionesVendedores } from '@/lib/queries/cobranzas';
import { CreditCard } from 'lucide-react';
import CobranzasDashboardView from './CobranzasDashboardView';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    tab?: string;
  }>;
}

export default async function CobranzasPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedYear = resolvedParams.year || 'todos';
  const tab = resolvedParams.tab || 'resumen';

  const overview = await getCobranzasOverview(selectedYear);
  const vendedoresComisiones = await getComisionesVendedores(selectedYear);

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <Navigation />

      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <CreditCard className="text-success" size={28} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Cobranzas, Comisiones y Morosidad (Módulo 4)</h1>
        </div>
        <p className="text-sub">
          Análisis de cobranza efectiva, efectividad DSO, tramos de morosidad (Aging) y comisiones ganadas por asesor sobre cobro real.
        </p>
      </header>

      <CobranzasDashboardView
        kpis={overview.kpis}
        aging={overview.aging}
        vendedoresComisiones={vendedoresComisiones}
        bancos={overview.bancos}
        selectedYear={selectedYear}
        tab={tab}
      />
    </div>
  );
}
