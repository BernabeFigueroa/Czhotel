import { pool } from './PostgresPool';

async function migrate() {
  console.log('🔄 Ejecutando migración de Stock y Consumos en Neon...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Columnas y constraints en habitaciones
    await client.query(`
      ALTER TABLE habitaciones 
      ADD COLUMN IF NOT EXISTS limpieza_inicio TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS precio_base NUMERIC(10, 2) NOT NULL DEFAULT 12000;
    `);

    // Intentar remover check constraint antiguo si existe
    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE habitaciones DROP CONSTRAINT IF EXISTS habitaciones_estado_actual_check;
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END $$;
    `);

    // 2. Tabla productos
    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        precio NUMERIC(10, 2) NOT NULL DEFAULT 0,
        stock INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Tabla consumos
    await client.query(`
      CREATE TABLE IF NOT EXISTS consumos (
        id SERIAL PRIMARY KEY,
        habitacion_id INT NOT NULL REFERENCES habitaciones(id) ON DELETE CASCADE,
        turno_id INT NULL REFERENCES turnos(id) ON DELETE SET NULL,
        producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
        cantidad INT NOT NULL DEFAULT 1,
        precio_unitario NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_consumos_habitacion_activo ON consumos(habitacion_id) WHERE turno_id IS NULL;
      CREATE INDEX IF NOT EXISTS idx_consumos_turno ON consumos(turno_id);
    `);

    // 5. Semilla de productos
    await client.query(`
      INSERT INTO productos (id, nombre, precio, stock)
      VALUES 
        (1, 'Preservativos', 1500, 120),
        (2, 'Cerveza', 3200, 48),
        (3, 'Chandon', 9500, 14),
        (4, 'Gaseosa', 2200, 36),
        (5, 'Agua mineral', 1800, 40),
        (6, 'Vino', 7800, 20)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        precio = EXCLUDED.precio;
      SELECT setval('productos_id_seq', (SELECT GREATEST(MAX(id), 1) FROM productos));
    `);

    await client.query('COMMIT');
    console.log('✅ Migración aplicada correctamente en Neon PostgreSQL.');

    const prods = await client.query('SELECT * FROM productos ORDER BY id ASC');
    console.table(prods.rows);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
