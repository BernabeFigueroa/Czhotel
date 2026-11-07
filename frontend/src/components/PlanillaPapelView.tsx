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
  descripcion: string;
}

const TURNOS: TurnoDef[] = [
  {
    key: 'MANANA',
    nombre: 'Turno Mañana',
    horario: '07:00 a 14:30 hs',
    descripcion: 'Horario: 07:00 a 14:30 hs'
  },
  {
    key: 'TARDE',
    nombre: 'Turno Tarde',
    horario: '14:30 a 22:00 hs',
    descripcion: 'Horario: 14:30 a 22:00 hs'
  },
  {
    key: 'NOCHE',
    nombre: 'Turno Noche',
    horario: '22:00 a 07:00 hs',
    descripcion: 'Horario: 22:00 a 07:00 hs'
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

interface ArgentinaDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  calendarDateStr: string; // "YYYY-MM-DD"
  totalMinutes: number;    // hour * 60 + minute
}

function getArgentinaDateTime(isoString: string | null): ArgentinaDateTime | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10);
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0', 10);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const calendarDateStr = `${year}-${pad(month)}-${pad(day)}`;
    const totalMinutes = hour * 60 + minute;

    return { year, month, day, hour, minute, calendarDateStr, totalMinutes };
  } catch {
    return null;
  }
}

/**
 * Clasifica cualquier turno en su turno correspondiente (MANANA, TARDE, NOCHE)
 * y en su FECHA OPERATIVA del hotel (YYYY-MM-DD).
 * 
 * Regla de turnos del motel:
 * - Turno Mañana: 07:00 a 14:30 (420 a 870 min) -> Fecha = mismo día calendario.
 * - Turno Tarde:  14:30 a 22:00 (870 a 1320 min) -> Fecha = mismo día calendario.
 * - Turno Noche:  22:00 a 23:59 (>= 1320 min) -> Fecha = mismo día calendario (la noche que inicia hoy a las 22:00).
 * - Turno Noche (madrugada): 00:00 a 06:59 (< 420 min) -> Fecha = día anterior (la noche que arrancó ayer a las 22:00 y continuó hasta las 07:00).
 */
