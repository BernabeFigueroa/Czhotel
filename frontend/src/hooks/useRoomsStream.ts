import { useState, useEffect, useCallback } from 'react';
import { RoomDTO, ProductDTO, ShiftDTO, RoomConsumptionDTO } from '../types';

export function useRoomsStream() {
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [shifts, setShifts] = useState<ShiftDTO[]>([]);
  const [consumptions, setConsumptions] = useState<Record<number, RoomConsumptionDTO>>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Cargar habitaciones
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Error al cargar habitaciones');
      const data: RoomDTO[] = await res.json();
      setRooms(data);
    } catch (err: any) {
      console.error('[RoomsStream] Error habitaciones:', err);
      setError('No se pudo conectar con el servidor.');
    }
  }, []);

  // 2. Cargar stock de productos
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data: ProductDTO[] = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('[RoomsStream] Error productos:', err);
    }
  }, []);

  // 3. Cargar turnos de hoy
  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts/today');
      if (res.ok) {
        const data: ShiftDTO[] = await res.json();
        setShifts(data);
      }
    } catch (err) {
      console.error('[RoomsStream] Error turnos:', err);
    }
  }, []);

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
    const occupied = currentRooms.filter(r => r.estadoActual === 'OCUPADA');
    for (const r of occupied) {
      fetchRoomConsumption(r.id);
    }
  }, [fetchRoomConsumption]);

  // Modificar stock (+/-)
  const adjustStock = async (productId: number, delta: number) => {
    try {
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
        // Actualizar stock local del producto
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

  // Cambiar estado de habitación manualmente
  const changeRoomStatus = async (roomId: number, nuevoEstado: 'LIBRE' | 'OCUPADA' | 'LIMPIANDO') => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoEstado })
      });
      if (res.ok) {
        // Refrescar turnos si se cerró un turno
        if (nuevoEstado === 'LIMPIANDO' || nuevoEstado === 'LIBRE') {
          fetchShifts();
        }
      }
    } catch (e) {
      console.error(`[RoomsStream] Error cambiando estado hab ${roomId}:`, e);
    }
  };

  // Inicialización y SSE
  useEffect(() => {
    fetchRooms().then(() => {
      fetchProducts();
      fetchShifts();
    });

    const eventSource = new EventSource('/api/rooms/stream');

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
            fetchShifts();
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

    return () => {
      eventSource.close();
    };
  }, [fetchRooms, fetchProducts, fetchShifts]);

  // Actualizar consumos cuando cambian las habitaciones
  useEffect(() => {
    if (rooms.length > 0) {
      fetchAllOccupiedConsumptions(rooms);
    }
  }, [rooms, fetchAllOccupiedConsumptions]);

  return {
    rooms,
    products,
    shifts,
    consumptions,
    isConnected,
    error,
    adjustStock,
    addProduct,
    addConsumptionToRoom,
    changeRoomStatus,
    fetchRoomConsumption,
    refreshRooms: fetchRooms
  };
}
