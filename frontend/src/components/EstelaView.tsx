import React from 'react';
import { RoomDTO, ShiftDTO } from '../types';

interface EstelaViewProps {
  rooms: RoomDTO[];
  shifts: ShiftDTO[];
  selectedDate: string;
  todayDate: string;
  onSelectDate: (date: string) => void;
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

function formatFriendlyDate(dateStr: string, todayStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const diaYMes = `${d} de ${meses[m - 1]}`;
    if (dateStr === todayStr) {
      return `Hoy · ${diaYMes}`;
    }
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const today = new Date(ty, tm - 1, td);
    const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      return `Ayer · ${diaYMes}`;
    }
    return `${diaYMes} de ${y}`;
  } catch {
    return dateStr;
  }
}

function getYesterdayString(todayStr: string): string {
  const [y, m, d] = todayStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const CLEAN_MAX_MIN = 20;

export const EstelaView: React.FC<EstelaViewProps> = ({
  rooms,
  shifts,
  selectedDate,
  todayDate,
  onSelectDate,
}) => {
  const isToday = selectedDate === todayDate;
  const yesterdayDate = getYesterdayString(todayDate);
  const isYesterday = selectedDate === yesterdayDate;

  const totalShiftsCount = shifts.filter((s) => s.tipo === 'TURNO').length;

  return (
    <section className="view view-estela">
      <header className="estela-header">
        <div className="estela-header-main">
          <div>
            <h1 className="estela-title">
              {isToday ? 'Habitaciones de hoy' : 'Historial de turnos'}
            </h1>
            <div className="estela-date">
              {formatFriendlyDate(selectedDate, todayDate)}
            </div>
          </div>

          <div className="estela-badge-total">
            <span className="estela-total-num">{totalShiftsCount}</span>
            <span className="estela-total-label">
              {totalShiftsCount === 1 ? 'turno en el día' : 'turnos en el día'}
            </span>
          </div>
        </div>

        {/* Barra de Filtro de Fechas para Estela */}
        <div className="estela-datebar">
          <div className="estela-quick-filters">
            <button
              type="button"
              className={`estela-pill-btn ${isToday ? 'active' : ''}`}
              onClick={() => onSelectDate(todayDate)}
            >
              Hoy
            </button>
            <button
              type="button"
              className={`estela-pill-btn ${isYesterday ? 'active' : ''}`}
              onClick={() => onSelectDate(yesterdayDate)}
            >
              Ayer
            </button>
          </div>

          <div className="estela-picker-wrapper">
            <label htmlFor="estela-date-picker" className="estela-picker-label">
              Elegir fecha:
            </label>
            <input
              id="estela-date-picker"
              type="date"
              className="estela-date-input"
              value={selectedDate}
              max={todayDate}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectDate(e.target.value);
                }
              }}
            />
          </div>

          {!isToday && (
            <button
              type="button"
              className="estela-back-today-btn"
              onClick={() => onSelectDate(todayDate)}
            >
              &larr; Volver al día de hoy
            </button>
          )}
        </div>

        {!isToday && (
          <div className="estela-historical-notice">
            Mostrando turnos pasados del día {formatFriendlyDate(selectedDate, todayDate)}.
            Los turnos de días anteriores quedan guardados y cerrados.
          </div>
        )}
      </header>

      <div className="estela-list">
        {rooms.map((room) => {
          const estado = (room.estadoActual || 'LIBRE').toUpperCase();
          const statusKey = estado.toLowerCase();
          const roomShifts = shifts.filter(
            (s) => s.habitacionId === room.id && s.tipo === 'TURNO'
          );
          const isCleaning = estado === 'LIMPIANDO';
          const isOccupied = estado === 'OCUPADA';

          let cleaningText = '';
          if (isToday && isCleaning && room.limpiezaInicio) {
            const restante = Math.max(
              0,
              CLEAN_MAX_MIN - elapsedMinutes(room.limpiezaInicio)
            );
            cleaningText =
              restante > 0
                ? `Limpieza en curso, quedan ${restante} min (máximo 20 min)`
                : 'Limpieza en curso, ya pasó el tiempo máximo';
          }

          const cardClass = isToday
            ? `estela-card status-${statusKey}`
            : `estela-card estela-card-past ${roomShifts.length > 0 ? 'has-turns' : 'no-turns'}`;

          return (
            <article key={room.id} className={cardClass}>
              <div className="estela-card-top">
                <div className="estela-room-num">Habitación {room.id}</div>
                <div className="estela-room-status">
                  {isToday ? (
                    room.estadoActual === 'LIBRE'
                      ? 'Libre'
                      : room.estadoActual === 'LIMPIANDO'
                      ? 'Limpiando'
                      : 'Ocupada'
                  ) : (
                    roomShifts.length > 0
                      ? `${roomShifts.length} ${roomShifts.length === 1 ? 'turno' : 'turnos'}`
                      : 'Sin turnos'
                  )}
                </div>
              </div>

              <div className="estela-room-count">
                {isToday ? (
                  <>
                    {roomShifts.length}{' '}
                    {roomShifts.length === 1 ? 'turno hoy' : 'turnos hoy'}
                  </>
                ) : (
                  <>
                    {roomShifts.length}{' '}
                    {roomShifts.length === 1 ? 'turno registrado' : 'turnos registrados'}
                  </>
                )}
              </div>

              {isToday && isCleaning && cleaningText && (
                <div className="estela-cleaning-note">{cleaningText}</div>
              )}

              {isToday && isOccupied && room.turnoActualInicio && (
                <div className="estela-cleaning-note">
                  Turno en curso (iniciado hace {elapsedMinutes(room.turnoActualInicio)} min)
                </div>
              )}

              <div className="estela-turns">
                {roomShifts.length === 0 ? (
                  <div className="estela-empty-turns">
                    {isToday ? 'Todavía no se usó hoy' : 'No se usó en esta fecha'}
                  </div>
                ) : (
                  roomShifts.map((turno) => {
                    const horaIni = formatHourMin(turno.horaInicio);
                    const horaFin = formatHourMin(turno.horaFin);
                    const itemsList =
                      turno.items && turno.items.length > 0
                        ? turno.items
                            .map(
                              (it) =>
                                `${it.nombre}${it.cantidad > 1 ? ` x${it.cantidad}` : ''}`
                            )
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
