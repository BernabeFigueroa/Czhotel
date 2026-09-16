export interface ShiftAlertPayload {
  roomName: string;
  action: 'INICIO' | 'FIN';
  timestamp: Date;
  durationMinutes?: number;
}

export interface INotificationService {
  sendShiftAlert(payload: ShiftAlertPayload): Promise<void>;
  sendDailySummary(reportText: string): Promise<void>;
}
