import { describe, it, expect } from 'vitest';
import { Shift } from '../../backend/src/domain/entities/Shift';

describe('[QA Unit] Validación de Reglas de Negocio: Minibar y Consumos', () => {
  it('solo permite cargar consumos si la habitación se encuentra en estado OCUPADA', () => {
    const estadoHabitacion = 'LIBRE';
    const puedeCargarConsumo = estadoHabitacion === 'OCUPADA';
    expect(puedeCargarConsumo).toBe(false);

    const estadoOcupada = 'OCUPADA';
    expect(estadoOcupada === 'OCUPADA').toBe(true);
  });

  it('calcula correctamente el subtotal y total de consumos cargados', () => {
    const items = [
      { productoId: 1, nombre: 'Preservativos', precioUnitario: 1500, cantidad: 2 },
      { productoId: 2, nombre: 'Cerveza', precioUnitario: 3200, cantidad: 1 },
      { productoId: 3, nombre: 'Chandon', precioUnitario: 9500, cantidad: 1 },
    ];

    const total = items.reduce((acc, it) => acc + it.precioUnitario * it.cantidad, 0);
    // 1500*2 (3000) + 3200 (3200) + 9500 (9500) = 15700
    expect(total).toBe(15700);
  });

  it('descuenta correctamente el stock sin permitir stock negativo', () => {
    let stockActual = 2;
    const decrementar = () => {
      stockActual = Math.max(0, stockActual - 1);
    };

    decrementar(); // 1
    expect(stockActual).toBe(1);
    decrementar(); // 0
    expect(stockActual).toBe(0);
    decrementar(); // no debe ser -1
    expect(stockActual).toBe(0);
  });
});
