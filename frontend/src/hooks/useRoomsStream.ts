import { useState, useEffect, useCallback } from 'react';
import { RoomDTO, ProductDTO, ShiftDTO, RoomConsumptionDTO } from '../types';

function getInitialCategoryAndPrice(id: number): { categoria: string; precioBase: number } {
  if ([1, 2, 15].includes(id)) return { categoria: 'Suite', precioBase: 60000 };
  if ([5, 12, 17].includes(id)) return { categoria: 'Premium', precioBase: 40000 };
  return { categoria: 'Especial', precioBase: 35000 };
}

const INITIAL_ROOMS: RoomDTO[] = Array.from({ length: 18 }, (_, i) => {
  const id = i + 1;
  const meta = getInitialCategoryAndPrice(id);
  return {
    id,
    nombre: `Habitación ${id}`,
    tuyaDeviceId: '',
    estadoActual: 'LIBRE',
    turnoActualInicio: null,
    limpiezaInicio: null,
    precioBase: meta.precioBase,
    categoria: meta.categoria,
    turnosHoyCount: 0,
  };
});

const INITIAL_PRODUCTS: ProductDTO[] = [
  { id: 1, nombre: 'Preservativos', precio: 1500, stock: 120 },
  { id: 2, nombre: 'Cerveza', precio: 3200, stock: 48 },
  { id: 3, nombre: 'Chandon', precio: 9500, stock: 14 },
  { id: 4, nombre: 'Gaseosa', precio: 2200, stock: 36 },
  { id: 5, nombre: 'Agua mineral', precio: 1800, stock: 40 },
  { id: 6, nombre: 'Vino', precio: 7800, stock: 20 },
];

function getTodayArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'America/Argentina/Buenos_Aires' 
  }).format(new Date());
}

