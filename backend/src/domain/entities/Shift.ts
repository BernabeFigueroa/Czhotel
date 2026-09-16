export class Shift {
  constructor(
    public readonly id: number,
    public readonly habitacionId: number,
    public readonly horaInicio: Date,
    public readonly horaFin: Date,
    public readonly duracionMinutos: number,
    public readonly fecha: string
  ) {}

  public static calculateDurationMinutes(start: Date, end: Date): number {
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    return Math.round(diffMs / (1000 * 60));
  }
}
