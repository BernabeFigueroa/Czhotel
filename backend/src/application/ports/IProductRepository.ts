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

export interface ShiftItemSummary {
  productoId?: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal?: number;
}

export interface IProductRepository {
  findAll(): Promise<ProductDTO[]>;
  create(nombre: string, precio: number, stock: number): Promise<ProductDTO>;
  updateStock(id: number, delta: number): Promise<ProductDTO>;
  getConsumptionsByRoom(roomId: number): Promise<ConsumptionItemDTO[]>;
  addConsumption(roomId: number, productId: number): Promise<{ consumption: ConsumptionItemDTO; newStock: number }>;
  assignConsumptionsToShift(roomId: number, shiftId: number): Promise<void>;
  getConsumptionsForShifts(shiftIds: number[]): Promise<Map<number, ShiftItemSummary[]>>;
}
