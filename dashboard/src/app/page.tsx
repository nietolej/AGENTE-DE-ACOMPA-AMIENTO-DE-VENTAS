import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 className="text-success" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Sistema de Acompañamiento de Ventas</h1>
        <p className="text-sub">Business Intelligence Dashboard</p>
      </header>

      <main className="grid-dashboard">
        <div className="glass-panel">
          <h2>📊 Módulo 1: Clientes</h2>
          <p className="text-sub">Análisis de ventas, deudas, devoluciones y métricas predictivas por cliente.</p>
          <Link href="/clientes" style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Ir al Dashboard de Ventas Global →</Link>
        </div>
        
        <div className="glass-panel">
          <h2>📦 Módulo 2: Productos</h2>
          <p className="text-sub">Análisis de rotación, velocidad de ventas diaria, stock disponible y Top 50 clientes por producto.</p>
          <Link href="/productos" style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Ir al Catálogo de Productos →</Link>
        </div>


        <div className="glass-panel">
          <h2>👥 Módulo 3: Vendedores</h2>
          <p className="text-sub">Rendimiento de fuerza de ventas, cuotas/metas, cartera de clientes atendidos y % de devoluciones por asesor.</p>
          <Link href="/vendedores" style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Ir a Fuerza de Ventas →</Link>
        </div>

        <div className="glass-panel">
          <h2>💳 Módulo 4: Cobranzas y Comisiones</h2>
          <p className="text-sub">Cobranza efectiva real, efectividad de cobro (DSO), tramos de morosidad y comisiones calculadas sobre cobro.</p>
          <Link href="/cobranzas" style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Ir al Dashboard de Cobranzas →</Link>
        </div>

        <div className="glass-panel">
          <h2>🔄 Módulo 5: Análisis de Devoluciones</h2>
          <p className="text-sub">Auditoría de devoluciones por Cliente, Vendedor y Producto, semáforo de riesgo y alertas de fallas de calidad.</p>
          <Link href="/devoluciones" style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Ir a Auditoría de Devoluciones →</Link>
        </div>

        <div className="glass-panel">
          <h2>📦 Módulo 6: Inteligencia de Inventario & Demanda</h2>
          <p className="text-sub">Velocidad real ajustada por días en stock (DIS), venta perdida por quiebres y calculador de sugerido de compras.</p>
          <Link href="/inventario" style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Ir a Inteligencia de Inventario →</Link>
        </div>
      </main>
    </div>
  );
}



