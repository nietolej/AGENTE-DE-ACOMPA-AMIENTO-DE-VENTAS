import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { getProductoDetail, getProductComparison, getProductWarehouseStock } from '@/lib/queries/articulos';
import ProductDetailView from './ProductDetailView';

interface PageProps {
  params: Promise<{
    codart: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    year?: string;
    yearA?: string;
    yearB?: string;
  }>;
}

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const { codart } = await params;
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams.tab || 'anio';
  const year = resolvedSearchParams.year || 'todos';
  const yearA = resolvedSearchParams.yearA || '2024';
  const yearB = resolvedSearchParams.yearB || '2025';

  const productData = await getProductoDetail(codart, year);

  if (!productData) {
    notFound();
  }

  const compareData = tab === 'compare' ? await getProductComparison(codart, yearA, yearB) : null;
  const warehouseStock = await getProductWarehouseStock(codart);

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <Navigation />
      <ProductDetailView
        data={productData}
        selectedYear={year}
        tab={tab}
        yearA={yearA}
        yearB={yearB}
        compareData={compareData}
        warehouseStock={warehouseStock}
      />
    </div>
  );
}
