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

  it('debe calcular correctamente la cantidad de turnos según la duración', () => {
    // Menor o igual a 15 min -> 0 turnos (limpieza / mantenimiento)
    expect(Shift.calculateTurnosCount(10)).toBe(0);
    expect(Shift.calculateTurnosCount(15)).toBe(0);

    // 16 min a 159 min (2h 39m) -> 1 turno
    expect(Shift.calculateTurnosCount(30)).toBe(1);
    expect(Shift.calculateTurnosCount(120)).toBe(1); // 2 horas exactas
    expect(Shift.calculateTurnosCount(159)).toBe(1); // 2 horas 39 min

    // 160 min (2h 40m) en adelante -> 2 turnos
    expect(Shift.calculateTurnosCount(160)).toBe(2); // 2 horas 40 min
    expect(Shift.calculateTurnosCount(200)).toBe(2);
    expect(Shift.calculateTurnosCount(279)).toBe(2); // 4 horas 39 min

    // 280 min (4h 40m) en adelante -> 3 turnos
    expect(Shift.calculateTurnosCount(280)).toBe(3);
  });
});
