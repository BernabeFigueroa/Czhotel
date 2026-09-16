import { describe, it, expect } from 'vitest';
import { Shift } from '../../backend/src/domain/entities/Shift';

describe('[QA Unit] Cálculo de Duración de Turnos (Shift Entity)', () => {
  it('debe calcular exactamente los minutos de un turno estándar', () => {
    const inicio = new Date('2026-09-16T14:00:00.000Z');
    const fin = new Date('2026-09-16T15:45:00.000Z'); // 1 hora y 45 minutos = 105 min

    const duracion = Shift.calculateDurationMinutes(inicio, fin);
    expect(duracion).toBe(105);
  });

  it('debe retornar 0 minutos si la diferencia es de pocos segundos', () => {
    const inicio = new Date('2026-09-16T14:00:00.000Z');
    const fin = new Date('2026-09-16T14:00:15.000Z'); // 15 segundos

    const duracion = Shift.calculateDurationMinutes(inicio, fin);
    expect(duracion).toBe(0);
  });

  it('no debe permitir duraciones negativas ante inconsistencias temporales', () => {
    const inicio = new Date('2026-09-16T16:00:00.000Z');
    const fin = new Date('2026-09-16T15:00:00.000Z'); // Fin menor que inicio

    const duracion = Shift.calculateDurationMinutes(inicio, fin);
    expect(duracion).toBe(0);
  });
});
