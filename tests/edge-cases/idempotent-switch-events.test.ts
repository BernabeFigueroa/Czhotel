import { describe, it, expect, vi } from 'vitest';
import { HandleTuyaStatusReportUseCase } from '../../backend/src/application/use-cases/HandleTuyaStatusReport';

describe('[QA Edge Case] Idempotencia y Tolerancia a Fallos IoT Tuya', () => {
  it('TC-02: si el relé retransmite evento ON (true) no debe resetear el turno activo', async () => {
    const horaInicial = new Date('2026-09-16T14:00:00.000Z');

    const mockRoomRepo = {
      findByTuyaDeviceId: vi.fn().mockResolvedValue({
        id: 5,
        nombre: 'Habitación 5',
        estadoActual: 'OCUPADA',
        turnoActualInicio: horaInicial,
        isOccupied: () => true
      }),
      updateStatus: vi.fn(),
      findAllWithTodayCounts: vi.fn(),
      findById: vi.fn()
    };

    const mockShiftRepo = { createShift: vi.fn(), findByDate: vi.fn(), findByRoomAndDate: vi.fn() };
    const mockNotifier = { sendShiftAlert: vi.fn(), sendDailySummary: vi.fn() };
    const mockSse = { broadcast: vi.fn() };

    const useCase = new HandleTuyaStatusReportUseCase(
      mockRoomRepo as any,
      mockShiftRepo as any,
      mockNotifier as any,
      mockSse as any
    );

    // Segundo evento ON 10 minutos después
    const timestampRetransmision = new Date('2026-09-16T14:10:00.000Z').getTime();
    await useCase.execute('tuya_dev_hab_05', true, timestampRetransmision);

    // Verificación de invariante: no se debe alterar la base de datos ni emitir falsas alertas
    expect(mockRoomRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockNotifier.sendShiftAlert).not.toHaveBeenCalled();
    expect(mockSse.broadcast).not.toHaveBeenCalled();
  });

  it('TC-03: si se recibe evento OFF (false) de una habitación ya LIBRE no debe generar turno huérfano', async () => {
    const mockRoomRepo = {
      findByTuyaDeviceId: vi.fn().mockResolvedValue({
        id: 8,
        nombre: 'Habitación 8',
        estadoActual: 'LIBRE',
        turnoActualInicio: null,
        isOccupied: () => false
      }),
      updateStatus: vi.fn(),
      findAllWithTodayCounts: vi.fn(),
      findById: vi.fn()
    };

    const mockShiftRepo = { createShift: vi.fn(), findByDate: vi.fn(), findByRoomAndDate: vi.fn() };
    const mockNotifier = { sendShiftAlert: vi.fn(), sendDailySummary: vi.fn() };
    const mockSse = { broadcast: vi.fn() };

    const useCase = new HandleTuyaStatusReportUseCase(
      mockRoomRepo as any,
      mockShiftRepo as any,
      mockNotifier as any,
      mockSse as any
    );

    await useCase.execute('tuya_dev_hab_08', false, Date.now());

    expect(mockShiftRepo.createShift).not.toHaveBeenCalled();
    expect(mockRoomRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockNotifier.sendShiftAlert).not.toHaveBeenCalled();
  });
});
