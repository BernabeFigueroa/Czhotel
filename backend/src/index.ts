import { env } from './config/env';
import { pool } from './infrastructure/db/PostgresPool';
import { 
  PostgresRoomRepository, 
  PostgresShiftRepository, 
  PostgresProductRepository 
} from './infrastructure/db/PostgresRepositories';
import { TelegramBotService } from './infrastructure/telegram/TelegramBotService';
import { SSEManager } from './infrastructure/http/sse/SSEManager';
import { HandleTuyaStatusReportUseCase } from './application/use-cases/HandleTuyaStatusReport';
import { GenerateDailySummaryUseCase } from './application/use-cases/GenerateDailySummary';
import { TuyaPulsarConsumer } from './infrastructure/iot/TuyaPulsarClient';
import { DailySummaryJob } from './infrastructure/cron/DailySummaryJob';
import { createHttpServer } from './infrastructure/http/server';

async function bootstrap() {
  console.log('🚀 Iniciando Sistema de Control de Turnos IoT (18 Habitaciones)...');

  // 1. Repositorios y Servicios de Infraestructura
  const roomRepo = new PostgresRoomRepository(pool);
  const shiftRepo = new PostgresShiftRepository(pool);
  const productRepo = new PostgresProductRepository(pool);
  const telegramService = new TelegramBotService(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_ADMIN_CHAT_ID);
  const sseManager = new SSEManager();

  // 2. Casos de Uso
  const handleStatusReportUseCase = new HandleTuyaStatusReportUseCase(
    roomRepo,
    shiftRepo,
    productRepo,
    telegramService,
    sseManager
  );

  const dailySummaryUseCase = new GenerateDailySummaryUseCase(
    shiftRepo,
    roomRepo,
    telegramService
  );

  // 3. Cron Job (Resumen 06:00 AM)
  const cronJob = new DailySummaryJob(dailySummaryUseCase);
  cronJob.start();

  // 4. Consumidor Tuya Pulsar
  const tuyaConsumer = new TuyaPulsarConsumer(
    env.TUYA_ACCESS_ID,
    env.TUYA_ACCESS_SECRET,
    env.TUYA_ENV,
    env.TUYA_REGION,
    handleStatusReportUseCase
  );
  tuyaConsumer.start();

  // 5. Servidor HTTP (Express)
  const app = createHttpServer(roomRepo, shiftRepo, productRepo, sseManager, dailySummaryUseCase);
  app.listen(env.PORT, () => {
    console.log(`🌐 Servidor HTTP corriendo en http://localhost:${env.PORT}`);
    console.log(`🩺 Health check disponible en http://localhost:${env.PORT}/health`);
  });

  // Manejo de apagado elegante
  const shutdown = async () => {
    console.log('\n🛑 Cerrando servicios con elegancia...');
    tuyaConsumer.stop();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('💥 Error crítico en bootstrap:', err);
  process.exit(1);
});
