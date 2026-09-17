import { IShiftRepository } from '../ports/IShiftRepository';
import { INotificationService } from '../ports/INotificationService';
import { IRoomRepository } from '../ports/IRoomRepository';

export class GenerateDailySummaryUseCase {
  constructor(
    private shiftRepo: IShiftRepository,
    private roomRepo: IRoomRepository,
    private notifier: INotificationService
  ) {}

  async execute(dateStr?: string): Promise<string> {
    const targetDate = dateStr || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
    const shifts = await this.shiftRepo.findByDate(targetDate);
    const rooms = await this.roomRepo.findAllWithTodayCounts();

    if (shifts.length === 0) {
      const emptyMsg = `No se registraron turnos en la fecha ${targetDate}.`;
      await this.notifier.sendDailySummary(emptyMsg);
      return emptyMsg;
    }

    let report = `📅 Fecha: ${targetDate}\nTotal de turnos: ${shifts.length}\n\n`;

    // Agrupar por habitación
    const roomMap = new Map<number, typeof shifts>();
    for (const shift of shifts) {
      const list = roomMap.get(shift.habitacionId) || [];
      list.push(shift);
      roomMap.set(shift.habitacionId, list);
    }

    for (const room of rooms) {
      const roomShifts = roomMap.get(room.id) || [];
      report += `🏨 *${room.nombre.toUpperCase()}* (${roomShifts.length} turnos):\n`;
      if (roomShifts.length === 0) {
        report += `  - Sin actividad\n`;
      } else {
        for (const s of roomShifts) {
          const inicio = s.horaInicio.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires'
          });
          const fin = s.horaFin.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires'
          });
          const horas = Math.floor(s.duracionMinutos / 60);
          const mins = s.duracionMinutos % 60;
          const duracion = horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
          report += `  • ${inicio} a ${fin} (${duracion})\n`;
        }
      }
      report += `\n`;
    }

    await this.notifier.sendDailySummary(report);
    return report;
  }
}
