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
    <div className="container" style={{ paddingTop: '0.75rem', paddingBottom: '2.5rem' }}>

      <header className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Package className="text-success" size={20} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Catálogo y Análisis de Productos (Módulo 2)</h1>
        </div>
        <p className="text-sub" style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem' }}>
          Monitoreo de rotación, stock disponible, velocidad de ventas diaria (DIS) y devoluciones por producto.
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
