export type ShiftType = 'TURNO' | 'LIMPIEZA';

export class Shift {
  constructor(
    public readonly id: number,
    public readonly habitacionId: number,
    public readonly horaInicio: Date,
    public readonly horaFin: Date,
    public readonly duracionMinutos: number,
    public readonly fecha: string,
    public readonly tipo: ShiftType = 'TURNO',
    public readonly vehiculo: string = 'AUTO'
  ) {}

  public static calculateDurationMinutes(start: Date, end: Date): number {
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    return Math.round(diffMs / (1000 * 60));
  }

  // Tolerancia: <= 15 minutos se considera limpieza / mantenimiento
  public static classify(durationMinutes: number): ShiftType {
    return durationMinutes <= 15 ? 'LIMPIEZA' : 'TURNO';
  }

  // Turnos estándar son de 2 horas (120 minutos)
  public static isOvertime(durationMinutes: number): boolean {
    return durationMinutes > 120;
  }

  // Cómputo de cantidad de turnos:
  // <= 15 min: 0 (limpieza o mantenimiento no facturable)
  // 16 a 159 min: 1 turno estándar (con tolerancia de hasta 2h 39m)
  // >= 160 min (2h 40m): 2 turnos (y +1 por cada ciclo de 2 horas adicionales)
  public static calculateTurnosCount(durationMinutes: number): number {
    if (durationMinutes <= 15) return 0;
    if (durationMinutes < 160) return 1;
    return 1 + Math.floor((durationMinutes - 160) / 120) + 1;
  }

  // Formateador estándar de fecha contable en zona horaria de Argentina (YYYY-MM-DD)
  public static toArgentinaDateString(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'America/Argentina/Buenos_Aires' 
    }).format(date);
  }
}
