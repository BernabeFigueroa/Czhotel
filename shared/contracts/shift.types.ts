export type ShiftType = 'TURNO' | 'LIMPIEZA';

export interface ShiftDTO {
  id: number;
  habitacionId: number;
  habitacionNombre?: string;
  horaInicio: string; // ISO 8601 UTC
  horaFin: string;    // ISO 8601 UTC
  duracionMinutos: number;
  fecha: string;      // YYYY-MM-DD
  tipo: ShiftType;
}

export interface ShiftCreateInput {
  habitacionId: number;
  horaInicio: Date;
  horaFin: Date;
  duracionMinutos: number;
  fecha: string;
  tipo: ShiftType;
}
