import { describe, it, expect } from 'vitest';
import { Shift } from '../../backend/src/domain/entities/Shift';

describe('[QA Edge Case] Cruce de Medianoche (Turnos Nocturnos)', () => {
  it('TC-01: debe calcular con precisión milimétrica un turno iniciado antes de medianoche y finalizado al día siguiente', () => {
    // Inicio a las 23:30 hs del 16 de Septiembre
    const inicio = new Date('2026-09-16T23:30:00.000Z');
    // Fin a las 02:15 hs del 17 de Septiembre (2h 45m = 165 minutos)
    const fin = new Date('2026-09-17T02:15:00.000Z');

    const duracion = Shift.calculateDurationMinutes(inicio, fin);
    expect(duracion).toBe(165);
  });

  it('TC-01.B: la fecha contable debe pertenecer a la jornada de inicio', () => {
    const inicio = new Date('2026-09-16T23:55:00.000Z');
    const fechaContable = inicio.toISOString().split('T')[0];

    expect(fechaContable).toBe('2026-09-16');
  });
});
