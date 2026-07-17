'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '10vh' }}>
      <div className="glass-panel" style={{ border: '1px solid var(--accent-danger)', display: 'inline-block', padding: '3rem' }}>
        <h2 className="text-danger" style={{ fontSize: '2rem' }}>Error de Conexión</h2>
        <p className="text-sub" style={{ marginTop: '1rem', maxWidth: '400px' }}>
          No pudimos conectar con la base de datos PostgreSQL. Por favor verifica que tus credenciales en el archivo <code>.env.local</code> sean correctas y que el servidor PostgreSQL esté corriendo.
        </p>
        <p className="text-sub" style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
          <strong>Detalle:</strong> {error.message}
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
