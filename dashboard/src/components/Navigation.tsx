'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Package, UserCheck, CreditCard, RotateCcw, Boxes, Palette, Check } from 'lucide-react';
import { useTheme, Theme } from './ThemeProvider';

export default function Navigation() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const links = [
    { href: '/', label: 'Inicio', icon: LayoutDashboard },
    { href: '/clientes', label: 'Clientes (M1)', icon: Users },
    { href: '/productos', label: 'Productos (M2)', icon: Package },
    { href: '/vendedores', label: 'Vendedores (M3)', icon: UserCheck },
    { href: '/cobranzas', label: 'Cobranzas (M4)', icon: CreditCard },
    { href: '/devoluciones', label: 'Devoluciones (M5)', icon: RotateCcw },
    { href: '/inventario', label: 'Inventario (M6)', icon: Boxes },
  ];

  const themeOptions: { id: Theme; label: string; icon: string }[] = [
    { id: 'dark', label: 'Modo Oscuro', icon: '🌙' },
    { id: 'light', label: 'Modo Claro', icon: '☀️' },
    { id: 'corporate', label: 'Azul Hanei', icon: '🏢' },
    { id: 'emerald', label: 'Verde Esmeralda', icon: '❇️' },
  ];

  return (
    <nav className="glass-panel" style={{ marginBottom: '0.85rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
      {/* Brand Logo Container */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '0.35rem 0.85rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.4)',
          transition: 'transform 0.2s ease'
        }}>
          <img
            src="/logo.png"
            alt="Distribuciones HANEI MOTORS"
            style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
          />
        </div>
      </Link>

      {/* Navigation Links and Theme Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
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
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none'
                }}
              >
                <Icon size={15} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Theme Switcher Button & Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="Cambiar apariencia"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-primary)',
              border: '1px solid var(--glass-border)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Palette size={15} color="var(--accent-primary)" />
            <span>Apariencia</span>
          </button>

          {showThemeMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '120%',
              zIndex: 100,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              padding: '0.5rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
              minWidth: '180px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', fontWeight: 700 }}>
                SELECCIONAR TEMA
              </div>
              {themeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setShowThemeMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: theme === opt.id ? 700 : 500,
                    backgroundColor: theme === opt.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: theme === opt.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </span>
                  {theme === opt.id && <Check size={14} color="var(--accent-primary)" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
