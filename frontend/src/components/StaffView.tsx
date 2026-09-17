import React, { useState, useEffect } from 'react';
import { RoomDTO, ProductDTO } from '../types';
import { StockPanel } from './StockPanel';

interface StaffViewProps {
  rooms: RoomDTO[];
  products: ProductDTO[];
  onOpenConsumption: (roomId: number) => void;
  onChangeRoomStatus: (roomId: number, nuevoEstado: 'LIBRE' | 'OCUPADA' | 'LIMPIANDO') => void;
  onAdjustStock: (productId: number, delta: number) => void;
  onAddProduct: (nombre: string, precio: number, stock: number) => Promise<any>;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatPrice(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

function elapsedMinutes(dateStr: string | null): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

const CLEAN_MAX_MIN = 20;

export const StaffView: React.FC<StaffViewProps> = ({
  rooms,
  products,
  onOpenConsumption,
  onChangeRoomStatus,
  onAdjustStock,
  onAddProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'stock'>('rooms');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reloj en vivo y refresco de minutos transcurridos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  const getClockString = () => {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dia = dias[currentTime.getDay()];
    const fecha = `${pad2(currentTime.getDate())}/${pad2(currentTime.getMonth() + 1)}`;
    const hora = `${pad2(currentTime.getHours())}:${pad2(currentTime.getMinutes())}`;
    return `${dia} ${fecha} · ${hora}`;
  };

  const handleTileClick = (room: RoomDTO) => {
    if (room.estadoActual === 'LIBRE') {
      onChangeRoomStatus(room.id, 'OCUPADA');
      showToast(`Habitación ${room.id}: turno iniciado`);
    } else if (room.estadoActual === 'OCUPADA') {
      onChangeRoomStatus(room.id, 'LIMPIANDO');
      showToast(`Habitación ${room.id}: turno cerrado, limpieza en curso`);
    } else if (room.estadoActual === 'LIMPIANDO') {
      onChangeRoomStatus(room.id, 'LIBRE');
      showToast(`Habitación ${room.id}: limpieza finalizada, pasa a libre`);
    }
  };

  return (
    <section className="view view-staff">
      <header className="staff-header">
        <div>
          <span className="staff-title-main">Habitaciones</span>
          <span className="staff-title-sub">{getClockString()}</span>
        </div>
        <nav className="staff-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            Habitaciones
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            Stock
          </button>
        </nav>
      </header>

      <div className="staff-body">
        {activeTab === 'rooms' && (
          <div>
            <div className="legend">
              <span>
                <i className="dot-libre"></i>Libre
              </span>
              <span>
                <i className="dot-limpiando"></i>Limpiando
              </span>
              <span>
                <i className="dot-ocupada"></i>Ocupada
              </span>
            </div>

            <div className="rooms-grid">
              {rooms.map((room) => {
                const statusKey = room.estadoActual.toLowerCase();
                const isOccupied = room.estadoActual === 'OCUPADA';
                const isCleaning = room.estadoActual === 'LIMPIANDO';

                let timeText = '';
                if (isOccupied && room.turnoActualInicio) {
                  timeText = `Hace ${elapsedMinutes(room.turnoActualInicio)} min`;
                } else if (isCleaning && room.limpiezaInicio) {
                  const restante = Math.max(0, CLEAN_MAX_MIN - elapsedMinutes(room.limpiezaInicio));
                  timeText = restante > 0 ? `Quedan ${restante} min` : 'Ya debería estar libre';
                }

                return (
                  <article
                    key={room.id}
                    className={`room-tile status-${statusKey}`}
                    onClick={() => handleTileClick(room)}
                  >
                    <div className="room-num">{pad2(room.id)}</div>
                    <div className="room-status">
                      {room.estadoActual === 'LIBRE'
                        ? 'Libre'
                        : room.estadoActual === 'LIMPIANDO'
                        ? 'Limpiando'
                        : 'Ocupada'}
                    </div>

                    {timeText && <div className="room-time">{timeText}</div>}

                    <div className="room-price">{formatPrice(room.precioBase || 12000)}</div>

                    {/* Botón + ÚNICAMENTE para habitaciones Ocupadas */}
                    {isOccupied ? (
                      <button
                        type="button"
                        className="plus-btn"
                        aria-label={`Agregar consumo a habitación ${room.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenConsumption(room.id);
                        }}
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
                    ) : (
                      <div className="room-hint">
                        {room.estadoActual === 'LIBRE'
                          ? 'Tocar para ocupar'
                          : 'Tocar para liberar'}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <StockPanel
            products={products}
            onAdjustStock={onAdjustStock}
            onAddProduct={onAddProduct}
          />
        )}
      </div>

      {toastMessage && <div className="toast">{toastMessage}</div>}
    </section>
  );
};
