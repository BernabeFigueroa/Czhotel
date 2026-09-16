import React from 'react';
import { LiveTimer } from './LiveTimer';

export interface RoomData {
  id: number;
  nombre: string;
  tuyaDeviceId: string;
  estadoActual: 'LIBRE' | 'OCUPADA';
  turnoActualInicio: string | null;
  turnosHoyCount: number;
}

interface RoomCardProps {
  room: RoomData;
  onViewHistory: (room: RoomData) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onViewHistory }) => {
  const isOccupied = room.estadoActual === 'OCUPADA';

  return (
    <article
      className={`relative w-full rounded-3xl p-5 sm:p-6 transition-all duration-300 border-4 sm:border-8 shadow-2xl flex flex-col justify-between select-none ${
        isOccupied
          ? 'bg-rose-50 border-rose-600 text-rose-950'
          : 'bg-emerald-50 border-emerald-600 text-emerald-950'
      }`}
      style={{ minHeight: '270px' }}
    >
      {/* Cabecera de la Habitación */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight">
            {room.nombre}
          </h2>
          <span className="inline-block mt-1 text-sm sm:text-base font-extrabold px-3 py-1 rounded-full bg-slate-200 text-slate-800">
            Turnos de hoy: {room.turnosHoyCount}
          </span>
        </div>

        {/* Badge Gigante de Estado */}
        <div
          className={`px-4 sm:px-6 py-2 rounded-2xl text-xl sm:text-2xl font-black uppercase tracking-wider text-white shadow-md ${
            isOccupied ? 'bg-rose-600 animate-pulse' : 'bg-emerald-600'
          }`}
        >
          {room.estadoActual}
        </div>
      </div>

      {/* Cuerpo Central: Cronómetro o Estado Libre */}
      <div className="my-3 text-center">
        {isOccupied && room.turnoActualInicio ? (
          <div>
            <p className="text-xs sm:text-sm font-black text-rose-800 uppercase tracking-widest mb-1">
              TIEMPO TRANSCURRIDO
            </p>
            <LiveTimer startTimeIso={room.turnoActualInicio} />
          </div>
        ) : (
          <div className="py-2">
            <p className="text-2xl sm:text-3xl font-black text-emerald-800 uppercase tracking-wide">
              ✓ LISTA / LIBRE
            </p>
            <p className="text-xs sm:text-sm font-bold text-emerald-700">
              Luz apagada en administración
            </p>
          </div>
        )}
      </div>

      {/* Botón táctil para personas mayores */}
      <button
        type="button"
        onClick={() => onViewHistory(room)}
        className="w-full py-3.5 sm:py-4 bg-slate-900 active:bg-slate-800 text-white rounded-2xl text-base sm:text-lg font-black uppercase tracking-wider shadow-lg active:scale-95 transition-transform focus:outline-none"
      >
        Ver Turnos de Hoy
      </button>
    </article>
  );
};
