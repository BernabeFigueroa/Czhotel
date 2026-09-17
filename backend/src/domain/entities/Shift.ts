export type ShiftType = 'TURNO' | 'LIMPIEZA';

export class Shift {
  constructor(
    public readonly id: number,
    public readonly habitacionId: number,
    public readonly horaInicio: Date,
    public readonly horaFin: Date,
    public readonly duracionMinutos: number,
    public readonly fecha: string,
    public readonly tipo: ShiftType = 'TURNO'
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
}
