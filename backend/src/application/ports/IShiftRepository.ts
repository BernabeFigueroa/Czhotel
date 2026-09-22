import { Shift, ShiftType } from '../../domain/entities/Shift';

export interface ShiftCreateData {
  habitacionId: number;
  horaInicio: Date;
  horaFin: Date;
  duracionMinutos: number;
  fecha: string;
  tipo: ShiftType;
  vehiculo?: string;
}

export interface IShiftRepository {
  createShift(data: ShiftCreateData): Promise<Shift>;
  findByDate(fecha: string): Promise<Shift[]>;
  findByRoomAndDate(habitacionId: number, fecha: string): Promise<Shift[]>;
}
