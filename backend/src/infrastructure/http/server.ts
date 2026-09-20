import express from 'express';
import cors from 'cors';
import path from 'path';
import { SSEManager } from './sse/SSEManager';
import { IRoomRepository } from '../../application/ports/IRoomRepository';
import { IShiftRepository } from '../../application/ports/IShiftRepository';
import { IProductRepository } from '../../application/ports/IProductRepository';
import { GenerateDailySummaryUseCase } from '../../application/use-cases/GenerateDailySummary';
import { RoomStatus } from '../../domain/entities/Room';
import { Shift } from '../../domain/entities/Shift';

export function createHttpServer(
  roomRepo: IRoomRepository,
  shiftRepo: IShiftRepository,
  productRepo: IProductRepository,
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

  // Cambio manual de estado de una habitación (ej: desde la PWA tocar para ocupar o liberar)
  app.post('/api/rooms/:id/status', async (req, res) => {
    try {
      const roomId = parseInt(req.params.id, 10);
      const { nuevoEstado } = req.body; // 'LIBRE' | 'OCUPADA' | 'LIMPIANDO'

      const room = await roomRepo.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Habitación no encontrada' });
      }

      const now = new Date();

      let finalEstado = nuevoEstado;
      if (finalEstado === 'LIMPIANDO') {
        finalEstado = 'LIBRE';
      }

      if (finalEstado === 'OCUPADA') {
        await roomRepo.updateStatus(roomId, 'OCUPADA', now, null);
      } else if (finalEstado === 'LIBRE') {
        // Cerrar turno si estaba ocupada
        if (room.isOccupied()) {
          const inicio = room.turnoActualInicio ? new Date(room.turnoActualInicio) : now;
          const duracion = Shift.calculateDurationMinutes(inicio, now);
          const tipo = Shift.classify(duracion);
          const fechaBase = Shift.toArgentinaDateString(now);

          const shift = await shiftRepo.createShift({
            habitacionId: roomId,
            horaInicio: inicio,
            horaFin: now,
            duracionMinutos: duracion,
            fecha: fechaBase,
            tipo
          });

          await productRepo.assignConsumptionsToShift(roomId, shift.id);
        }
        await roomRepo.updateStatus(roomId, 'LIBRE', null, null);
      }

      sse.broadcast({
        type: 'ROOM_STATUS_CHANGED',
        timestamp: now.toISOString(),
        data: {
          roomId,
          nuevoEstado: finalEstado,
          turnoInicio: finalEstado === 'OCUPADA' ? now.toISOString() : null,
          limpiezaInicio: null
        }
      });

      res.json({ success: true, roomId, nuevoEstado });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Listar productos
  app.get('/api/products', async (req, res) => {
    try {
      const products = await productRepo.findAll();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Crear producto nuevo
  app.post('/api/products', async (req, res) => {
    try {
      const { nombre, precio, stock } = req.body;
      if (!nombre) {
        return res.status(400).json({ error: 'Nombre es requerido' });
      }
      const prod = await productRepo.create(nombre, Number(precio) || 0, Number(stock) || 0);
      sse.broadcast({
        type: 'STOCK_UPDATED',
        timestamp: new Date().toISOString(),
        data: prod
      });
      res.json(prod);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Ajustar stock (+ / -)
  app.patch('/api/products/:id/stock', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const delta = parseInt(req.body.delta, 10) || 0;
      const updated = await productRepo.updateStock(id, delta);

      sse.broadcast({
        type: 'STOCK_UPDATED',
        timestamp: new Date().toISOString(),
        data: updated
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Consumos del turno activo en una habitación
  app.get('/api/rooms/:id/consumption', async (req, res) => {
    try {
      const roomId = parseInt(req.params.id, 10);
      const items = await productRepo.getConsumptionsByRoom(roomId);
      const total = items.reduce((acc, it) => acc + (it.precioUnitario * it.cantidad), 0);
      res.json({ roomId, items, total });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cargar 1 consumo a la habitación ocupada
  app.post('/api/rooms/:id/consumption', async (req, res) => {
    try {
      const roomId = parseInt(req.params.id, 10);
      const { productoId } = req.body;

      const room = await roomRepo.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Habitación no encontrada' });
      }

      if (room.estadoActual !== 'OCUPADA') {
        return res.status(400).json({ error: 'Solo se pueden cargar consumos a habitaciones ocupadas' });
      }

      const result = await productRepo.addConsumption(roomId, Number(productoId));

      // Obtener todos los consumos actualizados de la habitación
      const allItems = await productRepo.getConsumptionsByRoom(roomId);
      const total = allItems.reduce((acc, it) => acc + (it.precioUnitario * it.cantidad), 0);

      sse.broadcast({
        type: 'ROOM_CONSUMPTION_UPDATED',
        timestamp: new Date().toISOString(),
        data: {
          roomId,
          items: allItems,
          total,
          updatedStock: {
            productoId,
            newStock: result.newStock
          }
        }
      });

      res.json({ success: true, consumption: result.consumption, allItems, total });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Turnos por fecha con desglose de consumos (ideal para la vista de Estela)
  // Admite query param ?date=YYYY-MM-DD (por defecto, día actual de Argentina)
  const handleGetShifts = async (req: express.Request, res: express.Response) => {
    try {
      const dateParam = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : Shift.toArgentinaDateString(new Date());

      const shifts = await shiftRepo.findByDate(dateParam);
      const shiftIds = shifts.map((s) => s.id);
      const consumptionsMap = await productRepo.getConsumptionsForShifts(shiftIds);

      const response = shifts.map((s) => ({
        id: s.id,
        habitacionId: s.habitacionId,
        horaInicio: s.horaInicio.toISOString(),
        horaFin: s.horaFin.toISOString(),
        duracionMinutos: s.duracionMinutos,
        fecha: typeof s.fecha === 'string' ? s.fecha : dateParam,
        tipo: s.tipo,
        items: consumptionsMap.get(s.id) || []
      }));

      res.json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  app.get('/api/shifts', handleGetShifts);
  app.get('/api/shifts/today', handleGetShifts);

  // Historial de turnos por habitación específica
  app.get('/api/rooms/:id/shifts', async (req, res) => {
    try {
      const roomId = parseInt(req.params.id, 10);
      const today = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/Argentina/Buenos_Aires' 
      }).format(new Date());

      const shifts = await shiftRepo.findByRoomAndDate(roomId, today);
      const shiftIds = shifts.map((s) => s.id);
      const consumptionsMap = await productRepo.getConsumptionsForShifts(shiftIds);

      const response = shifts.map((s) => ({
        id: s.id,
        habitacionId: s.habitacionId,
        horaInicio: s.horaInicio.toISOString(),
        horaFin: s.horaFin.toISOString(),
        duracionMinutos: s.duracionMinutos,
        fecha: s.fecha,
        tipo: s.tipo,
        items: consumptionsMap.get(s.id) || []
      }));

      res.json(response);
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

  // Servir estáticos de la PWA (index.html, manifest.json, sw.js, icon.svg)
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}
