'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Package, UserCheck, CreditCard, RotateCcw, Boxes } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Inicio', icon: LayoutDashboard },
    { href: '/clientes', label: 'Clientes (M1)', icon: Users },
    { href: '/productos', label: 'Productos (M2)', icon: Package },
    { href: '/vendedores', label: 'Vendedores (M3)', icon: UserCheck },
    { href: '/cobranzas', label: 'Cobranzas (M4)', icon: CreditCard },
    { href: '/devoluciones', label: 'Devoluciones (M5)', icon: RotateCcw },
    { href: '/inventario', label: 'Inventario (M6)', icon: Boxes },
  ];





  return (
    <nav className="glass-panel" style={{ marginBottom: '1.5rem', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--accent-primary), #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: '#fff',
          fontSize: '0.9rem'
        }}>
          BI
        </div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
          Sistema de Acompañamiento de Ventas
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                transition: 'all 0.2s ease',
                textDecoration: 'none'
              }}
            >
              <Icon size={16} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
