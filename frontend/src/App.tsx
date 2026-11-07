import React, { useState, useEffect } from 'react';
import { useRoomsStream } from './hooks/useRoomsStream';
import { StaffView } from './components/StaffView';
import { EstelaView } from './components/EstelaView';
import { ConsumptionModal } from './components/ConsumptionModal';
import { PlanillaPapelView } from './components/PlanillaPapelView';

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
    updateRoomVehicle,
  } = useRoomsStream();

  const [activeModalRoomId, setActiveModalRoomId] = useState<number | null>(null);
  
  // Vista activa: 'principal' (grilla habitual de habitaciones) o 'planilla' (planilla en papel por turnos)
  const [activeView, setActiveView] = useState<'principal' | 'planilla'>('principal');

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
      {activeView === 'planilla' ? (
        /* Vista Planilla en Papel por Turnos (Mañana, Tarde, Noche) */
        <PlanillaPapelView
          rooms={rooms}
          shifts={shifts}
          products={products}
          consumptions={consumptions}
          selectedDate={selectedDate}
          todayDate={todayDate}
          onSelectDate={setSelectedDate}
          onSwitchToMainView={() => setActiveView('principal')}
          onOpenConsumption={(id) => setActiveModalRoomId(id)}
        />
      ) : (
        /* Vista Principal (por defecto) */
        <div className="pb-32">
          {isEstela ? (
            <EstelaView 
              rooms={rooms} 
              shifts={shifts} 
              products={products}
              consumptions={consumptions}
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

          {/* BOTÓN ABAJO DEL TODO PARA CAMBIAR A LA VISTA PLANILLA */}
          <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#211F1A]/95 backdrop-blur-md border-t-4 border-[#C9A227] p-3 md:p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] flex justify-center">
            <button
              type="button"
              onClick={() => setActiveView('planilla')}
              className="w-full max-w-2xl py-3.5 md:py-4 px-6 bg-[#C9A227] hover:bg-[#d8af2c] active:bg-[#b58f1f] text-[#221E10] font-black text-lg md:text-2xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95 border-2 border-[#221E10]/20"
            >
              <span className="text-2xl md:text-3xl">📋</span>
              <span>VER PLANILLA EN PAPEL (Turno Mañana / Tarde / Noche)</span>
            </button>
          </footer>
        </div>
      )}

      {/* Modal de Carga de Consumo en Habitación Ocupada */}
      {activeModalRoomId !== null && (
        <ConsumptionModal
          roomId={activeModalRoomId}
          products={products}
          consumption={consumptions[activeModalRoomId]}
          currentVehicle={rooms.find((r) => r.id === activeModalRoomId)?.vehiculo || 'AUTO'}
          onClose={() => setActiveModalRoomId(null)}
          onAddItem={(productId) => addConsumptionToRoom(activeModalRoomId, productId)}
          onUpdateVehicle={(vehicle) => updateRoomVehicle(activeModalRoomId, vehicle)}
        />
      )}
    </div>
  );
};
