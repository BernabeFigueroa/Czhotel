import React from 'react';
import { RoomDTO, ShiftDTO } from '../../../../shared';

interface EstelaViewProps {
  rooms: RoomDTO[];
  shifts: ShiftDTO[];
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatHourMin(isoString: string): string {
  try {
    const d = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires',
    };
    return new Intl.DateTimeFormat('es-AR', options).format(d);
  } catch {
    return '--:--';
  }
}

function elapsedMinutes(dateStr: string | null): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

const CLEAN_MAX_MIN = 20;

export const EstelaView: React.FC<EstelaViewProps> = ({ rooms, shifts }) => {
  const now = new Date();
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const dateStr = `${now.getDate()} de ${meses[now.getMonth()]}`;

  return (
    <section className="view view-estela">
      <header className="estela-header">
        <div className="estela-title">Habitaciones de hoy</div>
        <div className="estela-date">{dateStr}</div>
      </header>

      <div className="estela-list">
        {rooms.map((room) => {
          const statusKey = room.estadoActual.toLowerCase();
          const roomShifts = shifts.filter((s) => s.habitacionId === room.id && s.tipo === 'TURNO');
          const isCleaning = room.estadoActual === 'LIMPIANDO';
          const isOccupied = room.estadoActual === 'OCUPADA';

          let cleaningText = '';
          if (isCleaning && room.limpiezaInicio) {
            const restante = Math.max(0, CLEAN_MAX_MIN - elapsedMinutes(room.limpiezaInicio));
            cleaningText =
              restante > 0
                ? `Limpieza en curso, quedan ${restante} min (máximo 20 min)`
                : 'Limpieza en curso, ya pasó el tiempo máximo';
          }

          return (
            <article key={room.id} className={`estela-card status-${statusKey}`}>
              <div className="estela-card-top">
                <div className="estela-room-num">Habitación {room.id}</div>
                <div className="estela-room-status">
                  {room.estadoActual === 'LIBRE'
                    ? 'Libre'
                    : room.estadoActual === 'LIMPIANDO'
                    ? 'Limpiando'
                    : 'Ocupada'}
                </div>
              </div>

              <div className="estela-room-count">
                {room.turnosHoyCount}{' '}
                {room.turnosHoyCount === 1 ? 'turno hoy' : 'turnos hoy'}
              </div>

              {isCleaning && cleaningText && (
                <div className="estela-cleaning-note">{cleaningText}</div>
              )}

              {isOccupied && room.turnoActualInicio && (
                <div className="estela-cleaning-note">
                  Turno en curso (iniciado hace {elapsedMinutes(room.turnoActualInicio)} min)
                </div>
              )}

              <div className="estela-turns">
                {roomShifts.length === 0 ? (
                  <div className="estela-empty-turns">Todavía no se usó hoy</div>
                ) : (
                  roomShifts.map((turno) => {
                    const horaIni = formatHourMin(turno.horaInicio);
                    const horaFin = formatHourMin(turno.horaFin);
                    const itemsList = turno.items && turno.items.length > 0
                      ? turno.items
                          .map((it) => `${it.nombre}${it.cantidad > 1 ? ` x${it.cantidad}` : ''}`)
                          .join(', ')
                      : 'Sin consumo';

                    return (
                      <div key={turno.id} className="estela-turn">
                        <div className="estela-turn-time">
                          Turno de {horaIni} a {horaFin} ({turno.duracionMinutos} min)
                        </div>
                        <div className="estela-turn-items">{itemsList}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
