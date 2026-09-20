export type RoomStatus = 'LIBRE' | 'OCUPADA' | 'LIMPIANDO';

export class Room {
  constructor(
    public readonly id: number,
    public readonly nombre: string,
    public readonly tuyaDeviceId: string,
    public estadoActual: RoomStatus,
    public turnoActualInicio: Date | null,
    public limpiezaInicio: Date | null = null,
    public readonly precioBase: number = 35000,
    public readonly turnosHoyCount: number = 0,
    public readonly categoria: string = ''
  ) {}

  public occupy(startTime: Date): void {
    this.estadoActual = 'OCUPADA';
    this.turnoActualInicio = startTime;
    this.limpiezaInicio = null;
  }

  public startCleaning(startTime: Date): void {
    this.estadoActual = 'LIMPIANDO';
    this.turnoActualInicio = null;
    this.limpiezaInicio = startTime;
  }

  public release(): void {
    this.estadoActual = 'LIBRE';
    this.turnoActualInicio = null;
    this.limpiezaInicio = null;
  }

  public isOccupied(): boolean {
    return this.estadoActual === 'OCUPADA';
  }

  public isCleaning(): boolean {
    return this.estadoActual === 'LIMPIANDO';
  }
}
