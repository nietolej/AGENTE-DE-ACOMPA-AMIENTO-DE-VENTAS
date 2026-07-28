import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { getVendedorDetail, getVendedorComparison } from '@/lib/queries/vendedores';
import VendorDetailView from './VendorDetailView';

interface PageProps {
  params: Promise<{
    codvend: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    year?: string;
    yearA?: string;
    yearB?: string;
  }>;
}

export default async function VendorDetailPage({ params, searchParams }: PageProps) {
  const { codvend } = await params;
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams.tab || 'anio';
  const year = resolvedSearchParams.year || 'todos';
  const yearA = resolvedSearchParams.yearA || '2024';
  const yearB = resolvedSearchParams.yearB || '2025';

  const vendorData = await getVendedorDetail(codvend, year);

  if (!vendorData) {
    notFound();
  }

  const compareData = tab === 'compare' ? await getVendedorComparison(codvend, yearA, yearB) : null;

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <Navigation />
      <VendorDetailView
        data={vendorData}
        selectedYear={year}
        tab={tab}
        yearA={yearA}
        yearB={yearB}
        compareData={compareData}
      />
    </div>
  );
}