export function useRoomsStream() {
  const [rooms, setRooms] = useState<RoomDTO[]>(INITIAL_ROOMS);
  const [products, setProducts] = useState<ProductDTO[]>(INITIAL_PRODUCTS);
  const [shifts, setShifts] = useState<ShiftDTO[]>([]);
  const [consumptions, setConsumptions] = useState<Record<number, RoomConsumptionDTO>>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayArgentina);

  // 1. Cargar habitaciones
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data: RoomDTO[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setRooms(data);
        }
      }
    } catch (err: any) {
      console.error('[RoomsStream] Error habitaciones:', err);
    }
  }, []);

  // 2. Cargar stock de productos
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data: ProductDTO[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      }
    } catch (err) {
      console.error('[RoomsStream] Error productos:', err);
    }
  }, []);

  // 3. Cargar turnos por fecha
  const fetchShifts = useCallback(async (targetDate?: string) => {
    const dateToFetch = targetDate || selectedDate;
    try {
      const isCurrentDay = dateToFetch === getTodayArgentina();
      const endpoint = isCurrentDay ? '/api/shifts/today' : `/api/shifts?date=${dateToFetch}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data: ShiftDTO[] = await res.json();
        if (Array.isArray(data)) {
          setShifts(data);
        }
      }
    } catch (err) {
      console.error('[RoomsStream] Error turnos:', err);
    }
  }, [selectedDate]);

  // 4. Cargar consumos de una habitación ocupada
  const fetchRoomConsumption = useCallback(async (roomId: number) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/consumption`);
      if (res.ok) {
        const data: RoomConsumptionDTO = await res.json();
        setConsumptions((prev) => ({ ...prev, [roomId]: data }));
        return data;
      }
    } catch (err) {
      console.error(`[RoomsStream] Error consumo habitación ${roomId}:`, err);
    }
    return null;
  }, []);

  // 5. Cargar todos los consumos iniciales de habitaciones ocupadas
  const fetchAllOccupiedConsumptions = useCallback(async (currentRooms: RoomDTO[]) => {
    const occupied = currentRooms.filter(r => (r.estadoActual || '').toUpperCase() === 'OCUPADA');
    for (const r of occupied) {
      fetchRoomConsumption(r.id);
    }
  }, [fetchRoomConsumption]);

  // Modificar stock (+/-)
  const adjustStock = async (productId: number, delta: number) => {
    try {
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p
        )
      );
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      });
      if (res.ok) {
        const updated: ProductDTO = await res.json();
        setProducts((prev) => prev.map(p => p.id === updated.id ? updated : p));
      }
    } catch (e) {
      console.error('[RoomsStream] Error modificando stock:', e);
    }
  };

  // Crear nuevo producto
  const addProduct = async (nombre: string, precio: number, stock: number) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, precio, stock })
      });
      if (res.ok) {
        const created: ProductDTO = await res.json();
        setProducts((prev) => [...prev, created]);
        return created;
      }
    } catch (e) {
      console.error('[RoomsStream] Error creando producto:', e);
    }
    return null;
  };

  // Agregar consumo a habitación
  const addConsumptionToRoom = async (roomId: number, productoId: number) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/consumption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId })
      });
      if (res.ok) {
        const data = await res.json();
        setConsumptions((prev) => ({
          ...prev,
          [roomId]: {
            roomId,
            items: data.allItems,
            total: data.total
          }
        }));
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productoId ? { ...p, stock: Math.max(0, p.stock - 1) } : p
          )
        );
        return data;
      }
    } catch (e) {
      console.error(`[RoomsStream] Error agregando consumo a hab ${roomId}:`, e);
    }
    return null;
  };

  // Detección automática del cruce de medianoche en Argentina (00:00 hs)
  // Limpia la grilla automáticamente al cambiar el día y carga el nuevo día
  useEffect(() => {
    const timer = setInterval(() => {
      const currentToday = getTodayArgentina();
      setSelectedDate((prevDate) => {
        // Si el usuario estaba viendo el día de hoy y el reloj cruzó las 00:00 hs
        if (prevDate !== currentToday) {
          fetchShifts(currentToday);
          fetchRooms();
          return currentToday;
        }
        return prevDate;
      });
    }, 15000);

    return () => clearInterval(timer);
  }, [fetchShifts, fetchRooms]);

  // Cargar turnos cada vez que cambia la fecha seleccionada
  useEffect(() => {
    fetchShifts(selectedDate);
  }, [selectedDate, fetchShifts]);

  // Inicialización y SSE
  useEffect(() => {
    fetchRooms();
    fetchProducts();
    fetchShifts(selectedDate);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/rooms/stream');

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ROOM_STATUS_CHANGED') {
            const { roomId, nuevoEstado, turnoInicio, limpiezaInicio } = payload.data;
            setRooms((prev) =>
              prev.map((r) => {
                if (r.id === roomId) {
                  const turnosHoy = nuevoEstado === 'LIMPIANDO' ? r.turnosHoyCount + 1 : r.turnosHoyCount;
                  return {
                    ...r,
                    estadoActual: nuevoEstado,
                    turnoActualInicio: turnoInicio || null,
                    limpiezaInicio: limpiezaInicio || null,
                    turnosHoyCount: turnosHoy
                  };
                }
                return r;
              })
            );
            if (nuevoEstado === 'LIMPIANDO' || nuevoEstado === 'LIBRE') {
              fetchShifts(selectedDate);
            }
          } else if (payload.type === 'STOCK_UPDATED') {
            const updatedProd: ProductDTO = payload.data;
            setProducts((prev) => {
              const exists = prev.some(p => p.id === updatedProd.id);
              if (exists) {
                return prev.map(p => p.id === updatedProd.id ? updatedProd : p);
              }
              return [...prev, updatedProd];
            });
          } else if (payload.type === 'ROOM_CONSUMPTION_UPDATED') {
            const { roomId, items, total, updatedStock } = payload.data;
            setConsumptions((prev) => ({
              ...prev,
              [roomId]: { roomId, items, total }
            }));
            if (updatedStock) {
              setProducts((prev) =>
                prev.map(p => p.id === updatedStock.productoId ? { ...p, stock: updatedStock.newStock } : p)
              );
            }
          }
        } catch (e) {
          console.error('[SSE] Error parseando evento:', e);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      console.warn('[SSE] EventSource no disponible o falló:', e);
    }

    // Polling fallback cada 15s para máxima robustez en Safari y conexiones móviles
    const interval = setInterval(() => {
      fetchRooms();
      fetchShifts(selectedDate);
    }, 15000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [fetchRooms, fetchProducts, fetchShifts, selectedDate]);

  // Actualizar consumos cuando cambian las habitaciones
  useEffect(() => {
    if (rooms.length > 0) {
      fetchAllOccupiedConsumptions(rooms);
    }
  }, [rooms, fetchAllOccupiedConsumptions]);

  const todayDate = getTodayArgentina();

  return {
    rooms,
    products,
    shifts,
    consumptions,
    isConnected,
    error,
    selectedDate,
    setSelectedDate,
    todayDate,
    isToday: selectedDate === todayDate,
    adjustStock,
    addProduct,
    addConsumptionToRoom,
    fetchRoomConsumption,
    refreshRooms: fetchRooms
  };
}
