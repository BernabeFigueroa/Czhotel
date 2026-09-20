import { pool } from './PostgresPool';

async function restoreRoom6() {
  console.log('⚡ Restaurando Habitación 6 a estado OCUPADA (inicio 20:16 hs / 23:16 UTC)...');
  try {
    const res = await pool.query(`
      UPDATE habitaciones 
      SET estado_actual = 'OCUPADA', 
          turno_actual_inicio = '2026-09-19T23:16:24.805Z',
          limpieza_inicio = NULL,
          updated_at = NOW()
      WHERE id = 6
      RETURNING id, nombre, estado_actual, turno_actual_inicio;
    `);

    console.log('✅ Habitación 6 restaurada exitosamente:');
    console.table(res.rows);
  } catch (err: any) {
    console.error('❌ Error restaurando habitación 6:', err.message);
  } finally {
    await pool.end();
  }
}

restoreRoom6();
