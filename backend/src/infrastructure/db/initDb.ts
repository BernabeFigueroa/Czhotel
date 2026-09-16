import fs from 'fs';
import path from 'path';
import { pool } from './PostgresPool';

async function initDb() {
  console.log('🔄 Ejecutando schema.sql en Neon...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(sql);
    console.log('✅ Esquema y las 18 habitaciones creadas exitosamente en Neon.');

    const res = await pool.query('SELECT id, nombre, tuya_device_id, estado_actual FROM habitaciones ORDER BY id ASC');
    console.table(res.rows);
  } catch (err: any) {
    console.error('❌ Error aplicando schema.sql:', err.message);
  } finally {
    await pool.end();
  }
}

initDb();
