import { Pool } from 'pg';
import { env } from '../../config/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[PostgresPool] Error inesperado en el cliente inactivo:', err);
});
