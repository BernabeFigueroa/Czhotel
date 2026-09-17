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

    // ESCENARIO 1: Llave subida (ON) -> Inicio de ocupación
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

    // ESCENARIO 2: Llave bajada (OFF) -> Fin de ocupación / limpieza
    if (switchValue === false) {
      if (!room.isOccupied()) {
        console.log(`[Idempotencia] Habitación ${room.nombre} ya está LIBRE. Ignorando evento.`);
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
      await this.shiftRepo.createShift({
        habitacionId: room.id,
        horaInicio: inicio,
        horaFin: eventDate,
        duracionMinutos,
        fecha: fechaBase,
        tipo
      });

      // Liberar la habitación
      await this.roomRepo.updateStatus(room.id, 'LIBRE', null);

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
          nuevoEstado: 'LIBRE',
          turnoInicio: null,
          duracionUltimoTurno: duracionMinutos
        }
      });
    }
  }
}
