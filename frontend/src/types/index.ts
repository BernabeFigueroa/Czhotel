export type RoomStatus = 'LIBRE' | 'OCUPADA' | 'LIMPIANDO';

export interface RoomDTO {
  id: number;
  nombre: string;
  tuyaDeviceId: string;
  estadoActual: RoomStatus;
  turnoActualInicio: string | null;
  limpiezaInicio: string | null;
  precioBase: number;
  categoria?: string;
  turnosHoyCount: number;
}

export interface ProductDTO {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
}

export interface ConsumptionItemDTO {
  id: number;
  productoId: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

export interface RoomConsumptionDTO {
  roomId: number;
  items: ConsumptionItemDTO[];
  total: number;
}

export type ShiftType = 'TURNO' | 'LIMPIEZA';

export interface ShiftItemSummary {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface ShiftDTO {
  id: number;
  habitacionId: number;
  habitacionNombre?: string;
  horaInicio: string;
  horaFin: string;
  duracionMinutos: number;
  fecha: string;
  tipo: ShiftType;
  items?: ShiftItemSummary[];
}
