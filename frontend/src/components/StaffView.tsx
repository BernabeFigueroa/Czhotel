import React, { useState, useEffect, useRef } from 'react';
import { RoomDTO, RoomConsumptionDTO } from '../types';
import { VehicleIcon } from './VehicleIcon';

interface StaffViewProps {
  rooms: RoomDTO[];
  consumptions: Record<number, RoomConsumptionDTO>;
  onOpenConsumption: (roomId: number) => void;
}

const TURN_DURATION_MS = 120 * 60_000;
const WARNING_WINDOW_MS = 10 * 60_000;

function getWarningMinutes(room: RoomDTO, now: Date): number | null {
  if (room.estadoActual !== 'OCUPADA' || !room.turnoActualInicio) return null;
  const remainingMs = Date.parse(room.turnoActualInicio) + TURN_DURATION_MS - now.getTime();
  return remainingMs > 0 && remainingMs <= WARNING_WINDOW_MS
    ? Math.ceil(remainingMs / 60_000)
    : null;
}

function createVoiceMessage(text: string): SpeechSynthesisUtterance {
  const message = new SpeechSynthesisUtterance(text);
  message.lang = 'es-AR';
  return message;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatPrice(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

function formatElapsedTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const totalMinutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hoursText = hours === 1 ? '1 hora' : `${hours} horas`;
  if (mins === 0) {
    return hoursText;
  }
  return `${hoursText} y ${mins} min`;
}

function getCategoryName(room: RoomDTO): string {
  if (room.categoria) return room.categoria;
  const id = room.id;
  if ([1, 2, 15].includes(id)) return 'Suite';
  if ([5, 12, 17].includes(id)) return 'Premium';
  if ([3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 16, 18].includes(id)) return 'Especial';
  return '';
}

export const StaffView: React.FC<StaffViewProps> = ({
  rooms,
  consumptions,
  onOpenConsumption,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const announcedTurns = useRef(new Map<number, string>());
  const voiceBlocked = useRef(false);

  // Reloj en vivo y refresco de minutos transcurridos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const retryVoice = () => {
      if (voiceBlocked.current) {
        voiceBlocked.current = false;
        setCurrentTime(new Date());
      }
    };
    window.addEventListener('click', retryVoice);
    window.addEventListener('keydown', retryVoice);
    return () => {
      window.removeEventListener('click', retryVoice);
      window.removeEventListener('keydown', retryVoice);
    };
  }, []);

  useEffect(() => {
    if (voiceBlocked.current || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

    for (const room of rooms) {
      const startedAt = room.turnoActualInicio;
      const minutes = getWarningMinutes(room, currentTime);
      if (!startedAt || minutes === null) continue;

      const storageKey = `chezz:voice-warning:${room.id}`;
      if (announcedTurns.current.get(room.id) === startedAt) continue;
      try {
        if (sessionStorage.getItem(storageKey) === startedAt) continue;
      } catch {
        // Keep deduplication in memory when storage is unavailable.
      }

      const timeLeft = minutes === 1 ? 'Queda un minuto' : `Quedan ${minutes} minutos`;
      const message = createVoiceMessage(`${timeLeft} en la habitación ${room.id}`);
      announcedTurns.current.set(room.id, startedAt);
      message.onstart = () => {
        try {
          sessionStorage.setItem(storageKey, startedAt);
        } catch {
          // The in-memory record still prevents a repeat.
        }
      };
      message.onerror = (event) => {
        if (event.error === 'not-allowed') {
          announcedTurns.current.delete(room.id);
          voiceBlocked.current = true;
        }
      };
      window.speechSynthesis.speak(message);
    }
  }, [currentTime, rooms]);

  const getClockString = () => {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dia = dias[currentTime.getDay()];
    const fecha = `${pad2(currentTime.getDate())}/${pad2(currentTime.getMonth() + 1)}`;
    const hora = `${pad2(currentTime.getHours())}:${pad2(currentTime.getMinutes())}`;
    return `${dia} ${fecha} · ${hora}`;
  };

  return (
    <section className="view view-staff">
      <header className="staff-header">
        <div>
          <span className="staff-title-main">Habitaciones</span>
          <span className="staff-title-sub">{getClockString()}</span>
        </div>
      </header>

      <div className="staff-body">
        <div className="legend">
          <span>
            <i className="dot-libre"></i>Libre
          </span>
          <span>
            <i className="dot-ocupada"></i>Ocupada
          </span>
        </div>

        <div className="rooms-grid">
          {rooms.map((room) => {
            const isOccupied = room.estadoActual === 'OCUPADA';
            const statusKey = isOccupied ? 'ocupada' : 'libre';
            const category = getCategoryName(room);
            const basePrice = room.precioBase || 35000;
            const consumption = consumptions[room.id];
            const warningMinutes = getWarningMinutes(room, currentTime);

            let timeText = '';
            if (isOccupied && room.turnoActualInicio) {
              timeText = `Hace ${formatElapsedTime(room.turnoActualInicio)}`;
            }

            return (
              <article
                key={room.id}
                className={`room-tile status-${statusKey}`}
              >
                <div className="room-num">{pad2(room.id)}</div>
                <div className="room-status">
                  {isOccupied ? 'Ocupada' : 'Libre'}
                </div>

                <div className="room-price">
                  {formatPrice(basePrice)}
                  {category && <span className="room-category"> · {category}</span>}
                </div>

                {isOccupied && consumption && consumption.items.length > 0 && (
                  <div className="room-price room-consumption-total">
                    Total con consumición {formatPrice(basePrice + consumption.total)}
                  </div>
                )}

                {timeText && <div className="room-time">{timeText}</div>}

                {warningMinutes !== null && (
                  <div className="room-turn-warning">
                    {warningMinutes === 1 ? 'Queda 1 min' : `Quedan ${warningMinutes} min`}
                  </div>
                )}

                {isOccupied && (
                  <div className="room-vehicle-chip">
                    <VehicleIcon type={room.vehiculo || 'AUTO'} size={13} />
                    <span>{room.vehiculo === 'MOTO' ? 'Moto' : room.vehiculo === 'DIDI' ? 'DiDi' : 'Auto'}</span>
                  </div>
                )}

                {/* Botón + ÚNICAMENTE para habitaciones Ocupadas */}
                {isOccupied && (
                  <button
                    type="button"
                    className="plus-btn"
                    aria-label={`Agregar consumo a habitación ${room.id}`}
                    onClick={() => onOpenConsumption(room.id)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                )}
              </article>
            );
          })}
        </div>


      </div>
    </section>
  );
};
