import express from 'express';
import cors from 'cors';
import { SSEManager } from './sse/SSEManager';
import { IRoomRepository } from '../../application/ports/IRoomRepository';
import { IShiftRepository } from '../../application/ports/IShiftRepository';
import { GenerateDailySummaryUseCase } from '../../application/use-cases/GenerateDailySummary';

export function createHttpServer(
  roomRepo: IRoomRepository,
  shiftRepo: IShiftRepository,
  sse: SSEManager,
  summaryUseCase: GenerateDailySummaryUseCase
) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Render Web Service Keep-Alive Endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
  });

  // Habitaciones (incluye conteo de turnos del día para cada una de las 18 habitaciones)
  app.get('/api/rooms', async (req, res) => {
    try {
      const rooms = await roomRepo.findAllWithTodayCounts();
      res.json(rooms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Turnos de hoy
  app.get('/api/shifts/today', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const shifts = await shiftRepo.findByDate(today);
      res.json(shifts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Historial de turnos por habitación específica
  app.get('/api/rooms/:id/shifts', async (req, res) => {
    try {
      const roomId = parseInt(req.params.id, 10);
      const today = new Date().toISOString().split('T')[0];
      const shifts = await shiftRepo.findByRoomAndDate(roomId, today);
      res.json(shifts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Disparar resumen manual a Telegram
  app.post('/api/admin/trigger-summary', async (req, res) => {
    try {
      const result = await summaryUseCase.execute();
      res.json({ success: true, message: 'Resumen enviado a Telegram', report: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SSE Stream
  app.get('/api/rooms/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sse.addClient(res);

    req.on('close', () => {
      sse.removeClient(res);
    });
  });

  return app;
}
