'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface ClientSearchProps {
  initialSearchTerm?: string;
}

export default function ClientSearch({ initialSearchTerm = '' }: ClientSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInactivos = searchParams.get('inactivos') === 'true';

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [results, setResults] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [incluirInactivos, setIncluirInactivos] = useState(initialInactivos);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown si se hace click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Debounce búsqueda
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        fetch(`/api/clientes?q=${searchTerm}`)
          .then(res => res.json())
          .then(data => {
            setResults(data);
            setIsDropdownOpen(true);
          })
          .catch(console.error);
      } else {
        setResults([]);
        setIsDropdownOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSelect = (codcli: string) => {
    setSearchTerm('');
    setIsDropdownOpen(false);
    const queryStr = incluirInactivos ? '?inactivos=true' : '';
    router.push(`/clientes/${codcli}${queryStr}`);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIncluirInactivos(checked);
    // Si ya estamos viendo a un cliente, recargamos con el nuevo parámetro
    const currentPath = window.location.pathname;
    if (currentPath.includes('/clientes/')) {
      const queryStr = checked ? '?inactivos=true' : '';
      router.push(`${currentPath}${queryStr}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Si el término es exactamente igual al inicial (el nombre del cliente actual), no hacemos nada
      if (searchTerm === initialSearchTerm) return;
      handleSelect(searchTerm.trim().toUpperCase());
    } else {
      const queryStr = incluirInactivos ? '?inactivos=true' : '';
      router.push(`/clientes${queryStr}`);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    const queryStr = incluirInactivos ? '?inactivos=true' : '';
    router.push(`/clientes${queryStr}`);
  };

  return (
    <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
      <form onSubmit={handleSearch} style={{ position: 'relative' }}>
        <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            // Si el usuario borra todo manualmente, podemos navegar al global automáticamente
            if (e.target.value === '') {
              const queryStr = incluirInactivos ? '?inactivos=true' : '';
              router.push(`/clientes${queryStr}`);
            }
          }}
          onFocus={() => { if(results.length > 0) setIsDropdownOpen(true); }}
          placeholder="Buscar cliente (vacío = Global)" 
          style={{ 
            padding: '0.75rem 2.5rem 0.75rem 2.5rem', 
            borderRadius: '8px', 
            border: '1px solid var(--glass-border)',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            width: '400px'
          }} 
        />
        {searchTerm && (
          <button 
            type="button" 
            onClick={handleClear}
            style={{ 
              position: 'absolute', 
              right: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={18} />
          </button>
        )}
        
        {/* Dropdown de Autocompletado */}
        {isDropdownOpen && results.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            backgroundColor: '#111',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            {results.map((c, i) => (
              <div 
                key={i} 
                onClick={() => handleSelect(c.codcli)}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: i < results.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ color: 'white', fontWeight: 'bold' }}>{c.nomcli}</span>
                <span className="text-sub">{c.codcli}</span>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Toggle Inactivos */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }} className="text-sub">
        <input 
          type="checkbox" 
          checked={incluirInactivos}
          onChange={handleCheckboxChange}
          style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
        />
        Incluir historial de inactivos
      </label>
    </div>
  );
}
