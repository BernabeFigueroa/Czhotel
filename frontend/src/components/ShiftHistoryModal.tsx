import React, { useEffect, useState } from 'react';
import { RoomData } from './RoomCard';

interface ShiftItem {
  id: number;
  horaInicio: string;
  horaFin: string;
  duracionMinutos: number;
}

interface ShiftHistoryModalProps {
  room: RoomData | null;
  onClose: () => void;
}

export const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({ room, onClose }) => {
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!room) return;
    setLoading(true);
    fetch(`/api/rooms/${room.id}/shifts`)
      .then((res) => res.json())
      .then((data) => {
        setShifts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando historial de turnos:', err);
        setLoading(false);
      });
  }, [room]);

  if (!room) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border-4 border-slate-700 rounded-3xl w-full max-w-lg p-6 flex flex-col max-h-[85vh] shadow-2xl">
        {/* Encabezado */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-2xl font-black text-white uppercase">{room.nombre}</h3>
            <p className="text-slate-400 font-bold text-sm">Historial de turnos de hoy</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-2xl text-2xl font-black text-white flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Lista de Turnos */}
        <div className="overflow-y-auto my-4 flex-1 space-y-3 pr-1">
          {loading ? (
            <p className="text-center text-slate-400 py-8 text-lg font-bold">Cargando turnos...</p>
          ) : shifts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xl font-bold text-slate-400">Sin turnos registrados hoy.</p>
              <p className="text-sm text-slate-500 mt-1">Cuando se baje la llave se guardará el registro.</p>
            </div>
          ) : (
            shifts.map((s, index) => {
              const start = new Date(s.horaInicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
              const end = new Date(s.horaFin).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
              const horas = Math.floor(s.duracionMinutos / 60);
              const mins = s.duracionMinutos % 60;
              const duracion = horas > 0 ? `${horas}h ${mins}m` : `${mins} minutos`;

              return (
                <div
                  key={s.id || index}
                  className="bg-slate-800 p-4 rounded-2xl border-2 border-slate-700 flex justify-between items-center"
                >
                  <div>
                    <span className="text-slate-400 text-xs font-black uppercase tracking-wider block">
                      Turno #{index + 1}
                    </span>
                    <span className="text-lg font-extrabold text-white">
                      {start} hs a {end} hs
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-black uppercase tracking-wider block">
                      Duración
                    </span>
                    <span className="text-lg font-black text-emerald-400">
                      {duracion}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Botón Volver gigante */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl text-xl font-black uppercase tracking-wider shadow-lg"
        >
          Volver al Tablero
        </button>
      </div>
    </div>
  );
};
