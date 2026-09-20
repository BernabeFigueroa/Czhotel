import { pool } from './PostgresPool';

async function clearShiftsAndReset() {
  console.log('🧹 Limpiando historial de turnos y reseteando habitaciones en Neon...');
  try {
    // 1. Eliminar consumos y turnos
    const delConsumos = await pool.query('DELETE FROM consumos');
    const delTurnos = await pool.query('DELETE FROM turnos');
    
    // 2. Reiniciar los IDs autoincrementales
    await pool.query('ALTER SEQUENCE IF EXISTS turnos_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE IF EXISTS consumos_id_seq RESTART WITH 1');

    // 3. Dejar todas las habitaciones en estado LIBRE
    await pool.query(`
      UPDATE habitaciones 
      SET estado_actual = 'LIBRE', 
          turno_actual_inicio = NULL, 
          limpieza_inicio = NULL, 
          updated_at = NOW()
    `);

    console.log(`✅ Se eliminaron ${delTurnos.rowCount} turnos y ${delConsumos.rowCount} consumos.`);
    console.log('✅ Habitaciones reseteadas a LIBRE (0 turnos hoy).');

    // Verificar
    const countTurnos = await pool.query('SELECT COUNT(*) FROM turnos');
    const resHab = await pool.query('SELECT id, nombre, estado_actual, turno_actual_inicio FROM habitaciones ORDER BY id ASC');
    
    console.log(`Turnos en base de datos: ${countTurnos.rows[0].count}`);
    console.table(resHab.rows);
  } catch (err: any) {
    console.error('❌ Error limpiando turnos:', err.message);
  } finally {
    await pool.end();
  }
}

clearShiftsAndReset();
