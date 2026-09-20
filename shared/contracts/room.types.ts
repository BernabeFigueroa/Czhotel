export type RoomStatus = 'LIBRE' | 'OCUPADA' | 'LIMPIANDO';

export interface RoomDTO {
  id: number;
  nombre: string;
  tuyaDeviceId: string;
  estadoActual: RoomStatus;
  turnoActualInicio: string | null; // ISO 8601 UTC
  limpiezaInicio: string | null;     // ISO 8601 UTC
  precioBase: number;
  categoria?: string;
  turnosHoyCount: number;
}
