import cron from 'node-cron';
import { GenerateDailySummaryUseCase } from '../../application/use-cases/GenerateDailySummary';

export class DailySummaryJob {
  constructor(private useCase: GenerateDailySummaryUseCase) {}

  public start(): void {
    // Todos los días a las 06:00 AM (cierre típico de jornada nocturna de motel)
    cron.schedule('0 6 * * *', async () => {
      console.log('[DailySummaryJob] Ejecutando generación de resumen diario (06:00 AM)...');
      try {
        await this.useCase.execute();
      } catch (err) {
        console.error('[DailySummaryJob] Error generando resumen diario:', err);
      }
    });

    console.log('[DailySummaryJob] Programado para ejecutarse diariamente a las 06:00 AM.');
  }
}