function getTurnoYFechaOperativa(isoString: string | null): { turno: TurnoType; fechaOperativa: string } {
  const dt = getArgentinaDateTime(isoString);
  if (!dt) return { turno: 'MANANA', fechaOperativa: '' };

  const { totalMinutes, calendarDateStr, year, month, day } = dt;

  if (totalMinutes >= 420 && totalMinutes < 870) {
    // 07:00 a 14:29
    return { turno: 'MANANA', fechaOperativa: calendarDateStr };
  } else if (totalMinutes >= 870 && totalMinutes < 1320) {
    // 14:30 a 21:59
    return { turno: 'TARDE', fechaOperativa: calendarDateStr };
  } else if (totalMinutes >= 1320) {
    // 22:00 a 23:59
    return { turno: 'NOCHE', fechaOperativa: calendarDateStr };
  } else {
    // 00:00 a 06:59 (madrugada de la noche anterior)
    const prevDate = new Date(year, month - 1, day);
    prevDate.setDate(prevDate.getDate() - 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fechaAnterior = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}-${pad(prevDate.getDate())}`;
    return { turno: 'NOCHE', fechaOperativa: fechaAnterior };
  }
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
  // Persistir la preferencia de tamaño de letra de la señora en localStorage
  const [fontSize, setFontSize] = useState<'normal' | 'grande'>(() => {
    try {
      const saved = localStorage.getItem('chezz_planilla_font_size');
      if (saved === 'normal' || saved === 'grande') return saved;
    } catch {}
    return 'grande';
  });

  const handleSetFontSize = (val: 'normal' | 'grande') => {
    setFontSize(val);
    try {
      localStorage.setItem('chezz_planilla_font_size', val);
    } catch {}
  };

  const isToday = selectedDate === todayDate;
  const yesterdayDate = getYesterdayString(todayDate);
  const isYesterday = selectedDate === yesterdayDate;

  // Turno actual según la hora en vivo
  const currentTurnoKey = useMemo<TurnoType>(() => {
    return getTurnoYFechaOperativa(new Date().toISOString()).turno;
  }, []);

  // Construir las filas asegurando que correspondan estrictamente a la fecha operativa seleccionada
  const rows = useMemo<PlanillaRowData[]>(() => {
    const list: PlanillaRowData[] = [];

    // 1. Turnos cerrados de la base de datos
    const validShifts = shifts.filter((s) => s.tipo === 'TURNO');
    for (const s of validShifts) {
      const { turno, fechaOperativa } = getTurnoYFechaOperativa(s.horaInicio);

      // FILTRO EXACTO: Solo incluir el turno si su fecha operativa coincide con la fecha seleccionada
      if (fechaOperativa !== selectedDate) {
        continue;
      }

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
        turnoKey: turno,
        rawTimeForSort: new Date(s.horaInicio).getTime(),
      });
    }

    // 2. Si estamos viendo el día de hoy, agregar habitaciones actualmente OCUPADAS
    if (isToday) {
      const occupiedRooms = rooms.filter((r) => r.estadoActual === 'OCUPADA' && r.turnoActualInicio);
      for (const r of occupiedRooms) {
        const { turno, fechaOperativa } = getTurnoYFechaOperativa(r.turnoActualInicio);
        if (fechaOperativa !== selectedDate) {
          continue;
        }

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
          turnoKey: turno,
          rawTimeForSort: startMs,
        });
      }
    }

    // Ordenar cronológicamente por hora de entrada
    return list.sort((a, b) => a.rawTimeForSort - b.rawTimeForSort);
  }, [shifts, rooms, consumptions, selectedDate, isToday]);

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

  const isGrande = fontSize === 'grande';

  return (
    <div className={`planilla-wrapper min-h-screen bg-[#FBF9F2] text-[#22201A] pb-12 ${isGrande ? 'text-xl' : 'text-base'}`}>
      
      {/* Barra superior con controles y botón volver */}
      <header className="sticky top-0 z-30 bg-[#2B2822] text-[#F1ECE0] border-b-4 border-[#C9A227] px-4 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSwitchToMainView}
              className="px-4 py-2.5 bg-[#C9A227] hover:bg-[#d8af2c] active:bg-[#b58f1f] text-[#221E10] font-black rounded-xl flex items-center gap-2 shadow active:scale-95 transition-all text-base md:text-xl border-2 border-[#221E10]/20"
              title="Volver a la vista de cuadrícula de habitaciones"
            >
              ⬅️ Volver a Habitaciones
            </button>
            <div>
              <h1 className="font-black text-xl md:text-3xl text-white tracking-wide">
                Planilla en Papel por Turnos
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Control de tamaño de letra agrandado */}
            <div className="bg-[#211F1A] border-2 border-[#4A4638] rounded-xl p-1.5 flex items-center gap-1.5">
              <span className="text-xs md:text-sm text-[#B8B2A0] px-2 font-bold">Letra:</span>
              <button
                type="button"
                onClick={() => handleSetFontSize('normal')}
                className={`px-3 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors ${
                  fontSize === 'normal'
                    ? 'bg-[#C9A227] text-[#221E10] font-black shadow'
                    : 'text-stone-300 hover:bg-[#33302A]'
                }`}
              >
                A Normal
              </button>
              <button
                type="button"
                onClick={() => handleSetFontSize('grande')}
                className={`px-3.5 py-1.5 text-sm md:text-base font-black rounded-lg transition-colors ${
                  fontSize === 'grande'
                    ? 'bg-[#C9A227] text-[#221E10] shadow'
                    : 'text-stone-300 hover:bg-[#33302A]'
                }`}
              >
                A+ Muy Grande
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Selector de fecha y Tarjeta de Gran Total */}
      <div className="max-w-7xl mx-auto px-3 md:px-6 pt-5">
        <div className="bg-white border-2 border-[#DDD5BE] rounded-xl p-4 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          
          {/* Selector de fechas rápido (sin emojis) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-stone-700 mr-1 ${isGrande ? 'text-lg md:text-xl' : 'text-sm md:text-base'}`}>
              Fecha de la planilla:
            </span>
            <button
              type="button"
              onClick={() => onSelectDate(todayDate)}
              className={`px-4 py-2 font-black rounded-lg border transition-all ${
                isGrande ? 'text-base md:text-lg' : 'text-sm md:text-base'
              } ${
                isToday
                  ? 'bg-[#2E7D32] text-white border-[#2E7D32] shadow'
                  : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => onSelectDate(yesterdayDate)}
              className={`px-4 py-2 font-black rounded-lg border transition-all ${
                isGrande ? 'text-base md:text-lg' : 'text-sm md:text-base'
              } ${
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
              className={`px-3 py-2 border-2 border-stone-300 rounded-lg font-bold text-stone-800 bg-white ${
                isGrande ? 'text-base md:text-lg' : 'text-sm md:text-base'
              }`}
            />
          </div>

          {/* Gran Total del Día */}
          <div className="bg-[#FAF6EC] border-2 border-[#C9A227] rounded-xl px-5 py-3 flex items-center gap-5 shadow-sm">
            <div>
              <span className={`block uppercase tracking-wider font-extrabold text-[#6B6552] ${isGrande ? 'text-xs md:text-sm' : 'text-xs'}`}>
                Total General Facturado
              </span>
              <span className={`font-black text-[#1E3A22] ${isGrande ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}>
                {formatPrice(totalGeneralDia)}
              </span>
            </div>
            <div className="border-l-2 border-[#DDD5BE] pl-5">
              <span className={`block uppercase tracking-wider font-extrabold text-[#6B6552] ${isGrande ? 'text-xs md:text-sm' : 'text-xs'}`}>
                Movimientos
              </span>
              <span className={`font-black text-[#26241C] ${isGrande ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}>
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
              {/* Encabezado del Turno (Sin emojis, subtotales en AZUL) */}
              <div
                className={`px-5 py-4 border-b-2 flex flex-wrap items-center justify-between gap-3 ${
                  turno.esTurnoActual
                    ? 'bg-[#2B2822] text-[#F1ECE0] border-[#C9A227]'
                    : 'bg-[#F3EEDF] text-[#22201A] border-[#DDD5BE]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className={`font-black tracking-tight ${isGrande ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}>
                      {turno.nombre}
                    </h2>
                    <span className={`font-bold opacity-80 ${isGrande ? 'text-base md:text-lg' : 'text-sm'}`}>
                      ({turno.horario})
                    </span>
                    {turno.esTurnoActual && (
                      <span className="bg-[#2E7D32] text-white text-xs md:text-sm font-black px-3 py-1 rounded-full uppercase tracking-wider shadow">
                        Turno Actual (En vivo)
                      </span>
                    )}
                  </div>
                  <p className={`font-medium mt-0.5 ${isGrande ? 'text-sm md:text-base' : 'text-xs md:text-sm'} ${
                    turno.esTurnoActual ? 'text-stone-300' : 'text-stone-600'
                  }`}>
                    {turno.descripcion}
                  </p>
                </div>

                {/* Subtotal del Turno en AZUL */}
                <div className="flex items-center gap-5 text-right">
                  <div>
                    <span className={`block uppercase tracking-wider font-extrabold opacity-75 ${isGrande ? 'text-xs md:text-sm' : 'text-xs'}`}>
                      Turnos registrados
                    </span>
                    <span className={`font-black ${isGrande ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'}`}>
                      {turno.countTurnos} {turno.countTurnos === 1 ? 'habitación' : 'habitaciones'}
                    </span>
                  </div>
                  <div className="border-l-2 border-current/20 pl-5">
                    <span className={`block uppercase tracking-wider font-extrabold opacity-75 ${isGrande ? 'text-xs md:text-sm' : 'text-xs'}`}>
                      Subtotal Turno
                    </span>
                    {/* SUBTOTOTAL EN AZUL CLARO EN FONDO OSCURO, AZUL PROFUNDO EN FONDO CLARO */}
                    <span className={`font-black drop-shadow-sm ${isGrande ? 'text-2xl md:text-4xl' : 'text-xl md:text-2xl'} ${
                      turno.esTurnoActual ? 'text-[#60A5FA]' : 'text-[#1D4ED8]'
                    }`}>
                      {formatPrice(turno.totalTurno)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contenido / Tabla tipo planilla en papel */}
              {turno.filas.length === 0 ? (
                <div className={`p-8 text-center bg-[#FAF9F5] text-stone-500 font-medium ${isGrande ? 'text-xl' : 'text-base'}`}>
                  <p className="font-bold text-stone-600">No hay habitaciones registradas en este turno aún.</p>
                  <p className={`text-stone-400 mt-1 ${isGrande ? 'text-base' : 'text-xs md:text-sm'}`}>
                    Cuando una habitación sea ocupada o complete su turno entre las {turno.horario}, aparecerá aquí automáticamente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className={`bg-[#ECE6D5] text-[#26241C] border-b-2 border-[#CFC7AD] font-black uppercase tracking-wider ${
                        isGrande ? 'text-sm md:text-base py-4' : 'text-xs md:text-sm py-3'
                      }`}>
                        <th className="py-3.5 px-4 border-r border-[#DDD5BE]">1. Habitación</th>
                        <th className="py-3.5 px-4 border-r border-[#DDD5BE]">2. Hora Entrada</th>
                        <th className="py-3.5 px-4 border-r border-[#DDD5BE]">3. Hora Salida</th>
                        <th className="py-3.5 px-4 border-r border-[#DDD5BE]">4. Consumiciones</th>
                        <th className="py-3.5 px-4 border-r border-[#DDD5BE]">5. Vehículo</th>
                        <th className="py-3.5 px-4 text-right">6. Total a Cobrar</th>
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
                            <td className={`${isGrande ? 'py-5 px-5' : 'py-3.5 px-4'} border-r border-[#DDD5BE] align-middle`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-black text-[#22201A] ${isGrande ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'}`}>
                                  Hab. {pad2(row.habitacionId)}
                                </span>
                                <span className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-200 text-stone-700 ${
                                  isGrande ? 'text-sm' : 'text-xs'
                                }`}>
                                  {row.categoria}
                                </span>
                                {row.esActivo && (
                                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white animate-pulse">
                                    Adentro
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 2. Hora Entrada */}
                            <td className={`${isGrande ? 'py-5 px-5' : 'py-3.5 px-4'} border-r border-[#DDD5BE] align-middle whitespace-nowrap`}>
                              <span className={`font-black text-stone-900 ${isGrande ? 'text-xl md:text-2xl' : 'text-base md:text-lg'}`}>
                                {row.horaEntradaStr}
                              </span>
                            </td>

                            {/* 3. Hora Salida */}
                            <td className={`${isGrande ? 'py-5 px-5' : 'py-3.5 px-4'} border-r border-[#DDD5BE] align-middle whitespace-nowrap`}>
                              {row.esActivo ? (
                                <div>
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-black bg-emerald-100 text-emerald-800 border border-emerald-300 ${
                                    isGrande ? 'text-base md:text-lg' : 'text-xs md:text-sm'
                                  }`}>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                                    En curso
                                  </span>
                                  <span className={`block text-stone-500 font-normal mt-0.5 ${isGrande ? 'text-sm' : 'text-xs'}`}>
                                    {row.duracionStr}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className={`font-black text-stone-900 ${isGrande ? 'text-xl md:text-2xl' : 'text-base md:text-lg'}`}>
                                    {row.horaSalidaStr}
                                  </span>
                                  <span className={`block text-stone-500 font-normal mt-0.5 ${isGrande ? 'text-sm' : 'text-xs'}`}>
                                    Duró {row.duracionStr} ({row.turnosCount} {row.turnosCount === 1 ? 'turno' : 'turnos'})
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* 4. Consumiciones */}
                            <td className={`${isGrande ? 'py-5 px-5' : 'py-3.5 px-4'} border-r border-[#DDD5BE] align-middle max-w-sm`}>
                              {row.consumicionesTexto === 'Sin consumos' ? (
                                <span className={`text-stone-400 italic ${isGrande ? 'text-base' : 'text-sm'}`}>-</span>
                              ) : (
                                <div>
                                  <span className={`text-stone-800 font-bold block leading-snug ${isGrande ? 'text-lg md:text-xl' : 'text-sm md:text-base'}`}>
                                    {row.consumicionesTexto}
                                  </span>
                                  <span className={`font-semibold text-stone-500 block mt-0.5 ${isGrande ? 'text-sm' : 'text-xs'}`}>
                                    Subtotal consumos: {formatPrice(row.consumicionesTotal)}
                                  </span>
                                </div>
                              )}
                              {row.esActivo && onOpenConsumption && (
                                <button
                                  type="button"
                                  onClick={() => onOpenConsumption(row.habitacionId)}
                                  className={`mt-1 font-bold text-[#C9A227] hover:text-[#a07f18] underline block ${isGrande ? 'text-sm' : 'text-xs'}`}
                                >
                                  + Cargar más productos
                                </button>
                              )}
                            </td>

                            {/* 5. Vehículo (Resalta claramente si fue cambiado) */}
                            <td className={`${isGrande ? 'py-5 px-5' : 'py-3.5 px-4'} border-r border-[#DDD5BE] align-middle whitespace-nowrap`}>
                              {row.vehiculo === 'MOTO' ? (
                                <div className="inline-flex flex-col">
                                  <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black bg-amber-100 text-amber-900 border-2 border-amber-500 shadow-sm ${
                                    isGrande ? 'text-base md:text-lg' : 'text-sm'
                                  }`}>
                                    <VehicleIcon type="MOTO" size={isGrande ? 22 : 17} />
                                    <span>MOTO</span>
                                  </span>
                                  <span className={`font-black text-amber-700 tracking-wider uppercase mt-1 ${isGrande ? 'text-xs md:text-sm' : 'text-[11px]'}`}>
                                    Aviso: Cambiado a Moto
                                  </span>
                                </div>
                              ) : row.vehiculo === 'DIDI' ? (
                                <div className="inline-flex flex-col">
                                  <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-black bg-sky-100 text-sky-900 border-2 border-sky-500 shadow-sm ${
                                    isGrande ? 'text-base md:text-lg' : 'text-sm'
                                  }`}>
                                    <VehicleIcon type="DIDI" size={isGrande ? 22 : 17} />
                                    <span>DIDI</span>
                                  </span>
                                  <span className={`font-black text-sky-700 tracking-wider uppercase mt-1 ${isGrande ? 'text-xs md:text-sm' : 'text-[11px]'}`}>
                                    Aviso: Cambiado a DiDi
                                  </span>
                                </div>
                              ) : (
                                <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold bg-stone-100 text-stone-700 border border-stone-300 ${
                                  isGrande ? 'text-base md:text-lg' : 'text-sm'
                                }`}>
                                  <VehicleIcon type="AUTO" size={isGrande ? 22 : 17} />
                                  <span>Auto</span>
                                </span>
                              )}
                            </td>

                            {/* 6. Total a Cobrar */}
                            <td className={`${isGrande ? 'py-5 px-5' : 'py-3.5 px-4'} text-right align-middle whitespace-nowrap`}>
                              <span className={`font-black text-[#1E3A22] ${isGrande ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}>
                                {formatPrice(row.totalACobrar)}
                              </span>
                              <span className={`block text-stone-500 font-normal ${isGrande ? 'text-xs md:text-sm' : 'text-[11px]'}`}>
                                Base: {formatPrice(row.precioBase * row.turnosCount)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Pie de tabla con subtotal del turno en AZUL */}
                    <tfoot>
                      <tr className="bg-[#F3EEDF] border-t-2 border-[#DDD5BE] font-black">
                        <td colSpan={5} className={`py-3.5 px-4 text-right text-stone-700 uppercase tracking-wider ${
                          isGrande ? 'text-sm md:text-base' : 'text-xs md:text-sm'
                        }`}>
                          Subtotal {turno.nombre} ({turno.countTurnos} habitaciones):
                        </td>
                        <td className={`py-3.5 px-4 text-right font-black text-[#1D4ED8] ${
                          isGrande ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
                        }`}>
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
