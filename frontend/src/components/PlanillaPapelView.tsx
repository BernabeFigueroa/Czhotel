import React, { useState, useMemo } from 'react';
import { RoomDTO, ShiftDTO, ProductDTO, RoomConsumptionDTO, VehicleType } from '../types';
import { VehicleIcon } from './VehicleIcon';

interface PlanillaPapelViewProps {
  rooms: RoomDTO[];
  shifts: ShiftDTO[];
  products: ProductDTO[];
  consumptions?: Record<number, RoomConsumptionDTO>;
  selectedDate: string;
  todayDate: string;
  onSelectDate: (date: string) => void;
  onSwitchToMainView: () => void;
  onOpenConsumption?: (roomId: number) => void;
}

type TurnoType = 'MANANA' | 'TARDE' | 'NOCHE';

interface TurnoDef {
  key: TurnoType;
  nombre: string;
  horario: string;
  icono: string;
  descripcion: string;
}

const TURNOS: TurnoDef[] = [
  {
    key: 'MANANA',
    nombre: 'Turno Mañana',
    horario: '7:00 AM a 2:30 PM (07:00 a 14:30)',
    icono: '🌅',
    descripcion: 'Inicia 07:00 hs · Termina 14:30 hs'
  },
  {
    key: 'TARDE',
    nombre: 'Turno Tarde',
    horario: '2:30 PM a 10:00 PM (14:30 a 22:00)',
    icono: '☀️',
    descripcion: 'Inicia 14:30 hs · Termina 22:00 hs'
  },
  {
    key: 'NOCHE',
    nombre: 'Turno Noche',
    horario: '10:00 PM a 7:00 AM (22:00 a 07:00)',
    icono: '🌙',
    descripcion: 'Inicia 22:00 hs · Termina 07:00 hs'
  }
];

function getCategoryAndPrice(id: number): { categoria: string; precioBase: number } {
  if ([1, 2, 15].includes(id)) return { categoria: 'Suite', precioBase: 60000 };
  if ([5, 12, 17].includes(id)) return { categoria: 'Premium', precioBase: 40000 };
  return { categoria: 'Especial', precioBase: 35000 };
}

function formatPrice(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatHourMin(isoString: string | null): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires',
    };
    return new Intl.DateTimeFormat('es-AR', options).format(d) + ' hs';
  } catch {
    return '--:--';
  }
}

function getArgentinaMinutes(isoString: string | null): number {
  if (!isoString) return 0;
  try {
    const d = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const min = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return hour * 60 + min;
  } catch {
    return 0;
  }
}

function getTurnoType(isoString: string | null): TurnoType {
  const mins = getArgentinaMinutes(isoString);
  // Mañana: 7:00 a 14:30 (420 a 870 min)
  if (mins >= 420 && mins < 870) {
    return 'MANANA';
  }
  // Tarde: 14:30 a 22:00 (870 a 1320 min)
  if (mins >= 870 && mins < 1320) {
    return 'TARDE';
  }
  // Noche: 22:00 a 07:00 (1320 a 1440 min o 0 a 420 min)
  return 'NOCHE';
}

function calculateShiftTurns(duracionMinutos: number): number {
  if (duracionMinutos <= 15) return 0;
  if (duracionMinutos < 160) return 1;
  return 1 + Math.floor((duracionMinutos - 160) / 120) + 1;
}

function formatDuration(minsTotal: number): string {
  if (minsTotal < 60) return `${minsTotal} min`;
  const hours = Math.floor(minsTotal / 60);
  const mins = minsTotal % 60;
  if (mins === 0) return `${hours} hs`;
  return `${hours} hs ${mins} min`;
}

