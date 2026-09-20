import { ShiftType } from '../../domain/entities/Shift';

export interface ShiftAlertPayload {
  roomName: string;
  action: 'INICIO' | 'FIN';
  timestamp: Date;
  durationMinutes?: number;
  tipo?: ShiftType;
  isOvertime?: boolean;
  turnosCount?: number;
}

export interface INotificationService {
  sendShiftAlert(payload: ShiftAlertPayload): Promise<void>;
  sendDailySummary(reportText: string): Promise<void>;
}
