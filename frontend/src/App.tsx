import React, { useState } from 'react';
import { useRoomsStream } from './hooks/useRoomsStream';
import { HeaderChrome, ViewMode, DeviceMode } from './components/HeaderChrome';
import { StaffView } from './components/StaffView';
import { EstelaView } from './components/EstelaView';
import { ConsumptionModal } from './components/ConsumptionModal';

const deviceLabels: Record<DeviceMode, string> = {
  desktop: 'escritorio',
  tablet: 'tablet (834 px)',
  mobile: 'celular (390 px)',
};

export const App: React.FC = () => {
  const {
    rooms,
    products,
    shifts,
    consumptions,
    adjustStock,
    addProduct,
    addConsumptionToRoom,
    changeRoomStatus,
  } = useRoomsStream();

  const [viewMode, setViewMode] = useState<ViewMode>('staff');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [activeModalRoomId, setActiveModalRoomId] = useState<number | null>(null);

  const activeRoom = rooms.find((r) => r.id === activeModalRoomId);

  return (
    <div>
      {/* Barra superior de cambio de vista y selector de dispositivo */}
      <HeaderChrome
        currentView={viewMode}
        onViewChange={setViewMode}
        currentDevice={deviceMode}
        onDeviceChange={setDeviceMode}
      />

      {/* Escenario de visualización con soporte responsive */}
      <main className="stage">
        <div className="stage-note">
          Vista previa en {deviceLabels[deviceMode]}
        </div>

        <div className="device-frame" data-device={deviceMode}>
          <div className="app-shell">
            {viewMode === 'staff' ? (
              <StaffView
                rooms={rooms}
                products={products}
                onOpenConsumption={(id) => setActiveModalRoomId(id)}
                onChangeRoomStatus={changeRoomStatus}
                onAdjustStock={adjustStock}
                onAddProduct={addProduct}
              />
            ) : (
              <EstelaView rooms={rooms} shifts={shifts} />
            )}
          </div>
        </div>
      </main>

      {/* Modal de Carga de Consumo en Habitación Ocupada */}
      {activeModalRoomId !== null && (
        <ConsumptionModal
          roomId={activeModalRoomId}
          products={products}
          consumption={consumptions[activeModalRoomId]}
          onClose={() => setActiveModalRoomId(null)}
          onAddItem={(productId) => addConsumptionToRoom(activeModalRoomId, productId)}
        />
      )}
    </div>
  );
};
