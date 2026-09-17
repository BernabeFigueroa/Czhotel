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
