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
          limpiezaInicio: null
        }
      });
      return;
    }

    // ESCENARIO 2: Llave bajada (OFF) -> Fin de ocupación / paso a limpieza
    if (switchValue === false) {
      if (!room.isOccupied()) {
        console.log(`[Idempotencia] Habitación ${room.nombre} ya no está OCUPADA. Ignorando evento.`);
        return;
      }

      const inicio = room.turnoActualInicio ? new Date(room.turnoActualInicio) : eventDate;
      const duracionMinutos = Shift.calculateDurationMinutes(inicio, eventDate);
      const tipo = Shift.classify(duracionMinutos); // <= 15m limpieza, > 15m turno
      const isOvertime = Shift.isOvertime(duracionMinutos); // > 120m (2 horas)
      
      const fechaBase = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/Argentina/Buenos_Aires' 
      }).format(inicio);

      // Registrar en base de datos con su clasificación
      const shift = await this.shiftRepo.createShift({
        habitacionId: room.id,
        horaInicio: inicio,
        horaFin: eventDate,
        duracionMinutos,
        fecha: fechaBase,
        tipo
      });

      // Vincular consumos de minibar a este turno
      await this.productRepo.assignConsumptionsToShift(room.id, shift.id);

      // Pasar la habitación a estado LIMPIANDO
      await this.roomRepo.updateStatus(room.id, 'LIMPIANDO', null, eventDate);

      // Notificación inmediata Telegram
      await this.notifier.sendShiftAlert({
        roomName: room.nombre,
        action: 'FIN',
        timestamp: eventDate,
        durationMinutes: duracionMinutos,
        tipo,
        isOvertime
      });

      // Streaming PWA
      this.sse.broadcast({
        type: 'ROOM_STATUS_CHANGED',
        timestamp: eventDate.toISOString(),
        data: {
          roomId: room.id,
          nombre: room.nombre,
          nuevoEstado: 'LIMPIANDO',
          turnoInicio: null,
          limpiezaInicio: eventDate.toISOString(),
          duracionUltimoTurno: duracionMinutos
        }
      });
    }
  }
}
