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

  it('TC-01.B: la fecha contable debe pertenecer a la jornada de inicio en huso horario argentino', () => {
    // 23:55 de Argentina del 16 de Septiembre = 02:55 UTC del 17 de Septiembre
    const inicioAntesMedianoche = new Date('2026-09-17T02:55:00.000Z');
    expect(Shift.toArgentinaDateString(inicioAntesMedianoche)).toBe('2026-09-16');

    // 00:05 de Argentina del 17 de Septiembre = 03:05 UTC del 17 de Septiembre
    const inicioPasadaMedianoche = new Date('2026-09-17T03:05:00.000Z');
    expect(Shift.toArgentinaDateString(inicioPasadaMedianoche)).toBe('2026-09-17');
  });
});
