import { pool } from './PostgresPool';

async function resetRooms() {
  console.log('🔄 Reiniciando estado de todas las habitaciones a LIBRE...');
  try {
    await pool.query(`
      UPDATE habitaciones 
      SET estado_actual = 'LIBRE', 
          turno_actual_inicio = NULL, 
          limpieza_inicio = NULL, 
          updated_at = NOW()
    `);
    console.log('✅ Todas las 18 habitaciones fueron reiniciadas a estado LIBRE.');

    const res = await pool.query(
      'SELECT id, nombre, tuya_device_id, estado_actual, turno_actual_inicio FROM habitaciones ORDER BY id ASC'
    );
    console.table(res.rows);
  } catch (err: any) {
    console.error('❌ Error reiniciando habitaciones:', err.message);
  } finally {
    await pool.end();
  }
}

resetRooms();
