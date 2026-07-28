import Navigation from '@/components/Navigation';
import { getVendedoresList } from '@/lib/queries/vendedores';
import { UserCheck } from 'lucide-react';
import VendorCatalogView from './VendorCatalogView';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    search?: string;
    orderBy?: 'monto' | 'pedidos' | 'clientes';
    admin?: string;
  }>;
}

export default async function VendedoresPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedYear = resolvedParams.year || 'todos';
  const searchTerm = resolvedParams.search || '';
  const orderBy = resolvedParams.orderBy || 'monto';
  const incluirAdministrativos = resolvedParams.admin === 'true';

  const vendedores = await getVendedoresList(selectedYear, searchTerm, 150, orderBy, incluirAdministrativos);

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <Navigation />

      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <UserCheck className="text-success" size={28} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Análisis de Fuerza de Ventas (Módulo 3)</h1>
        </div>
        <p className="text-sub">
          Evaluación de desempeño por vendedor, cuotas de venta, cartera de clientes atendidos y calidad de la venta.
        </p>
      </header>

      <VendorCatalogView
        vendedores={vendedores}
        selectedYear={selectedYear}
        searchTerm={searchTerm}
        orderBy={orderBy}
        incluirAdministrativos={incluirAdministrativos}
      />
    </div>
  );
}
