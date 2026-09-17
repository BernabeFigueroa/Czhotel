import { Pool } from 'pg';
import { Room, RoomStatus } from '../../domain/entities/Room';
import { Shift } from '../../domain/entities/Shift';
import { IRoomRepository } from '../../application/ports/IRoomRepository';
import { IShiftRepository, ShiftCreateData } from '../../application/ports/IShiftRepository';
import { IProductRepository } from '../../application/ports/IProductRepository';
import { ProductDTO, ConsumptionItemDTO, ShiftItemSummary } from '../../../../shared';

export class PostgresRoomRepository implements IRoomRepository {
  constructor(private pool: Pool) {}

  async findById(id: number): Promise<Room | null> {
    const res = await this.pool.query(
      `SELECT id, nombre, tuya_device_id, estado_actual, turno_actual_inicio, limpieza_inicio, precio_base FROM habitaciones WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findByTuyaDeviceId(deviceId: string): Promise<Room | null> {
    const res = await this.pool.query(
      `SELECT id, nombre, tuya_device_id, estado_actual, turno_actual_inicio, limpieza_inicio, precio_base FROM habitaciones WHERE tuya_device_id = $1`,
      [deviceId]
    );
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findAllWithTodayCounts(): Promise<Room[]> {
    const today = Shift.toArgentinaDateString(new Date());

    const query = `
      SELECT 
        h.id, 
        h.nombre, 
        h.tuya_device_id, 
        h.estado_actual, 
        h.turno_actual_inicio,
        h.limpieza_inicio,
        COALESCE(h.precio_base, 12000)::numeric AS precio_base,
        COALESCE(COUNT(t.id), 0)::int AS turnos_hoy_count
      FROM habitaciones h
      LEFT JOIN turnos t ON t.habitacion_id = h.id AND t.fecha = $1::date AND t.tipo = 'TURNO'
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
      r.limpieza_inicio ? new Date(r.limpieza_inicio) : null,
      Number(r.precio_base) || 12000,
      r.turnos_hoy_count
    ));
  }

  async updateStatus(
    id: number, 
    status: RoomStatus, 
    startTime: Date | null, 
    cleaningStartTime: Date | null = null
  ): Promise<void> {
    await this.pool.query(
      `UPDATE habitaciones 
       SET estado_actual = $1, turno_actual_inicio = $2, limpieza_inicio = $3, updated_at = NOW() 
       WHERE id = $4`,
      [status, startTime, cleaningStartTime, id]
    );
  }

  private mapToEntity(row: any): Room {
    return new Room(
      row.id,
      row.nombre,
      row.tuya_device_id,
      row.estado_actual as RoomStatus,
      row.turno_actual_inicio ? new Date(row.turno_actual_inicio) : null,
      row.limpieza_inicio ? new Date(row.limpieza_inicio) : null,
      Number(row.precio_base) || 12000
    );
  }
}

export class PostgresShiftRepository implements IShiftRepository {
  constructor(private pool: Pool) {}

  async createShift(data: ShiftCreateData): Promise<Shift> {
    const res = await this.pool.query(
      `INSERT INTO turnos (habitacion_id, hora_inicio, hora_fin, duracion_minutos, fecha, tipo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, habitacion_id, hora_inicio, hora_fin, duracion_minutos, fecha, tipo`,
      [data.habitacionId, data.horaInicio, data.horaFin, data.duracionMinutos, data.fecha, data.tipo]
    );
    const row = res.rows[0];
    return new Shift(
      row.id,
      row.habitacion_id,
      new Date(row.hora_inicio),
      new Date(row.hora_fin),
      row.duracion_minutos,
      row.fecha,
      row.tipo
    );
  }

  async findByDate(fecha: string): Promise<Shift[]> {
    const res = await this.pool.query(
      `SELECT id, habitacion_id, hora_inicio, hora_fin, duracion_minutos, fecha::text, tipo 
       FROM turnos 
       WHERE fecha = $1::date 
       ORDER BY hora_inicio ASC`,
      [fecha]
    );
    return res.rows.map((r) => new Shift(
      r.id,
      r.habitacion_id,
      new Date(r.hora_inicio),
      new Date(r.hora_fin),
      r.duracion_minutos,
      r.fecha,
      r.tipo || 'TURNO'
    ));
  }

  async findByRoomAndDate(habitacionId: number, fecha: string): Promise<Shift[]> {
    const res = await this.pool.query(
      `SELECT id, habitacion_id, hora_inicio, hora_fin, duracion_minutos, fecha::text, tipo 
       FROM turnos 
       WHERE habitacion_id = $1 AND fecha = $2::date 
       ORDER BY hora_inicio ASC`,
      [habitacionId, fecha]
    );
    return res.rows.map((r) => new Shift(
      r.id,
      r.habitacion_id,
      new Date(r.hora_inicio),
      new Date(r.hora_fin),
      r.duracion_minutos,
      r.fecha,
      r.tipo || 'TURNO'
    ));
  }
}

