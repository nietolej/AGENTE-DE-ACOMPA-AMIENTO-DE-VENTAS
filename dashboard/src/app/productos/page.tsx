import Navigation from '@/components/Navigation';
import { getProductosList, getProductGroupsSummary } from '@/lib/queries/articulos';
import { Package } from 'lucide-react';
import ProductCatalogView from './ProductCatalogView';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    search?: string;
    orderBy?: 'monto' | 'cantidad' | 'stock';
    tab?: string;
  }>;
}

export default async function ProductosPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedYear = resolvedParams.year || 'todos';
  const searchTerm = resolvedParams.search || '';
  const orderBy = resolvedParams.orderBy || 'monto';
  const tab = resolvedParams.tab || 'items';

  const productos = await getProductosList(selectedYear, searchTerm, 150, orderBy);
  const grupos = await getProductGroupsSummary(selectedYear);

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <Navigation />

      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Package className="text-success" size={28} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Catálogo y Análisis de Productos (Módulo 2)</h1>
        </div>
        <p className="text-sub">
          Monitoreo de rotación, stock disponible, volumen de ventas y devoluciones por producto.
        </p>
      </header>

      <ProductCatalogView
        productos={productos}
        grupos={grupos}
        selectedYear={selectedYear}
        searchTerm={searchTerm}
        orderBy={orderBy}
        tab={tab}
      />
    </div>
  );
}
