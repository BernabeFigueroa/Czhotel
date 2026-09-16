import { IRoomRepository } from '../ports/IRoomRepository';
import { IShiftRepository } from '../ports/IShiftRepository';
import { INotificationService } from '../ports/INotificationService';
import { Shift } from '../../domain/entities/Shift';

export interface SSEBroadcaster {
  broadcast(event: any): void;
}

export class HandleTuyaStatusReportUseCase {
  constructor(
    private roomRepo: IRoomRepository,
    private shiftRepo: IShiftRepository,
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

    // ESCENARIO 1: Llave subida (ON) -> Inicio de Turno
    if (switchValue === true) {
      if (room.isOccupied()) {
        console.log(`[Idempotencia] Habitación ${room.nombre} ya está OCUPADA. Ignorando evento.`);
        return;
      }

      await this.roomRepo.updateStatus(room.id, 'OCUPADA', eventDate);

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
          turnoInicio: eventDate.toISOString()
        }
      });
      return;
    }

    // ESCENARIO 2: Llave bajada (OFF) -> Fin de Turno
    if (switchValue === false) {
      if (!room.isOccupied()) {
        console.log(`[Idempotencia] Habitación ${room.nombre} ya está LIBRE. Ignorando evento.`);
        return;
      }

      const inicio = room.turnoActualInicio ? new Date(room.turnoActualInicio) : eventDate;
      const duracionMinutos = Shift.calculateDurationMinutes(inicio, eventDate);
      const fechaBase = inicio.toISOString().split('T')[0];

      // Registrar turno finalizado
      await this.shiftRepo.createShift({
        habitacionId: room.id,
        horaInicio: inicio,
        horaFin: eventDate,
        duracionMinutos,
        fecha: fechaBase
      });

      // Actualizar estado de la habitación
      await this.roomRepo.updateStatus(room.id, 'LIBRE', null);

      // Notificación inmediata Telegram
      await this.notifier.sendShiftAlert({
        roomName: room.nombre,
        action: 'FIN',
        timestamp: eventDate,
        durationMinutes: duracionMinutos
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
          duracionUltimoTurno: duracionMinutos
        }
      });
    }
  }
}
