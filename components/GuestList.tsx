
import React, { useState, useMemo } from 'react';
import { Guest } from '../types';
import { differenceInDays, parseISO, format } from 'date-fns';
import { api } from '../api';

interface GuestListProps {
  guests: Guest[];
  onAddGuest: (g: Guest) => void;
  onEditRes: (id: string) => void;
  onNewRes: () => void;
}

const GuestList: React.FC<GuestListProps> = ({ guests, onAddGuest, onEditRes, onNewRes }) => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Pagination & Sort State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'lastCheckIn', direction: 'desc' });

  // Add Guest Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGuestData, setNewGuestData] = useState({ name: '', lastName: '', dni: '', email: '', phone: '' });

  const handleExpand = (g: Guest) => {
    if (expandedId === g.id) {
      setExpandedId(null);
    } else {
      setExpandedId(g.id);
      setNotes(g.observations || '');
    }
  };

  const handleReactivateRes = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (window.confirm('¿Desea reactivar esta reserva? Se verificará la disponibilidad.')) {
        await api.updateReservation(id, { status: 'confirmed' });
        alert('Reserva reactivada con éxito.');
        window.location.reload();
      }
    } catch (e: any) {
      alert('Error al reactivar: ' + e.message);
    }
  };

  const saveNotes = async (id: string) => {
    await api.updateGuest(id, { observations: notes });
    window.location.reload();
  };

  const getGuestStatus = (g: Guest) => {
    const totalDebt = (g.reservations || []).reduce((acc, r) => {
      if (r.status === 'cancelled') return acc;
      const nights = differenceInDays(parseISO(r.lastNight), parseISO(r.checkIn)) + 1;
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

  // Helper to safely get date for sorting
  const getLastCheckInDate = (g: Guest) => {
    if (g.lastCheckIn) return g.lastCheckIn;
    // Fallback: Check reservations prop if not hydrated
    if (g.reservations && g.reservations.length > 0) {
      // Find max
      return g.reservations.reduce((max, r) => r.checkIn > max ? r.checkIn : max, '1900-01-01');
    }
    return ''; // Lower than any date
  };

  // Filter & Sort
  const processedOrgs = useMemo(() => {
    let data = guests.filter(g =>
      `${g.name} ${g.lastName} ${g.dni}`.toLowerCase().includes(search.toLowerCase())
    );

    if (sortConfig.key) {
      data.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortConfig.key === 'name') {
          valA = `${a.lastName} ${a.name}`.toLowerCase();
          valB = `${b.lastName} ${b.name}`.toLowerCase();
        } else if (sortConfig.key === 'lastCheckIn') {
          valA = getLastCheckInDate(a);
          valB = getLastCheckInDate(b);
        } else if (sortConfig.key === 'dni') {
          valA = a.dni;
          valB = b.dni;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [guests, search, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(processedOrgs.length / itemsPerPage);
  const currentData = processedOrgs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleCreateGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddGuest) {
      onAddGuest(newGuestData as any);
      setShowAddModal(false);
      setNewGuestData({ name: '', lastName: '', dni: '', email: '', phone: '' });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-black overflow-hidden relative">
      <div className="p-6 border-b border-black flex justify-between items-center bg-slate-50">
        <div>
          <h3 className="font-black text-black text-lg">Reserva de Pasajeros</h3>
          <span className="text-xs font-bold text-slate-500">{guests.length} Registros Totales</span>
        </div>

        <div className="flex items-center gap-4">

          <button
            onClick={onNewRes}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-2 px-4 rounded-lg shadow-md transition-all uppercase text-xs tracking-wider"
          >
            Nueva Reserva
          </button>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 shadow-sm"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            />
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left">
          <thead className="bg-white text-slate-500 text-[10px] uppercase font-black border-b border-slate-200 tracking-wider">
            <tr>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50" onClick={() => handleSort('name')}>
                Apellido y Nombre {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50" onClick={() => handleSort('dni')}>
                DNI {sortConfig.key === 'dni' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50" onClick={() => handleSort('lastCheckIn')}>
                Último Ingreso {sortConfig.key === 'lastCheckIn' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {currentData.map(guest => {
              const lastCheckIn = getLastCheckInDate(guest);
              return (
                <React.Fragment key={guest.id}>
                  <tr className="hover:bg-blue-50/50 transition-colors cursor-pointer group" onClick={() => handleExpand(guest)}>
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-700">{guest.lastName}, {guest.name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono font-bold">{guest.dni}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600">{guest.email || '-'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{guest.phone || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {lastCheckIn && lastCheckIn !== '1900-01-01' ? format(parseISO(lastCheckIn), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black w-fit ${getReservationStatus(guest).color}`}>
                          {getReservationStatus(guest).label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black w-fit ${getGuestStatus(guest).color}`}>
                          {getGuestStatus(guest).label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="py-1.5 px-3 bg-blue-100/50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors mr-2" onClick={(e) => { e.stopPropagation(); handleExpand(guest); }}>
                        {expandedId === guest.id ? 'Cerrar' : 'Ver Detalles'}
                      </button>
                      {/* Add delete button logic here if needed, keeping simple for pagination focus */}
                    </td>
                  </tr>
                  {expandedId === guest.id && (
                    <tr className="bg-slate-50/50 shadow-inner">
                      <td colSpan={6} className="px-6 py-6 border-y border-slate-200">
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
                                          className="text-blue-600 hover:text-blue-800 font-bold mr-2"
                                          title="Ver Detalle"
                                        >
                                          👁️
                                        </button>
                                        {r.status === 'cancelled' && (
                                          <button
                                            onClick={(e) => handleReactivateRes(r.id, e)}
                                            className="text-emerald-600 hover:text-emerald-800 font-bold text-[10px] uppercase border border-emerald-200 bg-emerald-50 px-2 py-1 rounded"
                                            title="Reactivar Reserva"
                                          >
                                            Reactivar
                                          </button>
                                        )}
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
              );
            })}
            {currentData.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No se encontraron resultados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          <p className="text-xs font-bold text-slate-500">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, processedOrgs.length)} de {processedOrgs.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-slate-100"
            >
              Anterior
            </button>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-black rounded-lg text-xs flex items-center">{currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-slate-100"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* NEW GUEST MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Nuevo Pasajero</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateGuest} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Nombre</label>
                  <input
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    value={newGuestData.name}
                    onChange={e => setNewGuestData({ ...newGuestData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Apellido</label>
                  <input
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    value={newGuestData.lastName}
                    onChange={e => setNewGuestData({ ...newGuestData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">DNI / Pasaporte</label>
                <input
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  value={newGuestData.dni}
                  onChange={e => setNewGuestData({ ...newGuestData, dni: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                <input
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  value={newGuestData.email}
                  onChange={e => setNewGuestData({ ...newGuestData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Teléfono</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  value={newGuestData.phone}
                  onChange={e => setNewGuestData({ ...newGuestData, phone: e.target.value })}
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg mt-2">
                Guardar Pasajero
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestList;
