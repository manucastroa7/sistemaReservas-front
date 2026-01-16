import React, { useState } from 'react';
import { Reservation, Room, Guest } from '../types';
import { format, isSameDay, parseISO, differenceInDays, addDays, startOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import Pagination from './Pagination';

interface DashboardProps {
  reservations: Reservation[];
  rooms: Room[];
  guests: Guest[];
  onEditRes: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

const Dashboard: React.FC<DashboardProps> = ({ reservations, rooms, guests, onEditRes }) => {
  const [occupiedPage, setOccupiedPage] = useState(1);
  const [arrivalsPage, setArrivalsPage] = useState(1);

  const today = startOfDay(new Date());

  // helper to get YYYY-MM-DD
  const formatDateStr = (d: Date) => format(d, 'yyyy-MM-dd');
  const todayStr = formatDateStr(today);

  // Filter Active Reservations (Occupied Today)
  const activeReservations = reservations.filter(r => {
    const isActiveStatus = r.status === 'confirmed' || r.status === 'checked-in';
    // Occupied if CheckIn <= Today < CheckOut
    const isOccupiedDate = r.checkIn <= todayStr && r.checkOut > todayStr;
    return isActiveStatus && isOccupiedDate;
  }).sort((a, b) => a.checkOut.localeCompare(b.checkOut));

  // Helper stats
  const stats = {
    todayOccupiedRooms: activeReservations.reduce((acc, r) => acc + (r.roomIds?.length || (r.roomId ? 1 : 0)), 0),
    todayPassengers: activeReservations.reduce((acc, r) => acc + (r.pax || 1), 0),
    arrivals: reservations.filter(r => isSameDay(parseISO(r.checkIn), today)).length,
    departures: reservations.filter(r => isSameDay(parseISO(r.checkOut), today)).length,
  };

  // Helper for Payment Status
  const getPaymentStatus = (res: Reservation) => {
    const nights = differenceInDays(parseISO(res.lastNight), parseISO(res.checkIn)) + 1;
    const totalStay = nights * res.pricePerNight;
    const discount = res.discount || 0;
    const totalExtras = (res.extras || []).reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = (res.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const balance = (totalStay - discount) + totalExtras - totalPaid;

    if (balance <= 0) return { label: 'SALDADO', color: 'bg-emerald-100 text-emerald-700' };
    if (totalPaid > 0) return { label: 'SEÑADO', color: 'bg-amber-100 text-amber-700' };
    return { label: 'ADEUDA TODO', color: 'bg-orange-100 text-orange-700' };
  };

  const limitArrivalsStr = formatDateStr(addDays(today, 5));
  const limitDeparturesStr = formatDateStr(addDays(today, 1)); // Today + Tomorrow

  // Filter Upcoming Arrivals (Today to 5 days later)
  const upcomingArrivals = reservations
    .filter(r => {
      // String comparison is safe for YYYY-MM-DD
      return (r.checkIn >= todayStr && r.checkIn <= limitArrivalsStr) && r.status !== 'cancelled';
    })
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  // Filter Upcoming Departures (Today and Tomorrow)
  const upcomingDepartures = reservations
    .filter(r => {
      return (r.checkOut >= todayStr && r.checkOut <= limitDeparturesStr) && (r.status === 'checked-in' || r.status === 'confirmed');
    })
    .sort((a, b) => a.checkOut.localeCompare(b.checkOut));

  // Pagination Logic
  const totalOccupiedPages = Math.ceil(activeReservations.length / ITEMS_PER_PAGE);
  const paginatedOccupied = activeReservations.slice((occupiedPage - 1) * ITEMS_PER_PAGE, occupiedPage * ITEMS_PER_PAGE);

  const totalArrivalsPages = Math.ceil(upcomingArrivals.length / ITEMS_PER_PAGE);
  const paginatedArrivals = upcomingArrivals.slice((arrivalsPage - 1) * ITEMS_PER_PAGE, arrivalsPage * ITEMS_PER_PAGE);

  const getGuest = (id: string) => guests.find(g => g.id === id);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Habitaciones Alojadas" value={stats.todayOccupiedRooms} color="bg-blue-500" icon="hb" />
        <StatCard title="Pasajeros Hoy" value={stats.todayPassengers} color="bg-indigo-500" icon="pj" />
        <StatCard title="Entradas Hoy" value={stats.arrivals} color="bg-emerald-500" icon="in" />
        <StatCard title="Salidas Hoy" value={stats.departures} color="bg-rose-500" icon="out" />
      </div>



      {/* Active Occupancy Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50/50">
          <h3 className="font-black text-slate-800 uppercase text-sm tracking-wide">🏨 Habitaciones Ocupadas Hoy</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Habitación/es</th>
                <th className="px-6 py-3">Pasajero Principal</th>
                <th className="px-6 py-3">Cant. Pasajeros</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Pago</th>
                <th className="px-6 py-3">Salida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedOccupied.length > 0 ? paginatedOccupied.map(res => {
                const g = getGuest(res.guestId);
                const payStatus = getPaymentStatus(res);
                return (
                  <tr key={res.id} onClick={() => onEditRes(res.id)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-black text-slate-700 font-mono text-lg">
                      {res.roomIds && res.roomIds.length > 0 ? res.roomIds.join(', ') : `#${res.roomId}`}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {g?.lastName}, {g?.name}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <span className="text-lg">👥</span>
                      <span className="font-bold">{res.pax || 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${res.status === 'checked-in' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                        {res.status === 'checked-in' ? 'Alojado' : 'Confirmado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${payStatus.color}`}>
                        {payStatus.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                      {res.checkOut}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No hay habitaciones ocupadas hoy</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={occupiedPage}
          totalPages={totalOccupiedPages}
          onPageChange={setOccupiedPage}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Arrivals Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-blue-50/50">
            <h3 className="font-black text-black uppercase text-sm tracking-wide">📅 Próximos Ingresos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-black text-[10px] uppercase font-black tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Fecha In</th>
                  <th className="px-6 py-3">Pasajero</th>
                  <th className="px-6 py-3">Estado Pago</th>
                  <th className="px-6 py-3">Habitación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedArrivals.length > 0 ? paginatedArrivals.map(res => {
                  const g = getGuest(res.guestId);
                  const payStatus = getPaymentStatus(res);
                  return (
                    <tr key={res.id} onClick={() => onEditRes(res.id)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 font-bold text-slate-600">
                        {format(parseISO(res.checkIn), 'dd/MM', { locale: es })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{g?.lastName}, {g?.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black ${payStatus.color}`}>
                          {payStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-black text-slate-600 text-lg">
                            {res.roomIds && res.roomIds.length > 1
                              ? `${res.roomIds.length} Habs`
                              : `#${res.roomId}`}
                          </span>
                          {res.roomIds && res.roomIds.length > 1 && (
                            <span className="text-xs text-slate-500 font-bold">({res.roomIds.join(', ')})</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay ingresos próximos</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={arrivalsPage}
            totalPages={totalArrivalsPages}
            onPageChange={setArrivalsPage}
          />
        </div>

        {/* Departures Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-rose-50/50">
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-wide">👋 Próximas Salidas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3">Fecha Out</th>
                  <th className="px-6 py-3">Pasajero</th>
                  <th className="px-6 py-3">Estado Pago</th>
                  <th className="px-6 py-3">Habitación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {upcomingDepartures.length > 0 ? upcomingDepartures.map(res => {
                  const g = getGuest(res.guestId);
                  const payStatus = getPaymentStatus(res);
                  return (
                    <tr key={res.id} onClick={() => onEditRes(res.id)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 font-bold text-slate-600">
                        {format(parseISO(res.checkOut), 'dd/MM', { locale: es })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{g?.lastName}, {g?.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black ${payStatus.color}`}>
                          {payStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-black text-slate-600 text-lg">
                            {res.roomIds && res.roomIds.length > 1
                              ? `${res.roomIds.length} Habs`
                              : `#${res.roomId}`}
                          </span>
                          {res.roomIds && res.roomIds.length > 1 && (
                            <span className="text-xs text-slate-500 font-bold">({res.roomIds.join(', ')})</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay salidas próximas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>


    </div >
  );
};

const StatCard = ({ title, value, color, icon }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
    <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-2xl shadow-inner`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
    </div>
  </div>
);

export default Dashboard;
