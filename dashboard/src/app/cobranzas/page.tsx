import {
  getCobranzasOverview,
  getPaymentPerformanceByVendor,
  getPaymentPerformanceByClient
} from '@/lib/queries/cobranzas';
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
  const vendedores = await getPaymentPerformanceByVendor(selectedYear);
  const clientes = await getPaymentPerformanceByClient(selectedYear);

  return (
    <div className="container" style={{ paddingTop: '0.75rem', paddingBottom: '2.5rem' }}>

      <header className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CreditCard className="text-success" size={20} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Cobranzas y Análisis de Promedio de Pago (Módulo 4)</h1>
        </div>
        <p className="text-sub" style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem' }}>
          Análisis de cobranza efectiva real, DSO general (promedio y mediana), tramos de velocidad de pago, comportamiento por cliente, vendedor y bancos.
        </p>
      </header>

      <CobranzasDashboardView
        kpis={overview.kpis}
        aging={overview.aging}
        velocidad={overview.velocidad}
        tendenciaMensual={overview.tendenciaMensual}
        bancos={overview.bancos}
        vendedores={vendedores}
        clientes={clientes}
        selectedYear={selectedYear}
        tab={tab}
      />
    </div>
  );
}
