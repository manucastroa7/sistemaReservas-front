
import React, { useState } from 'react';
import { Guest } from '../types';
import { differenceInDays, parseISO, format } from 'date-fns';
import { api } from '../api';

interface GuestListProps {
  guests: Guest[];
  onAddGuest: (g: Guest) => void;
  onEditRes: (id: string) => void;
}

const GuestList: React.FC<GuestListProps> = ({ guests, onAddGuest, onEditRes }) => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleExpand = (g: Guest) => {
    if (expandedId === g.id) {
      setExpandedId(null);
    } else {
      setExpandedId(g.id);
      setNotes(g.observations || '');
    }
  };

  const saveNotes = async (id: string) => {
    await api.updateGuest(id, { observations: notes });
    // Optimistic update or reload? Reload is better but requires prop callback.
    // For now, simple alert or silent success.
    // Ideally call onAddGuest to trigger refresh? No, onAddGuest calls fetch.
    // Let's assume parent refreshes or we force reload.
    window.location.reload(); // Quick dirty refresh to sync. Or better: provide onRefresh prop.
  };

  const getGuestStatus = (g: Guest) => {
    const totalDebt = (g.reservations || []).reduce((acc, r) => {
      if (r.status === 'cancelled') return acc;
      const nights = differenceInDays(parseISO(r.lastNight), parseISO(r.checkIn)) + 1;
      // Legacy support logic for totalStay
      // If 'pricePerNight' is for the room, multiply by nights.
      // If 'roomIds' (multi) -> usually logic is Price is Total.
      // Let's stick to standard logic:
      const n = nights > 0 ? nights : 0;
      const total = n * r.pricePerNight * (r.roomIds?.length || (r.roomId ? 1 : 1));
      const extras = (r.extras || []).reduce((s, e) => s + e.amount, 0);
      const paid = (r.payments || []).reduce((s, p) => s + p.amount, 0);
      return acc + ((total - (r.discount || 0) + extras) - paid);
    }, 0);

    return totalDebt > 0 ? { label: 'DEUDA', color: 'bg-rose-100 text-rose-600', amount: totalDebt } : { label: 'AL DÍA', color: 'bg-emerald-100 text-emerald-600', amount: 0 };
  };

  const getTotalInvoiced = (g: Guest) => {
    return (g.reservations || []).reduce((acc, r) => {
      if (r.status === 'cancelled') return acc;
      const nights = differenceInDays(parseISO(r.lastNight), parseISO(r.checkIn)) + 1;
      const n = nights > 0 ? nights : 0;
      const total = n * r.pricePerNight * (r.roomIds?.length || (r.roomId ? 1 : 1));
      const extras = (r.extras || []).reduce((s, e) => s + e.amount, 0);
      return acc + (total - (r.discount || 0) + extras);
    }, 0);
  };

  const getReservationStatus = (g: Guest) => {
    const activeReservations = (g.reservations || []).filter(r => r.status !== 'cancelled');
    if (activeReservations.length === 0) return { label: 'Sin Reservas', color: 'bg-slate-100 text-slate-600' };

    const hasCheckedIn = activeReservations.some(r => r.status === 'checked-in');
    const hasConfirmed = activeReservations.some(r => r.status === 'confirmed');
    const hasCheckedOut = activeReservations.every(r => r.status === 'checked-out');

    if (hasCheckedIn) return { label: 'En Estadía', color: 'bg-blue-100 text-blue-700' };
    if (hasConfirmed) return { label: 'Confirmado', color: 'bg-green-100 text-green-700' };
    if (hasCheckedOut) return { label: 'Finalizado', color: 'bg-slate-100 text-slate-600' };

    return { label: 'Activo', color: 'bg-purple-100 text-purple-700' };
  };

  const filtered = guests.filter(g =>
    `${g.name} ${g.lastName} ${g.dni}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-black overflow-hidden">
      <div className="p-6 border-b border-black flex justify-between items-center">
        <h3 className="font-black text-black">Base de Datos de Pasajeros</h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            className="pl-10 pr-4 py-2 border border-black rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-black"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-2.5 text-black">🔍</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-black text-xs uppercase font-black border-b border-black">
            <tr>
              <th className="px-6 py-4">Apellido y Nombre</th>
              <th className="px-6 py-4">DNI</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Teléfono</th>
              <th className="px-6 py-4">Estado Reserva</th>
              <th className="px-6 py-4">Total Facturado</th>
              <th className="px-6 py-4">Estado Pago</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(guest => (
              <React.Fragment key={guest.id}>
                <tr className="hover:bg-slate-50 transition-colors cursor-pointer border-b border-black first:border-t-0" onClick={() => handleExpand(guest)}>
                  <td className="px-6 py-4 font-black text-black">{guest.lastName}, {guest.name}</td>
                  <td className="px-6 py-4 text-black text-sm font-bold font-mono">{guest.dni}</td>
                  <td className="px-6 py-4 text-black text-sm font-bold">{guest.email || '-'}</td>
                  <td className="px-6 py-4 text-black text-sm font-bold">{guest.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${getReservationStatus(guest).color}`}>
                      {getReservationStatus(guest).label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-black">
                      ${getTotalInvoiced(guest).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${getGuestStatus(guest).color}`}>
                      {getGuestStatus(guest).label} {getGuestStatus(guest).amount > 0 && `$${getGuestStatus(guest).amount.toLocaleString()}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center flex justify-center gap-2">
                    <button className="py-1 px-3 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100 transition-colors" onClick={(e) => { e.stopPropagation(); handleExpand(guest); }}>
                      {expandedId === guest.id ? 'Cerrar' : 'Historial'}
                    </button>
                    <button
                      className="py-1 px-2 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Eliminar Pasajero"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm('ADVERTENCIA: ¿Está seguro de eliminar este pasajero? SE BORRARÁN TODAS SUS RESERVAS y el historial asociado de forma permanente.')) {
                          await api.deleteGuest(guest.id);
                          window.location.reload();
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
                {expandedId === guest.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={8} className="px-6 py-6 border-y border-slate-200 shadow-inner">
                      <div className="flex gap-8">
                        <div className="flex-1">
                          <h4 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-wider">Historial de Reservas</h4>
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-100 font-bold text-slate-500">
                                <tr>
                                  <th className="px-4 py-2 text-left">Fecha</th>
                                  <th className="px-4 py-2 text-left">Habitaciones</th>
                                  <th className="px-4 py-2 text-center">Estado</th>
                                  <th className="px-4 py-2 text-right">Total</th>
                                  <th className="px-4 py-2 text-center">Ver</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(guest.reservations || []).sort((a, b) => b.id.localeCompare(a.id)).map(r => (
                                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-600">
                                      {format(parseISO(r.checkIn), 'dd/MM/yy')} - {format(parseISO(r.lastNight), 'dd/MM/yy')}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-slate-700">
                                      {r.rooms && r.rooms.length > 0
                                        ? r.rooms.map(rm => rm.id).join(', ')
                                        : (r.roomIds ? r.roomIds.join(', ') : r.roomId)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${r.status === 'cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {r.status === 'confirmed' ? 'Confirmada' : r.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                                      ${(r.pricePerNight * (differenceInDays(parseISO(r.lastNight), parseISO(r.checkIn)) + 1)).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => onEditRes(r.id)}
                                        className="text-blue-600 hover:text-blue-800 font-bold"
                                        title="Ver Detalle"
                                      >
                                        👁️
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {(!guest.reservations || guest.reservations.length === 0) && (
                                  <tr><td colSpan={5} className="p-4 text-center italic text-slate-400">Sin historial</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="w-1/3">
                          <h4 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-wider">Observaciones</h4>
                          <textarea
                            className="w-full h-32 bg-white border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none resize-none"
                            placeholder="Escriba notas relevantes sobre el pasajero..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => saveNotes(guest.id)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors"
                            >
                              Guardar Notas
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                  No se encontraron pasajeros registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GuestList;
