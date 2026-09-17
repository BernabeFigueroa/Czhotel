import React, { useState, useEffect } from 'react';
import { useRoomsStream } from './hooks/useRoomsStream';
import { StaffView } from './components/StaffView';
import { EstelaView } from './components/EstelaView';
import { ConsumptionModal } from './components/ConsumptionModal';

export const App: React.FC = () => {
  const {
    rooms,
    products,
    shifts,
    consumptions,
    adjustStock,
    addProduct,
    addConsumptionToRoom,
  } = useRoomsStream();

  const [activeModalRoomId, setActiveModalRoomId] = useState<number | null>(null);
  const [isEstela, setIsEstela] = useState<boolean>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path.includes('estelaibarra147') || hash.includes('estelaibarra147');
  });

  // Escuchar cambios de ruta o popstate
  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      setIsEstela(path.includes('estelaibarra147') || hash.includes('estelaibarra147'));
    };

    window.addEventListener('popstate', checkPath);
    window.addEventListener('hashchange', checkPath);
    return () => {
      window.removeEventListener('popstate', checkPath);
      window.removeEventListener('hashchange', checkPath);
    };
  }, []);

  return (
    <div className="app-shell min-h-screen">
      {isEstela ? (
        <EstelaView rooms={rooms} shifts={shifts} />
      ) : (
        <StaffView
          rooms={rooms}
          products={products}
          onOpenConsumption={(id) => setActiveModalRoomId(id)}
          onAdjustStock={adjustStock}
          onAddProduct={addProduct}
        />
      )}

      {/* Modal de Carga de Consumo en Habitación Ocupada (Personal) */}
      {!isEstela && activeModalRoomId !== null && (
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
