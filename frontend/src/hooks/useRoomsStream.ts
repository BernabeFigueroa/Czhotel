import { useState, useEffect } from 'react';
import { RoomData } from '../components/RoomCard';

export function useRoomsStream() {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Carga inicial vía REST
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Error al consultar habitaciones');
      const data: RoomData[] = await res.json();
      setRooms(data);
      setError(null);
    } catch (err: any) {
      console.error('[RoomsStream] Error REST:', err);
      setError('No se pudo conectar con el servidor.');
    }
  };

  useEffect(() => {
    fetchRooms();

    // 2. Conexión a Server-Sent Events (SSE) en tiempo real
    const eventSource = new EventSource('/api/rooms/stream');

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log('[SSE] Conexión abierta en la PWA.');
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'ROOM_STATUS_CHANGED') {
          const { roomId, nuevoEstado, turnoInicio } = payload.data;
          
          setRooms((prevRooms) =>
            prevRooms.map((r) => {
              if (r.id === roomId) {
                const turnosCount = nuevoEstado === 'LIBRE' ? r.turnosHoyCount + 1 : r.turnosHoyCount;
                return {
                  ...r,
                  estadoActual: nuevoEstado,
                  turnoActualInicio: turnoInicio,
                  turnosHoyCount: turnosCount
                };
              }
              return r;
            })
          );
        }
      } catch (e) {
        console.error('[SSE] Error procesando evento entrante:', e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // El navegador reintentará la conexión automáticamente
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { rooms, isConnected, error, refresh: fetchRooms };
}