function getYesterdayString(todayStr: string): string {
  const [y, m, d] = todayStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

interface PlanillaRowData {
  id: string;
  habitacionId: number;
  categoria: string;
  horaEntradaStr: string;
  horaSalidaStr: string;
  esActivo: boolean;
  duracionStr: string;
  consumicionesTexto: string;
  consumicionesTotal: number;
  vehiculo: VehicleType;
  esVehiculoCambiado: boolean;
  turnosCount: number;
  precioBase: number;
  totalACobrar: number;
  turnoKey: TurnoType;
  rawTimeForSort: number;
}

export const PlanillaPapelView: React.FC<PlanillaPapelViewProps> = ({
  rooms,
  shifts,
  products,
  consumptions = {},
  selectedDate,
  todayDate,
  onSelectDate,
  onSwitchToMainView,
  onOpenConsumption,
}) => {
  const [fontSize, setFontSize] = useState<'normal' | 'grande'>('grande');

  const isToday = selectedDate === todayDate;
  const yesterdayDate = getYesterdayString(todayDate);
  const isYesterday = selectedDate === yesterdayDate;

  // Turno actual según la hora en vivo
  const currentTurnoKey = useMemo<TurnoType>(() => {
    return getTurnoType(new Date().toISOString());
  }, []);

  // Construir las filas combinando turnos finalizados + habitaciones en curso (si es hoy)
  const rows = useMemo<PlanillaRowData[]>(() => {
    const list: PlanillaRowData[] = [];

    // 1. Turnos cerrados de la base de datos para esta fecha
    const validShifts = shifts.filter((s) => s.tipo === 'TURNO');
    for (const s of validShifts) {
      const room = rooms.find((r) => r.id === s.habitacionId);
      const meta = getCategoryAndPrice(s.habitacionId);
      const categoria = room?.categoria || meta.categoria;
      const precioBase = room?.precioBase || meta.precioBase;

      const duracion = s.duracionMinutos || 0;
      const turnosCount = Math.max(1, calculateShiftTurns(duracion));

      let consumosTotal = 0;
      let consumosStr = 'Sin consumos';
      if (s.items && s.items.length > 0) {
        consumosTotal = s.items.reduce((sum, it) => sum + it.cantidad * it.precioUnitario, 0);
        consumosStr = s.items
          .map((it) => `${it.nombre}${it.cantidad > 1 ? ` x${it.cantidad}` : ''}`)
          .join(', ');
      }

      const totalACobrar = precioBase * turnosCount + consumosTotal;
      const vehiculoNorm = ((s.vehiculo || 'AUTO').toUpperCase()) as VehicleType;
      const esCambiado = vehiculoNorm === 'MOTO' || vehiculoNorm === 'DIDI';

      list.push({
        id: `shift-${s.id}`,
        habitacionId: s.habitacionId,
        categoria,
        horaEntradaStr: formatHourMin(s.horaInicio),
        horaSalidaStr: formatHourMin(s.horaFin),
        esActivo: false,
        duracionStr: formatDuration(duracion),
        consumicionesTexto: consumosStr,
        consumicionesTotal: consumosTotal,
        vehiculo: vehiculoNorm,
        esVehiculoCambiado: esCambiado,
        turnosCount,
        precioBase,
        totalACobrar,
        turnoKey: getTurnoType(s.horaInicio),
        rawTimeForSort: new Date(s.horaInicio).getTime(),
      });
    }

    // 2. Si estamos viendo el día de hoy, agregar habitaciones actualmente OCUPADAS
    if (isToday) {
      const occupiedRooms = rooms.filter((r) => r.estadoActual === 'OCUPADA' && r.turnoActualInicio);
      for (const r of occupiedRooms) {
        const meta = getCategoryAndPrice(r.id);
        const categoria = r.categoria || meta.categoria;
        const precioBase = r.precioBase || meta.precioBase;

        const startMs = new Date(r.turnoActualInicio!).getTime();
        const minsElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 60000));
        const turnosCount = minsElapsed < 160 ? 1 : 1 + Math.floor((minsElapsed - 160) / 120) + 1;

        const roomCons = consumptions[r.id];
        let consumosTotal = roomCons?.total || 0;
        let consumosStr = 'Sin consumos';
        if (roomCons && roomCons.items && roomCons.items.length > 0) {
          consumosStr = roomCons.items
            .map((it) => `${it.nombre}${it.cantidad > 1 ? ` x${it.cantidad}` : ''}`)
            .join(', ');
        }

        const totalACobrar = precioBase * turnosCount + consumosTotal;
        const vehiculoNorm = ((r.vehiculo || 'AUTO').toUpperCase()) as VehicleType;
        const esCambiado = vehiculoNorm === 'MOTO' || vehiculoNorm === 'DIDI';

        list.push({
          id: `active-${r.id}`,
          habitacionId: r.id,
          categoria,
          horaEntradaStr: formatHourMin(r.turnoActualInicio),
          horaSalidaStr: '🟢 EN CURSO (Adentro)',
          esActivo: true,
          duracionStr: `Hace ${formatDuration(minsElapsed)}`,
          consumicionesTexto: consumosStr,
          consumicionesTotal: consumosTotal,
          vehiculo: vehiculoNorm,
          esVehiculoCambiado: esCambiado,
          turnosCount,
          precioBase,
          totalACobrar,
          turnoKey: getTurnoType(r.turnoActualInicio),
          rawTimeForSort: startMs,
        });
      }
    }

    // Ordenar cronológicamente por hora de entrada
    return list.sort((a, b) => a.rawTimeForSort - b.rawTimeForSort);
  }, [shifts, rooms, consumptions, isToday]);

  // Agrupar filas por Turno
  const turnosConFilas = useMemo(() => {
    return TURNOS.map((def) => {
      const filas = rows.filter((r) => r.turnoKey === def.key);
      const totalTurno = filas.reduce((sum, r) => sum + r.totalACobrar, 0);
      const countTurnos = filas.length;
      return {
        ...def,
        filas,
        totalTurno,
        countTurnos,
        esTurnoActual: isToday && def.key === currentTurnoKey,
      };
    });
  }, [rows, isToday, currentTurnoKey]);

  // Totales generales del día
  const totalGeneralDia = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.totalACobrar, 0);
  }, [rows]);

  const totalMovimientosDia = rows.length;

  return (
    <div className={`planilla-wrapper min-h-screen bg-[#FBF9F2] text-[#22201A] pb-12 ${fontSize === 'grande' ? 'text-lg' : 'text-base'}`}>
      
      {/* Barra superior con controles y botón volver */}
      <header className="sticky top-0 z-30 bg-[#2B2822] text-[#F1ECE0] border-b-4 border-[#C9A227] px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSwitchToMainView}
              className="px-4 py-2 bg-[#C9A227] hover:bg-[#d8af2c] text-[#221E10] font-black rounded-lg flex items-center gap-2 shadow active:scale-95 transition-all text-base md:text-lg"
              title="Volver a la vista de cuadrícula de habitaciones"
            >
              ⬅️ Volver a Habitaciones
            </button>
            <div>
              <h1 className="font-bold text-xl md:text-2xl text-white tracking-wide flex items-center gap-2">
                📋 Planilla en Papel por Turnos
              </h1>
              <p className="text-xs md:text-sm text-[#B8B2A0]">
                Mañana (7:00 a 14:30) · Tarde (14:30 a 22:00) · Noche (22:00 a 7:00)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Control de tamaño de letra para señora grande */}
            <div className="bg-[#211F1A] border border-[#4A4638] rounded-lg p-1 flex items-center gap-1">
              <span className="text-xs text-[#B8B2A0] px-2 font-semibold">Letra:</span>
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={`px-2.5 py-1 text-xs font-bold rounded ${fontSize === 'normal' ? 'bg-[#C9A227] text-[#221E10]' : 'text-stone-300 hover:bg-[#33302A]'}`}
              >
                A Normal
              </button>
              <button
                type="button"
                onClick={() => setFontSize('grande')}
                className={`px-2.5 py-1 text-xs font-bold rounded ${fontSize === 'grande' ? 'bg-[#C9A227] text-[#221E10]' : 'text-stone-300 hover:bg-[#33302A]'}`}
              >
                A+ Grande
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Selector de fecha y Tarjeta de Gran Total */}
      <div className="max-w-7xl mx-auto px-3 md:px-6 pt-5">
        <div className="bg-white border-2 border-[#DDD5BE] rounded-xl p-4 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          
          {/* Selector de fechas rápido */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-stone-700 text-sm md:text-base mr-1">Fecha de la planilla:</span>
            <button
              type="button"
              onClick={() => onSelectDate(todayDate)}
              className={`px-4 py-2 font-bold rounded-lg border text-sm md:text-base transition-all ${
                isToday
                  ? 'bg-[#2E7D32] text-white border-[#2E7D32] shadow'
                  : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
            >
              📅 Hoy
            </button>
            <button
              type="button"
              onClick={() => onSelectDate(yesterdayDate)}
              className={`px-4 py-2 font-bold rounded-lg border text-sm md:text-base transition-all ${
                isYesterday
                  ? 'bg-[#2E7D32] text-white border-[#2E7D32] shadow'
                  : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
            >
              Ayer
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && onSelectDate(e.target.value)}
              className="px-3 py-2 border-2 border-stone-300 rounded-lg text-sm md:text-base font-bold text-stone-800 bg-white"
            />
          </div>

          {/* Gran Total del Día */}
          <div className="bg-[#FAF6EC] border-2 border-[#C9A227] rounded-xl px-5 py-2.5 flex items-center gap-4 shadow-sm">
            <div>
              <span className="block text-xs uppercase tracking-wider font-extrabold text-[#6B6552]">
                Total General Facturado
              </span>
              <span className="text-2xl md:text-3xl font-black text-[#1E3A22]">
                {formatPrice(totalGeneralDia)}
              </span>
            </div>
            <div className="border-l-2 border-[#DDD5BE] pl-4">
              <span className="block text-xs uppercase tracking-wider font-extrabold text-[#6B6552]">
                Movimientos
              </span>
              <span className="text-xl md:text-2xl font-black text-[#26241C]">
                {totalMovimientosDia}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LISTAS POR TURNO: MAÑANA, TARDE, NOCHE                     */}
        {/* ========================================================= */}
        <div className="space-y-8">
          {turnosConFilas.map((turno) => (
            <section
              key={turno.key}
              className={`bg-white border-2 rounded-xl overflow-hidden shadow-md transition-all ${
                turno.esTurnoActual ? 'border-[#C9A227] ring-4 ring-[#C9A227]/20' : 'border-[#DDD5BE]'
              }`}
            >
              {/* Encabezado del Turno */}
              <div
                className={`px-5 py-3.5 border-b-2 flex flex-wrap items-center justify-between gap-3 ${
                  turno.esTurnoActual
                    ? 'bg-[#2B2822] text-[#F1ECE0] border-[#C9A227]'
                    : 'bg-[#F3EEDF] text-[#22201A] border-[#DDD5BE]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl md:text-3xl">{turno.icono}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-black text-xl md:text-2xl tracking-tight">
                        {turno.nombre}
                      </h2>
                      <span className="text-sm font-semibold opacity-80">
                        ({turno.horario})
                      </span>
                      {turno.esTurnoActual && (
                        <span className="bg-[#2E7D32] text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                          🟢 Turno Actual (En vivo)
                        </span>
                      )}
                    </div>
                    <p className={`text-xs md:text-sm font-medium ${turno.esTurnoActual ? 'text-stone-300' : 'text-stone-600'}`}>
                      {turno.descripcion}
                    </p>
                  </div>
                </div>

                {/* Subtotal del Turno */}
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="block text-xs uppercase tracking-wider font-extrabold opacity-75">
                      Turnos registrados
                    </span>
                    <span className="text-lg md:text-xl font-black">
                      {turno.countTurnos} {turno.countTurnos === 1 ? 'habitación' : 'habitaciones'}
                    </span>
                  </div>
                  <div className="border-l-2 border-current/20 pl-4">
                    <span className="block text-xs uppercase tracking-wider font-extrabold opacity-75">
                      Subtotal Turno
                    </span>
                    <span className="text-xl md:text-2xl font-black text-[#8FE08C] drop-shadow-sm">
                      {formatPrice(turno.totalTurno)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contenido / Tabla tipo planilla en papel */}
              {turno.filas.length === 0 ? (
                <div className="p-8 text-center bg-[#FAF9F5] text-stone-500 font-medium">
                  <p className="text-lg">No hay habitaciones registradas en este turno aún.</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Cuando una habitación sea ocupada o complete su turno entre las {turno.horario}, aparecerá aquí automáticamente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#ECE6D5] text-[#26241C] border-b-2 border-[#CFC7AD] text-xs md:text-sm font-black uppercase tracking-wider">
                        <th className="py-3 px-4 border-r border-[#DDD5BE]">1. Habitación</th>
                        <th className="py-3 px-4 border-r border-[#DDD5BE]">2. Hora Entrada</th>
                        <th className="py-3 px-4 border-r border-[#DDD5BE]">3. Hora Salida</th>
                        <th className="py-3 px-4 border-r border-[#DDD5BE]">4. Consumiciones</th>
                        <th className="py-3 px-4 border-r border-[#DDD5BE]">5. Vehículo</th>
                        <th className="py-3 px-4 text-right">6. Total a Cobrar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD5BE]">
                      {turno.filas.map((row, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors font-medium ${
                              row.esActivo
                                ? 'bg-amber-50/80 hover:bg-amber-100/80 font-semibold'
                                : isEven
                                ? 'bg-white hover:bg-stone-50'
                                : 'bg-[#FAF8F2] hover:bg-stone-50'
                            }`}
                          >
                            {/* 1. Habitación */}
                            <td className="py-3.5 px-4 border-r border-[#DDD5BE] align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-lg md:text-xl text-[#22201A]">
                                  Hab. {pad2(row.habitacionId)}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                                  {row.categoria}
                                </span>
                                {row.esActivo && (
                                  <span className="text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-600 text-white animate-pulse">
                                    Adentro
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 2. Hora Entrada */}
                            <td className="py-3.5 px-4 border-r border-[#DDD5BE] align-middle whitespace-nowrap">
                              <span className="font-bold text-stone-900 text-base md:text-lg">
                                {row.horaEntradaStr}
                              </span>
                            </td>

                            {/* 3. Hora Salida */}
                            <td className="py-3.5 px-4 border-r border-[#DDD5BE] align-middle whitespace-nowrap">
                              {row.esActivo ? (
                                <div>
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs md:text-sm font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                                    En curso
                                  </span>
                                  <span className="block text-xs text-stone-500 font-normal mt-0.5">
                                    {row.duracionStr}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-stone-900 text-base md:text-lg">
                                    {row.horaSalidaStr}
                                  </span>
                                  <span className="block text-xs text-stone-500 font-normal mt-0.5">
                                    Duró {row.duracionStr} ({row.turnosCount} {row.turnosCount === 1 ? 'turno' : 'turnos'})
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* 4. Consumiciones */}
                            <td className="py-3.5 px-4 border-r border-[#DDD5BE] align-middle max-w-xs">
                              {row.consumicionesTexto === 'Sin consumos' ? (
                                <span className="text-stone-400 italic text-sm">-</span>
                              ) : (
                                <div>
                                  <span className="text-stone-800 font-bold block text-sm md:text-base leading-snug">
                                    {row.consumicionesTexto}
                                  </span>
                                  <span className="text-xs font-semibold text-stone-500">
                                    Subtotal consumos: {formatPrice(row.consumicionesTotal)}
                                  </span>
                                </div>
                              )}
                              {row.esActivo && onOpenConsumption && (
                                <button
                                  type="button"
                                  onClick={() => onOpenConsumption(row.habitacionId)}
                                  className="mt-1 text-xs font-bold text-[#C9A227] hover:text-[#a07f18] underline block"
                                >
                                  + Cargar más productos
                                </button>
                              )}
                            </td>

                            {/* 5. Vehículo (Resalta claramente si fue cambiado) */}
                            <td className="py-3.5 px-4 border-r border-[#DDD5BE] align-middle whitespace-nowrap">
                              {row.vehiculo === 'MOTO' ? (
                                <div className="inline-flex flex-col">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-black bg-amber-100 text-amber-900 border-2 border-amber-500 shadow-sm">
                                    <VehicleIcon type="MOTO" size={17} />
                                    <span>MOTO</span>
                                  </span>
                                  <span className="text-[11px] font-black text-amber-700 tracking-wider uppercase mt-1">
                                    ⚠️ Cambiado a Moto
                                  </span>
                                </div>
                              ) : row.vehiculo === 'DIDI' ? (
                                <div className="inline-flex flex-col">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-black bg-sky-100 text-sky-900 border-2 border-sky-500 shadow-sm">
                                    <VehicleIcon type="DIDI" size={17} />
                                    <span>DIDI</span>
                                  </span>
                                  <span className="text-[11px] font-black text-sky-700 tracking-wider uppercase mt-1">
                                    ⚠️ Cambiado a DiDi
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-stone-100 text-stone-700 border border-stone-300">
                                  <VehicleIcon type="AUTO" size={17} />
                                  <span>Auto</span>
                                </span>
                              )}
                            </td>

                            {/* 6. Total a Cobrar */}
                            <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                              <span className="font-black text-xl md:text-2xl text-[#1E3A22]">
                                {formatPrice(row.totalACobrar)}
                              </span>
                              <span className="block text-[11px] text-stone-500 font-normal">
                                Base: {formatPrice(row.precioBase * row.turnosCount)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Pie de tabla con subtotal del turno */}
                    <tfoot>
                      <tr className="bg-[#F3EEDF] border-t-2 border-[#DDD5BE] font-black">
                        <td colSpan={5} className="py-3 px-4 text-right text-stone-700 uppercase tracking-wider text-xs md:text-sm">
                          Subtotal {turno.nombre} ({turno.countTurnos} habitaciones):
                        </td>
                        <td className="py-3 px-4 text-right text-xl md:text-2xl text-[#1E3A22]">
                          {formatPrice(turno.totalTurno)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

