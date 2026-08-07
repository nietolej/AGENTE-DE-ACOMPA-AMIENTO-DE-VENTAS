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
    <div className="container" style={{ paddingTop: '0.75rem', paddingBottom: '2.5rem' }}>

      <header className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <UserCheck className="text-success" size={20} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Análisis de Fuerza de Ventas (Módulo 3)</h1>
        </div>
        <p className="text-sub" style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem' }}>
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
