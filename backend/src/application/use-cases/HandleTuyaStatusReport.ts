import { IRoomRepository } from '../ports/IRoomRepository';
import { IShiftRepository } from '../ports/IShiftRepository';
import { IProductRepository } from '../ports/IProductRepository';
import { INotificationService } from '../ports/INotificationService';
import { Shift } from '../../domain/entities/Shift';

export interface SSEBroadcaster {
  broadcast(event: any): void;
}

export class HandleTuyaStatusReportUseCase {
  constructor(
    private roomRepo: IRoomRepository,
    private shiftRepo: IShiftRepository,
    private productRepo: IProductRepository,
    private notifier: INotificationService,
    private sse: SSEBroadcaster
  ) {}

  async execute(tuyaDeviceId: string, switchValue: boolean, eventTimestampMs: number): Promise<void> {
    const room = await this.roomRepo.findByTuyaDeviceId(tuyaDeviceId);
    if (!room) {
      console.warn(`[TuyaIoT] Dispositivo no registrado en base de datos: ${tuyaDeviceId}`);
      return;
    }

    const eventDate = new Date(eventTimestampMs);

    // ESCENARIO 1: Llave subida (ON) -> Inicio de ocupación
    if (switchValue === true) {
      if (room.isOccupied()) {
        console.log(`[Idempotencia] Habitación ${room.nombre} ya está OCUPADA. Ignorando evento.`);
        return;
      }

      await this.roomRepo.updateStatus(room.id, 'OCUPADA', eventDate, null);
      await this.roomRepo.updateVehicle(room.id, 'AUTO');

      // Notificación inmediata
      await this.notifier.sendShiftAlert({
        roomName: room.nombre,
        action: 'INICIO',
        timestamp: eventDate
      });

      // Streaming PWA
      this.sse.broadcast({
        type: 'ROOM_STATUS_CHANGED',
        timestamp: eventDate.toISOString(),
        data: {
          roomId: room.id,
          nombre: room.nombre,
          nuevoEstado: 'OCUPADA',
          turnoInicio: eventDate.toISOString(),
          limpiezaInicio: null,
          vehiculo: 'AUTO'
        }
      });
      return;
    }

    // ESCENARIO 2: Llave bajada (OFF) -> Fin de ocupación / paso a LIBRE
    if (switchValue === false) {
      if (!room.isOccupied()) {
        console.log(`[Idempotencia] Habitación ${room.nombre} ya no está OCUPADA. Ignorando evento.`);
        return;
      }

      const inicio = room.turnoActualInicio ? new Date(room.turnoActualInicio) : eventDate;
      const duracionMinutos = Shift.calculateDurationMinutes(inicio, eventDate);
      const tipo = Shift.classify(duracionMinutos); // <= 15m limpieza, > 15m turno
      const isOvertime = Shift.isOvertime(duracionMinutos); // > 120m (2 horas)
      const turnosCount = Shift.calculateTurnosCount(duracionMinutos);
      
      const fechaBase = Shift.toArgentinaDateString(eventDate);

      // Registrar en base de datos con su clasificación
      const shift = await this.shiftRepo.createShift({
        habitacionId: room.id,
        horaInicio: inicio,
        horaFin: eventDate,
        duracionMinutos,
        fecha: fechaBase,
        tipo,
        vehiculo: room.vehiculo || 'AUTO'
      });

      // Vincular consumos de minibar a este turno
      await this.productRepo.assignConsumptionsToShift(room.id, shift.id);

      // Pasar la habitación a estado LIBRE directamente (modelo binario) y resetear vehiculo
      await this.roomRepo.updateStatus(room.id, 'LIBRE', null, null);
      await this.roomRepo.updateVehicle(room.id, 'AUTO');

      // Notificación inmediata Telegram
      await this.notifier.sendShiftAlert({
        roomName: room.nombre,
        action: 'FIN',
        timestamp: eventDate,
        durationMinutes: duracionMinutos,
        tipo,
        isOvertime,
        turnosCount,
        vehiculo: room.vehiculo || 'AUTO'
      });

      // Streaming PWA
      this.sse.broadcast({
        type: 'ROOM_STATUS_CHANGED',
        timestamp: eventDate.toISOString(),
        data: {
          roomId: room.id,
          nombre: room.nombre,
          nuevoEstado: 'LIBRE',
          turnoInicio: null,
          limpiezaInicio: null,
          duracionUltimoTurno: duracionMinutos
        }
      });
    }
  }
}
