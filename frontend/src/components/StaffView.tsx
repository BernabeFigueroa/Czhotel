import React, { useState, useEffect } from 'react';
import { RoomDTO } from '../types';

interface StaffViewProps {
  rooms: RoomDTO[];
  onOpenConsumption: (roomId: number) => void;
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
  if ([3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 16].includes(id)) return 'Especial';
  return '';
}

export const StaffView: React.FC<StaffViewProps> = ({
  rooms,
  onOpenConsumption,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Reloj en vivo y refresco de minutos transcurridos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

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
                  {formatPrice(room.precioBase || 35000)}
                  {category && <span className="room-category"> · {category}</span>}
                </div>

                {timeText && <div className="room-time">{timeText}</div>}

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
