import React, { useState } from 'react';
import { useRoomsStream } from './hooks/useRoomsStream';
import { RoomCard, RoomData } from './components/RoomCard';
import { ShiftHistoryModal } from './components/ShiftHistoryModal';

export const App: React.FC = () => {
  const { rooms, isConnected, error } = useRoomsStream();
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);

  // Conteo de ocupación general
  const occupiedCount = rooms.filter((r) => r.estadoActual === 'OCUPADA').length;
  const freeCount = rooms.length - occupiedCount;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Barra de Estado Superior */}
      <header className="mb-8 bg-slate-900 border-4 border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
            AUDITORÍA DE HABITACIONES
          </h1>
          <p className="text-slate-400 font-bold text-base mt-1">
            Tablero en vivo de las 18 habitaciones
          </p>
        </div>

        {/* Resumen numérico rápido y estado de red */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-950 border-2 border-emerald-600 px-4 py-2 rounded-2xl text-center">
            <span className="text-xs font-black uppercase text-emerald-400 block">Libres</span>
            <span className="text-2xl font-black text-emerald-300">{freeCount}</span>
          </div>

          <div className="bg-rose-950 border-2 border-rose-600 px-4 py-2 rounded-2xl text-center">
            <span className="text-xs font-black uppercase text-rose-400 block">Ocupadas</span>
            <span className="text-2xl font-black text-rose-300">{occupiedCount}</span>
          </div>

          <div className={`px-4 py-2 rounded-2xl text-xs font-black uppercase flex items-center gap-2 border-2 ${
            isConnected ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500' : 'bg-rose-900/40 text-rose-300 border-rose-500 animate-pulse'
          }`}>
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
            {isConnected ? 'EN VIVO' : 'RECONECTANDO'}
          </div>
        </div>
      </header>

      {/* Alerta de Error si hay caída */}
      {error && (
        <div className="mb-6 p-4 bg-rose-900/80 border-2 border-rose-600 rounded-2xl text-center text-white font-black text-lg">
          ⚠️ {error} — Reintentando sincronización automáticamente...
        </div>
      )}

      {/* Grilla de las 18 Habitaciones (Tarjetas Gigantes) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <p className="text-2xl font-bold text-slate-400">Cargando las 18 habitaciones...</p>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onViewHistory={(r) => setSelectedRoom(r)}
            />
          ))
        )}
      </section>

      {/* Modal de Historial de Turnos */}
      <ShiftHistoryModal
        room={selectedRoom}
        onClose={() => setSelectedRoom(null)}
      />
    </main>
  );
};
