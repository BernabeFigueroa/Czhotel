import React, { useState, useEffect } from 'react';
import { ProductDTO, RoomConsumptionDTO, VehicleType } from '../types';
import { VehicleIcon } from './VehicleIcon';

interface ConsumptionModalProps {
  roomId: number;
  products: ProductDTO[];
  consumption?: RoomConsumptionDTO;
  currentVehicle?: VehicleType;
  onClose: () => void;
  onAddItem: (productId: number) => void;
  onUpdateVehicle: (vehicle: VehicleType) => void;
}

function formatPrice(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

export const ConsumptionModal: React.FC<ConsumptionModalProps> = ({
  roomId,
  products,
  consumption,
  currentVehicle = 'AUTO',
  onClose,
  onAddItem,
  onUpdateVehicle,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(currentVehicle);
  const currentItems = consumption?.items || [];
  const currentTotal = consumption?.total || 0;

  useEffect(() => {
    setSelectedVehicle(currentVehicle);
  }, [currentVehicle]);

  const handleSelectVehicle = (vehicle: VehicleType) => {
    setSelectedVehicle(vehicle);
    onUpdateVehicle(vehicle);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet" role="dialog" aria-modal="true">
        <div className="modal-head">
          <span className="modal-title">Habitación {roomId}</span>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        {/* Selector de Vehículo de Ingreso (Auto, Moto, DiDi) - 3 Rectángulos sin emojis */}
        <div className="vehicle-selector-box">
          <div className="vehicle-selector-title">Vehículo de ingreso</div>
          <div className="vehicle-cards-grid">
            <button
              type="button"
              className={`vehicle-card ${selectedVehicle === 'AUTO' ? 'active' : ''}`}
              onClick={() => handleSelectVehicle('AUTO')}
              aria-label="Ingreso en Auto"
            >
              <VehicleIcon type="AUTO" size={26} />
              <span className="vehicle-card-label">Auto</span>
            </button>

            <button
              type="button"
              className={`vehicle-card ${selectedVehicle === 'MOTO' ? 'active' : ''}`}
              onClick={() => handleSelectVehicle('MOTO')}
              aria-label="Ingreso en Moto"
            >
              <VehicleIcon type="MOTO" size={26} />
              <span className="vehicle-card-label">Moto</span>
            </button>

            <button
              type="button"
              className={`vehicle-card ${selectedVehicle === 'DIDI' ? 'active' : ''}`}
              onClick={() => handleSelectVehicle('DIDI')}
              aria-label="Ingreso en DiDi"
            >
              <VehicleIcon type="DIDI" size={26} />
              <span className="vehicle-card-label">DiDi</span>
            </button>
          </div>
        </div>

        <div className="modal-sub">
          Tocá el botón + de cada producto para cargarlo en el consumo de este turno.
        </div>

        <div className="item-list">
          {products.map((prod) => {
            const current = currentItems.find((it) => it.productoId === prod.id);
            return (
              <div key={prod.id} className="item-chip">
                {current && current.cantidad > 0 && (
                  <span className="qty-badge">{current.cantidad}</span>
                )}
                <span className="item-name">{prod.nombre}</span>
                <span className="item-price">{formatPrice(prod.precio)}</span>
                <button
                  type="button"
                  className="plus-btn"
                  onClick={() => onAddItem(prod.id)}
                  aria-label={`Cargar ${prod.nombre}`}
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
              </div>
            );
          })}
        </div>

        <div className="current-items">
          <div className="current-items-title">Consumo de este turno</div>
          {currentItems.length === 0 ? (
            <div
              className="current-item-row"
              style={{ color: 'var(--board-text-soft)' }}
            >
              Todavía no se cargó nada
            </div>
          ) : (
            currentItems.map((item) => (
              <div key={item.id || item.productoId} className="current-item-row">
                <span>
                  {item.nombre} x{item.cantidad}
                </span>
                <span>{formatPrice(item.precioUnitario * item.cantidad)}</span>
              </div>
            ))
          )}

          <div className="current-total">
            <span>Total Minibar</span>
            <span>{formatPrice(currentTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
