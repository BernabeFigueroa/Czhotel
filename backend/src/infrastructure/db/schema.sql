CREATE TABLE IF NOT EXISTS habitaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tuya_device_id VARCHAR(100) UNIQUE NOT NULL,
    estado_actual VARCHAR(20) NOT NULL DEFAULT 'LIBRE' CHECK (estado_actual IN ('LIBRE', 'OCUPADA')),
    turno_actual_inicio TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS turnos (
    id SERIAL PRIMARY KEY,
    habitacion_id INT NOT NULL REFERENCES habitaciones(id) ON DELETE CASCADE,
    hora_inicio TIMESTAMPTZ NOT NULL,
    hora_fin TIMESTAMPTZ NOT NULL,
    duracion_minutos INT NOT NULL CHECK (duracion_minutos >= 0),
    fecha DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turnos_habitacion_fecha ON turnos(habitacion_id, fecha);
CREATE INDEX IF NOT EXISTS idx_habitaciones_tuya_device ON habitaciones(tuya_device_id);

-- Semilla oficial con los 18 relés Tuya reales
INSERT INTO habitaciones (id, nombre, tuya_device_id, estado_actual)
VALUES 
  (1, 'Habitación 1', 'ebe0b5aeb9b9e39ca6qzzj', 'LIBRE'),
  (2, 'Habitación 2', 'eba5791c242f2d8f0eyldp', 'LIBRE'),
  (3, 'Habitación 3', 'eb8aaa710219685a89ijfx', 'LIBRE'),
  (4, 'Habitación 4', 'eba81db69978c13331t9ab', 'LIBRE'),
  (5, 'Habitación 5', 'eb78869a1a965cc445jxa3', 'LIBRE'),
  (6, 'Habitación 6', 'eb669c425b04001ef5vteb', 'LIBRE'),
  (7, 'Habitación 7', 'eb18faef6977ee5896mkoq', 'LIBRE'),
  (8, 'Habitación 8', 'eb36b1c6af1ca09237lsyl', 'LIBRE'),
  (9, 'Habitación 9', 'ebe0a8a7572fa9c2eekxvk', 'LIBRE'),
  (10, 'Habitación 10', 'eb2a89a4cd961975a7sain', 'LIBRE'),
  (11, 'Habitación 11', 'eb537d670d280e6aa8kxrg', 'LIBRE'),
  (12, 'Habitación 12', 'eb44d31c8c249aa6bd7k18', 'LIBRE'),
  (13, 'Habitación 13', 'ebcc893b7a30062a77ztaq', 'LIBRE'),
  (14, 'Habitación 14', 'eb66ce5dfe9f547a2d8rmm', 'LIBRE'),
  (15, 'Habitación 15', 'eb851e85be1f0db4201yfc', 'LIBRE'),
  (16, 'Habitación 16', 'eb23e9773a0be01258aot2', 'LIBRE'),
  (17, 'Habitación 17', 'eb044cf73f4fcc22aesrau', 'LIBRE'),
  (18, 'Habitación 18', 'eb43117e7fdcb18899gtlg', 'LIBRE')
ON CONFLICT (id) DO UPDATE SET 
  tuya_device_id = EXCLUDED.tuya_device_id,
  nombre = EXCLUDED.nombre;
