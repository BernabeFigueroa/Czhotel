import React, { useState, useEffect } from 'react';
import { RoomDTO, ShiftDTO, ProductDTO, RoomConsumptionDTO } from '../types';
import { StockPanel } from './StockPanel';
import { VehicleIcon } from './VehicleIcon';

interface EstelaViewProps {
  rooms: RoomDTO[];
  shifts: ShiftDTO[];
  products: ProductDTO[];
  consumptions?: Record<number, RoomConsumptionDTO>;
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

function formatPrice(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

function countTotalTurns(shiftsList: ShiftDTO[]): number {
  return shiftsList.reduce((acc, s) => acc + calculateShiftTurns(s), 0);
}

export const EstelaView: React.FC<EstelaViewProps> = ({
  rooms,
  shifts,
  products,
  consumptions = {},
  selectedDate,
  todayDate,
  onSelectDate,
  onAdjustStock,
  onAddProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'stock'>('rooms');

  // Tamaño de tipografía configurable (Normal, Grande, Muy grande) con persistencia
  const [fontScale, setFontScale] = useState<'normal' | 'large' | 'xlarge'>(() => {
    try {
      const saved = localStorage.getItem('chezz_estela_font_scale');
      if (saved === 'normal' || saved === 'large' || saved === 'xlarge') {
        return saved;
      }
    } catch (e) {}
    return 'normal';
  });

  const handleCycleFontScale = () => {
    const nextScale: Record<'normal' | 'large' | 'xlarge', 'normal' | 'large' | 'xlarge'> = {
      normal: 'large',
      large: 'xlarge',
      xlarge: 'normal'
    };
    const next = nextScale[fontScale];
    setFontScale(next);
    try {
      localStorage.setItem('chezz_estela_font_scale', next);
    } catch (e) {}
  };

  // Soporte de instalación PWA en Android / Samsung
  const [canInstall, setCanInstall] = useState<boolean>(() => {
    return typeof window !== 'undefined' && !!(window as any).deferredInstallPrompt;
  });

  useEffect(() => {
    const handleCanInstall = () => setCanInstall(true);
    window.addEventListener('pwa-can-install', handleCanInstall);
    return () => window.removeEventListener('pwa-can-install', handleCanInstall);
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredInstallPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      (window as any).deferredInstallPrompt = null;
      setCanInstall(false);
    }
  };

  const isToday = selectedDate === todayDate;
  const yesterdayDate = getYesterdayString(todayDate);
  const isYesterday = selectedDate === yesterdayDate;

  const validShifts = shifts.filter((s) => s.tipo === 'TURNO');
  const totalShiftsCount = countTotalTurns(validShifts);

  return (
    <section className="view view-estela" data-font-size={fontScale}>
      {canInstall && (
        <div className="estela-install-banner">
          <div className="estela-install-info">
            <span className="estela-install-icon">📲</span>
            <div>
              <div className="estela-install-title">Instalar como aplicación</div>
              <div className="estela-install-desc">Abre Chezz en pantalla completa sin barra de navegación</div>
            </div>
          </div>
          <button
            type="button"
            className="estela-install-btn"
            onClick={handleInstallClick}
          >
            Instalar
          </button>
        </div>
      )}
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

                {isToday && isOccupied && (
                  <div className="estela-active-billing-box">
                    <div className="estela-billing-header">
                      <div className="estela-vehicle-tag">
                        <VehicleIcon type={room.vehiculo || 'AUTO'} size={18} />
                        <span>Ingreso: {room.vehiculo === 'MOTO' ? 'Moto' : room.vehiculo === 'DIDI' ? 'DiDi' : 'Auto'}</span>
                      </div>
                      {room.turnoActualInicio && (
                        <span className="estela-billing-time">
                          Hace {formatElapsedTime(room.turnoActualInicio)}
                        </span>
                      )}
                    </div>

                    {(() => {
                      const roomConsumption = consumptions?.[room.id];
                      const activeItems = roomConsumption?.items || [];
                      const activeConsumosTotal = roomConsumption?.total || 0;
                      const minsElapsed = elapsedMinutes(room.turnoActualInicio);
                      const turnosCount = minsElapsed < 160 ? 1 : (1 + Math.floor((minsElapsed - 160) / 120) + 1);
                      const precioBaseTurno = (room.precioBase || 35000) * turnosCount;
                      const totalCobroActual = precioBaseTurno + activeConsumosTotal;

                      return (
                        <>
                          <div className="estela-billing-breakdown">
                            <div className="estela-billing-row">
                              <span>
                                Habitación ({turnosCount === 1 ? '1 turno base' : `${turnosCount} turnos`})
                              </span>
                              <span className="estela-row-val">{formatPrice(precioBaseTurno)}</span>
                            </div>

                            <div className="estela-billing-row">
                              <span>
                                Consumos minibar ({activeItems.length === 0 ? '0' : activeItems.reduce((a, b) => a + b.cantidad, 0)} {activeItems.length === 1 ? 'producto' : 'productos'})
                              </span>
                              <span className="estela-row-val">{formatPrice(activeConsumosTotal)}</span>
                            </div>

                            {activeItems.length > 0 && (
                              <div className="estela-active-items-list">
                                {activeItems.map((it) => (
                                  <span key={it.id || it.productoId} className="estela-active-item-chip">
                                    {it.nombre} x{it.cantidad} ({formatPrice(it.precioUnitario * it.cantidad)})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="estela-total-charge-banner">
                            <span className="estela-charge-label">TOTAL A COBRAR TURNO ACTUAL</span>
                            <span className="estela-charge-amount">{formatPrice(totalCobroActual)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="estela-turns">
                  <div className="estela-turns-heading">Turnos anteriores de la fecha</div>
                  {roomShifts.length === 0 ? (
                    <div className="estela-empty-turns">
                      {isToday ? 'Todavía no hay turnos cerrados hoy' : 'No se usó en esta fecha'}
                    </div>
                  ) : (
                    roomShifts.map((turno) => {
                      const horaIni = formatHourMin(turno.horaInicio);
                      const horaFin = formatHourMin(turno.horaFin);
                      const turnosDelPase = calculateShiftTurns(turno);
                      const labelTurnos = turnosDelPase > 1 ? ` · ${turnosDelPase} turnos` : '';
                      const duracionStr = formatDurationMinutes(turno.duracionMinutos);
                      const vehiculoTurno = turno.vehiculo || 'AUTO';
                      const consumosTurnoTotal = (turno.items || []).reduce(
                        (acc, it) => acc + (it.precioUnitario * it.cantidad),
                        0
                      );
                      const precioBaseTurno = (room.precioBase || 35000) * (turnosDelPase || 1);
                      const totalTurnoCobrado = precioBaseTurno + consumosTurnoTotal;

                      const itemsList =
                        turno.items && turno.items.length > 0
                          ? turno.items
                              .map(
                                (it) =>
                                  `${it.nombre}${it.cantidad > 1 ? ` x${it.cantidad}` : ''} (${formatPrice(it.precioUnitario * it.cantidad)})`
                              )
                              .join(', ')
                          : 'Sin consumo';

                      return (
                        <div key={turno.id} className="estela-turn">
                          <div className="estela-turn-topline">
                            <div className="estela-turn-time">
                              {horaIni} a {horaFin} ({duracionStr}{labelTurnos})
                            </div>
                            <div className="estela-turn-vehicle-badge">
                              <VehicleIcon type={vehiculoTurno} size={15} />
                              <span>{vehiculoTurno === 'MOTO' ? 'Moto' : vehiculoTurno === 'DIDI' ? 'DiDi' : 'Auto'}</span>
                            </div>
                          </div>
                          <div className="estela-turn-items">
                            <span>Minibar: {itemsList}</span>
                          </div>
                          <div className="estela-turn-total-line">
                            <span>Cobro registrado: <strong>{formatPrice(totalTurnoCobrado)}</strong></span>
                          </div>
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

      {/* Control discreto al pie para ajustar tamaño de letra */}
      <footer className="estela-footer-settings">
        <button
          type="button"
          onClick={handleCycleFontScale}
          className="estela-font-toggle-btn"
          title="Tocar para alternar el tamaño de la letra"
          aria-label="Cambiar tamaño de texto"
        >
          <span className="estela-font-toggle-icon">Aa</span>
          <span className="estela-font-toggle-label">
            {fontScale === 'normal' && 'Tamaño: Normal'}
            {fontScale === 'large' && 'Tamaño: Grande'}
            {fontScale === 'xlarge' && 'Tamaño: Extra grande'}
          </span>
        </button>
      </footer>
    </section>
  );
};
