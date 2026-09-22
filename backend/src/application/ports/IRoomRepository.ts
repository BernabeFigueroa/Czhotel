import { Room, RoomStatus } from '../../domain/entities/Room';

export interface IRoomRepository {
  findById(id: number): Promise<Room | null>;
  findByTuyaDeviceId(deviceId: string): Promise<Room | null>;
  findAllWithTodayCounts(): Promise<Room[]>;
  updateStatus(id: number, status: RoomStatus, startTime: Date | null, cleaningStartTime?: Date | null): Promise<void>;
  updateVehicle(id: number, vehiculo: string): Promise<void>;
}
