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
    selectedDate,
    setSelectedDate,
    todayDate,
    adjustStock,
    addProduct,
    addConsumptionToRoom,
  } = useRoomsStream();

  const [activeModalRoomId, setActiveModalRoomId] = useState<number | null>(null);
  const [isEstela, setIsEstela] = useState<boolean>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const urlHasSecret = path.includes('estelaibarra147') || hash.includes('estelaibarra147');
    
    if (urlHasSecret) {
      try {
        localStorage.setItem('chezz_estela_authorized', 'true');
      } catch (e) {}
      return true;
    }

    // Si se abre desde el acceso directo instalado en el celular (modo standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    if (isStandalone) {
      try {
        if (localStorage.getItem('chezz_estela_authorized') === 'true') {
          return true;
        }
      } catch (e) {}
    }

    return false;
  });

  // Escuchar cambios de ruta o popstate
  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const urlHasSecret = path.includes('estelaibarra147') || hash.includes('estelaibarra147');
      if (urlHasSecret) {
        try {
          localStorage.setItem('chezz_estela_authorized', 'true');
        } catch (e) {}
        setIsEstela(true);
        return;
      }
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
      if (isStandalone) {
        try {
          if (localStorage.getItem('chezz_estela_authorized') === 'true') {
            setIsEstela(true);
            return;
          }
        } catch (e) {}
      }
      setIsEstela(false);
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
        <EstelaView 
          rooms={rooms} 
          shifts={shifts} 
          products={products}
          selectedDate={selectedDate}
          todayDate={todayDate}
          onSelectDate={setSelectedDate}
          onAdjustStock={adjustStock}
          onAddProduct={addProduct}
        />
      ) : (
        <StaffView
          rooms={rooms}
          onOpenConsumption={(id) => setActiveModalRoomId(id)}
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
