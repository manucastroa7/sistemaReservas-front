
import React from 'react';
import { Reservation, Guest } from '../types';

interface CommissionReportProps {
  reservations: Reservation[];
  guests: Guest[];
  onUpdateReservation: (res: Reservation) => void;
}

const CommissionReport: React.FC<CommissionReportProps> = ({ reservations, guests, onUpdateReservation }) => {
  const commReservations = reservations.filter(r => r.commissionAmount > 0);
  
  const totalPending = commReservations
    .filter(r => !r.commissionPaid)
    .reduce((sum, r) => sum + r.commissionAmount, 0);

  const totalPaid = commReservations
    .filter(r => r.commissionPaid)
    .reduce((sum, r) => sum + r.commissionAmount, 0);

  const getGuest = (id: string) => guests.find(g => g.id === id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comisiones Pendientes</p>
          <p className="text-3xl font-black text-amber-500">${totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidado este Mes</p>
          <p className="text-3xl font-black text-emerald-500">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Comisiones</p>
          <p className="text-3xl font-black text-slate-800">${(totalPending + totalPaid).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-800 uppercase tracking-tight">Liquidación de Referentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Agencia / Referente</th>
                <th className="px-6 py-4">Grupo / Pasajero</th>
                <th className="px-6 py-4">Check-In</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {commReservations.map(res => {
                const g = getGuest(res.guestId);
                return (
                  <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-blue-600">{res.commissionRecipient || 'Particular'}</td>
                    <td className="px-6 py-4">
                       <p className="font-bold">{res.groupName || 'Venta Individual'}</p>
                       <p className="text-xs text-slate-400">{g?.lastName}, {g?.name}</p>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">{res.checkIn}</td>
                    <td className="px-6 py-4 font-black text-slate-800">${res.commissionAmount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                         res.commissionPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                       }`}>
                         {res.commissionPaid ? 'Pagado' : 'Pendiente'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onUpdateReservation({ ...res, commissionPaid: !res.commissionPaid })}
                        className={`text-xs font-black uppercase tracking-tighter hover:underline ${res.commissionPaid ? 'text-rose-500' : 'text-emerald-600'}`}
                      >
                        {res.commissionPaid ? 'Marcar Pendiente' : 'Marcar Pagado'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {commReservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No hay registros de comisiones</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommissionReport;