export class PostgresProductRepository implements IProductRepository {
  constructor(private pool: Pool) {}

  async findAll(): Promise<ProductDTO[]> {
    const res = await this.pool.query(
      `SELECT id, nombre, precio::numeric, stock FROM productos ORDER BY id ASC`
    );
    return res.rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      precio: Number(r.precio),
      stock: r.stock
    }));
  }

  async create(nombre: string, precio: number, stock: number): Promise<ProductDTO> {
    const res = await this.pool.query(
      `INSERT INTO productos (nombre, precio, stock) VALUES ($1, $2, $3) RETURNING id, nombre, precio::numeric, stock`,
      [nombre, precio, stock]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      nombre: r.nombre,
      precio: Number(r.precio),
      stock: r.stock
    };
  }

  async updateStock(id: number, delta: number): Promise<ProductDTO> {
    const res = await this.pool.query(
      `UPDATE productos 
       SET stock = GREATEST(0, stock + $1) 
       WHERE id = $2 
       RETURNING id, nombre, precio::numeric, stock`,
      [delta, id]
    );
    if (res.rows.length === 0) {
      throw new Error(`Producto ${id} no encontrado`);
    }
    const r = res.rows[0];
    return {
      id: r.id,
      nombre: r.nombre,
      precio: Number(r.precio),
      stock: r.stock
    };
  }

  async getConsumptionsByRoom(roomId: number): Promise<ConsumptionItemDTO[]> {
    const res = await this.pool.query(
      `SELECT c.id, c.producto_id, p.nombre, c.precio_unitario::numeric, c.cantidad
       FROM consumos c
       JOIN productos p ON p.id = c.producto_id
       WHERE c.habitacion_id = $1 AND c.turno_id IS NULL
       ORDER BY c.created_at ASC`,
      [roomId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      productoId: r.producto_id,
      nombre: r.nombre,
      precioUnitario: Number(r.precio_unitario),
      cantidad: r.cantidad
    }));
  }

  async addConsumption(roomId: number, productId: number): Promise<{ consumption: ConsumptionItemDTO; newStock: number }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener producto y descontar stock
      const prodRes = await client.query(
        `SELECT id, nombre, precio::numeric, stock FROM productos WHERE id = $1 FOR UPDATE`,
        [productId]
      );
      if (prodRes.rows.length === 0) {
        throw new Error('Producto no existe');
      }
      const prod = prodRes.rows[0];
      const newStock = Math.max(0, prod.stock - 1);
      await client.query(`UPDATE productos SET stock = $1 WHERE id = $2`, [newStock, productId]);

      // 2. Insertar o incrementar consumo activo (turno_id IS NULL)
      const existingRes = await client.query(
        `SELECT id, cantidad FROM consumos WHERE habitacion_id = $1 AND producto_id = $2 AND turno_id IS NULL LIMIT 1`,
        [roomId, productId]
      );

      let consumptionId: number;
      let cantidadTotal: number;

      if (existingRes.rows.length > 0) {
        consumptionId = existingRes.rows[0].id;
        cantidadTotal = existingRes.rows[0].cantidad + 1;
        await client.query(`UPDATE consumos SET cantidad = $1 WHERE id = $2`, [cantidadTotal, consumptionId]);
      } else {
        cantidadTotal = 1;
        const insRes = await client.query(
          `INSERT INTO consumos (habitacion_id, turno_id, producto_id, cantidad, precio_unitario)
           VALUES ($1, NULL, $2, $3, $4)
           RETURNING id`,
          [roomId, productId, cantidadTotal, prod.precio]
        );
        consumptionId = insRes.rows[0].id;
      }

      await client.query('COMMIT');

      return {
        consumption: {
          id: consumptionId,
          productoId: prod.id,
          nombre: prod.nombre,
          precioUnitario: Number(prod.precio),
          cantidad: cantidadTotal
        },
        newStock
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async assignConsumptionsToShift(roomId: number, shiftId: number): Promise<void> {
    await this.pool.query(
      `UPDATE consumos SET turno_id = $1 WHERE habitacion_id = $2 AND turno_id IS NULL`,
      [shiftId, roomId]
    );
  }

  async getConsumptionsForShifts(shiftIds: number[]): Promise<Map<number, ShiftItemSummary[]>> {
    const map = new Map<number, ShiftItemSummary[]>();
    if (shiftIds.length === 0) return map;

    const res = await this.pool.query(
      `SELECT c.turno_id, p.nombre, c.cantidad, c.precio_unitario::numeric
       FROM consumos c
       JOIN productos p ON p.id = c.producto_id
       WHERE c.turno_id = ANY($1)
       ORDER BY c.turno_id, c.id`,
      [shiftIds]
    );

    for (const row of res.rows) {
      const shiftId = row.turno_id;
      if (!map.has(shiftId)) {
        map.set(shiftId, []);
      }
      map.get(shiftId)!.push({
        nombre: row.nombre,
        cantidad: row.cantidad,
        precioUnitario: Number(row.precio_unitario)
      });
    }

    return map;
  }
}
