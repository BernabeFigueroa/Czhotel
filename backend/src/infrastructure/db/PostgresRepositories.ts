import { Pool } from 'pg';
import { Room, RoomStatus } from '../../domain/entities/Room';
import { Shift } from '../../domain/entities/Shift';
import { IRoomRepository } from '../../application/ports/IRoomRepository';
import { IShiftRepository, ShiftCreateData } from '../../application/ports/IShiftRepository';

export class PostgresRoomRepository implements IRoomRepository {
  constructor(private pool: Pool) {}

  async findById(id: number): Promise<Room | null> {
    const res = await this.pool.query(
      `SELECT id, nombre, tuya_device_id, estado_actual, turno_actual_inicio FROM habitaciones WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findByTuyaDeviceId(deviceId: string): Promise<Room | null> {
    const res = await this.pool.query(
      `SELECT id, nombre, tuya_device_id, estado_actual, turno_actual_inicio FROM habitaciones WHERE tuya_device_id = $1`,
      [deviceId]
    );
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findAllWithTodayCounts(): Promise<Room[]> {
    const today = new Date().toISOString().split('T')[0];
    const query = `
      SELECT 
        h.id, 
        h.nombre, 
        h.tuya_device_id, 
        h.estado_actual, 
        h.turno_actual_inicio,
        COALESCE(COUNT(t.id), 0)::int AS turnos_hoy_count
      FROM habitaciones h
      LEFT JOIN turnos t ON t.habitacion_id = h.id AND t.fecha = $1
      GROUP BY h.id
      ORDER BY h.id ASC;
    `;
    const res = await this.pool.query(query, [today]);
    return res.rows.map((r) => new Room(
      r.id,
      r.nombre,
      r.tuya_device_id,
      r.estado_actual as RoomStatus,
      r.turno_actual_inicio ? new Date(r.turno_actual_inicio) : null,
      r.turnos_hoy_count
    ));
  }

  async updateStatus(id: number, status: RoomStatus, startTime: Date | null): Promise<void> {
    await this.pool.query(
      `UPDATE habitaciones 
       SET estado_actual = $1, turno_actual_inicio = $2, updated_at = NOW() 
       WHERE id = $3`,
      [status, startTime, id]
    );
  }

  private mapToEntity(row: any): Room {
    return new Room(
      row.id,
      row.nombre,
      row.tuya_device_id,
      row.estado_actual as RoomStatus,
      row.turno_actual_inicio ? new Date(row.turno_actual_inicio) : null
    );
  }
}

export class PostgresShiftRepository implements IShiftRepository {
  constructor(private pool: Pool) {}

  async createShift(data: ShiftCreateData): Promise<Shift> {
    const res = await this.pool.query(
      `INSERT INTO turnos (habitacion_id, hora_inicio, hora_fin, duracion_minutos, fecha)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, habitacion_id, hora_inicio, hora_fin, duracion_minutos, fecha`,
      [data.habitacionId, data.horaInicio, data.horaFin, data.duracionMinutos, data.fecha]
    );
    const row = res.rows[0];
    return new Shift(
      row.id,
      row.habitacion_id,
      new Date(row.hora_inicio),
      new Date(row.hora_fin),
      row.duracion_minutos,
      row.fecha
    );
  }

  async findByDate(fecha: string): Promise<Shift[]> {
    const res = await this.pool.query(
      `SELECT id, habitacion_id, hora_inicio, hora_fin, duracion_minutos, fecha 
       FROM turnos 
       WHERE fecha = $1 
       ORDER BY hora_inicio ASC`,
      [fecha]
    );
    return res.rows.map((r) => new Shift(
      r.id,
      r.habitacion_id,
      new Date(r.hora_inicio),
      new Date(r.hora_fin),
      r.duracion_minutos,
      r.fecha
    ));
  }

  async findByRoomAndDate(habitacionId: number, fecha: string): Promise<Shift[]> {
    const res = await this.pool.query(
      `SELECT id, habitacion_id, hora_inicio, hora_fin, duracion_minutos, fecha 
       FROM turnos 
       WHERE habitacion_id = $1 AND fecha = $2 
       ORDER BY hora_inicio ASC`,
      [habitacionId, fecha]
    );
    return res.rows.map((r) => new Shift(
      r.id,
      r.habitacion_id,
      new Date(r.hora_inicio),
      new Date(r.hora_fin),
      r.duracion_minutos,
      r.fecha
    ));
  }
}
