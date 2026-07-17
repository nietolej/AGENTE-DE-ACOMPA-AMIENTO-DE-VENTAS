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
        
        <div className="glass-panel" style={{ opacity: 0.6 }}>
          <h2>📦 Módulo 2: Productos</h2>
          <p className="text-sub">Rotación, velocidad de ventas y stock (En construcción).</p>
        </div>

        <div className="glass-panel" style={{ opacity: 0.6 }}>
          <h2>👥 Módulo 3: Vendedores</h2>
          <p className="text-sub">Rendimiento, metas y calidad de la venta (En construcción).</p>
        </div>
      </main>
    </div>
  );
}
