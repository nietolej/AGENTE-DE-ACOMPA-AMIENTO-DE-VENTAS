import { Pool } from 'pg';

// Utilizando Singleton pattern para mantener una única conexión en Next.js (dev mode)
const globalForPg = global as unknown as { pgPool: Pool };

export const pool =
  globalForPg.pgPool ||
  new Pool({
    // Configura estas variables de entorno en el archivo .env.local
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;

/**
 * Función auxiliar para ejecutar queries crudos.
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Opcional: Logging para debug
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}
