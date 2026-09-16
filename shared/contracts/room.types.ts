export type RoomStatus = 'LIBRE' | 'OCUPADA';

export interface RoomDTO {
  id: number;
  nombre: string;
  tuyaDeviceId: string;
  estadoActual: RoomStatus;
  turnoActualInicio: string | null; // ISO 8601 UTC
  turnosHoyCount: number;
}
