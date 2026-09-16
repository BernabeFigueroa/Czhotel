export type RoomStatus = 'LIBRE' | 'OCUPADA';

export class Room {
  constructor(
    public readonly id: number,
    public readonly nombre: string,
    public readonly tuyaDeviceId: string,
    public estadoActual: RoomStatus,
    public turnoActualInicio: Date | null,
    public readonly turnosHoyCount: number = 0
  ) {}

  public occupy(startTime: Date): void {
    this.estadoActual = 'OCUPADA';
    this.turnoActualInicio = startTime;
  }

  public release(): void {
    this.estadoActual = 'LIBRE';
    this.turnoActualInicio = null;
  }

  public isOccupied(): boolean {
    return this.estadoActual === 'OCUPADA';
  }
}
