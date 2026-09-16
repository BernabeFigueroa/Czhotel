import { RoomStatus } from './room.types';

export interface RoomStateChangedEvent {
  type: 'ROOM_STATUS_CHANGED';
  timestamp: string;
  data: {
    roomId: number;
    nombre: string;
    nuevoEstado: RoomStatus;
    turnoInicio: string | null;
    duracionUltimoTurno?: number;
  };
}

export type WebSocketOrSSEEvent = RoomStateChangedEvent;
