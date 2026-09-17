import { ProductDTO, ConsumptionItemDTO, ShiftItemSummary } from '../../../../shared';

export interface IProductRepository {
  findAll(): Promise<ProductDTO[]>;
  create(nombre: string, precio: number, stock: number): Promise<ProductDTO>;
  updateStock(id: number, delta: number): Promise<ProductDTO>;
  getConsumptionsByRoom(roomId: number): Promise<ConsumptionItemDTO[]>;
  addConsumption(roomId: number, productId: number): Promise<{ consumption: ConsumptionItemDTO; newStock: number }>;
  assignConsumptionsToShift(roomId: number, shiftId: number): Promise<void>;
  getConsumptionsForShifts(shiftIds: number[]): Promise<Map<number, ShiftItemSummary[]>>;
}
