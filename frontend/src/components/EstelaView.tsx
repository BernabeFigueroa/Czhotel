import React, { useState } from 'react';
import { RoomDTO, ShiftDTO, ProductDTO } from '../types';
import { StockPanel } from './StockPanel';

interface EstelaViewProps {
  rooms: RoomDTO[];
  shifts: ShiftDTO[];
  products: ProductDTO[];
  selectedDate: string;
  todayDate: string;
  onSelectDate: (date: string) => void;
  onAdjustStock: (productId: number, delta: number) => void;
  onAddProduct: (nombre: string, precio: number, stock: number) => Promise<any>;
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

function formatDurationMinutes(minsTotal: number): string {
  if (minsTotal < 60) {
    return `${minsTotal} min`;
  }
  const hours = Math.floor(minsTotal / 60);
  const mins = minsTotal % 60;
  const hoursText = hours === 1 ? '1 hora' : `${hours} horas`;
  if (mins === 0) {
    return hoursText;
  }
  return `${hoursText} y ${mins} min`;
}

function formatElapsedTime(dateStr: string | null): string {
  if (!dateStr) return '';
  return formatDurationMinutes(elapsedMinutes(dateStr));
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

function calculateShiftTurns(shift: ShiftDTO): number {
  if (shift.tipo === 'LIMPIEZA' || shift.duracionMinutos <= 15) return 0;
  if (shift.duracionMinutos < 160) return 1;
  return 1 + Math.floor((shift.duracionMinutos - 160) / 120) + 1;
}

function countTotalTurns(shiftsList: ShiftDTO[]): number {
  return shiftsList.reduce((acc, s) => acc + calculateShiftTurns(s), 0);
}

export const EstelaView: React.FC<EstelaViewProps> = ({
  rooms,
  shifts,
  products,
  selectedDate,
  todayDate,
  onSelectDate,
  onAdjustStock,
  onAddProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'stock'>('rooms');

  const isToday = selectedDate === todayDate;
  const yesterdayDate = getYesterdayString(todayDate);
  const isYesterday = selectedDate === yesterdayDate;

  const validShifts = shifts.filter((s) => s.tipo === 'TURNO');
  const totalShiftsCount = countTotalTurns(validShifts);

  return (
    <section className="view view-estela">
      <header className="estela-header">
        <div className="estela-header-main">
          <div>
            <h1 className="estela-title">
              {activeTab === 'stock'
                ? 'Gestión de stock'
                : isToday
                ? 'Habitaciones de hoy'
                : 'Historial de turnos'}
            </h1>
            <div className="estela-date">
              {formatFriendlyDate(selectedDate, todayDate)}
            </div>
          </div>

          <div className="estela-header-actions">
            <nav className="estela-tabs">
              <button
                type="button"
                className={`estela-tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
                onClick={() => setActiveTab('rooms')}
              >
                Habitaciones
              </button>
              <button
                type="button"
                className={`estela-tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
                onClick={() => setActiveTab('stock')}
              >
                Gestión de stock
              </button>
            </nav>

            {activeTab === 'rooms' && (
              <div className="estela-badge-total">
                <span className="estela-total-num">{totalShiftsCount}</span>
                <span className="estela-total-label">
                  {totalShiftsCount === 1 ? 'turno en el día' : 'turnos en el día'}
                </span>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'rooms' && (
          <>
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
                <label htmlFor="estela-date-input" className="estela-picker-label">
                  Elegir fecha:
                </label>
                <input
                  id="estela-date-input"
                  type="date"
                  className="estela-date-input"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      onSelectDate(e.target.value);
                    }
                  }}
                />
              </div>
            </div>

            {!isToday && (
              <div className="estela-historical-notice">
                Mostrando turnos pasados del día {formatFriendlyDate(selectedDate, todayDate)}.
                Los turnos de días anteriores quedan guardados y cerrados.
              </div>
            )}
          </>
        )}
      </header>

      {activeTab === 'stock' ? (
        <StockPanel
          products={products}
          onAdjustStock={onAdjustStock}
          onAddProduct={onAddProduct}
        />
      ) : (
        <div className="estela-list">
          {rooms.map((room) => {
            const isOccupied = room.estadoActual === 'OCUPADA';
            const statusKey = isOccupied ? 'ocupada' : 'libre';
            const roomShifts = shifts.filter(
              (s) => s.habitacionId === room.id && s.tipo === 'TURNO'
            );
            const roomTurnosCount = countTotalTurns(roomShifts);

            const cardClass = isToday
              ? `estela-card status-${statusKey}`
              : `estela-card estela-card-past ${roomShifts.length > 0 ? 'has-turns' : 'no-turns'}`;

            return (
              <article key={room.id} className={cardClass}>
                <div className="estela-card-top">
                  <div className="estela-room-num">Habitación {room.id}</div>
                  <div className="estela-room-status">
                    {isToday ? (
                      isOccupied ? 'Ocupada' : 'Libre'
                    ) : (
                      roomTurnosCount > 0
                        ? `${roomTurnosCount} ${roomTurnosCount === 1 ? 'turno' : 'turnos'}`
                        : 'Sin turnos'
                    )}
                  </div>
                </div>

                <div className="estela-room-count">
                  {isToday ? (
                    <>
                      {roomTurnosCount}{' '}
                      {roomTurnosCount === 1 ? 'turno hoy' : 'turnos hoy'}
                    </>
                  ) : (
                    <>
                      {roomTurnosCount}{' '}
                      {roomTurnosCount === 1 ? 'turno registrado' : 'turnos registrados'}
                    </>
                  )}
                </div>

                {isToday && isOccupied && room.turnoActualInicio && (
                  <div className="estela-cleaning-note">
                    Turno en curso (iniciado hace {formatElapsedTime(room.turnoActualInicio)})
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
                      const turnosDelPase = calculateShiftTurns(turno);
                      const labelTurnos = turnosDelPase > 1 ? ` · ${turnosDelPase} turnos` : '';
                      const duracionStr = formatDurationMinutes(turno.duracionMinutos);
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
                            Turno de {horaIni} a {horaFin} ({duracionStr}{labelTurnos})
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
      )}
    </section>
  );
};
