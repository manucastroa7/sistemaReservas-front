
import React, { useState, useMemo } from 'react';
import { Guest } from '../types';
import { api } from '../api';
import { format, parseISO } from 'date-fns';

interface PassengerDatabaseProps {
    guests: Guest[];
    onAddGuest: (g: Guest) => void;
}

const PassengerDatabase: React.FC<PassengerDatabaseProps> = ({ guests, onAddGuest }) => {
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'lastName', direction: 'asc' });

    // Add Guest Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newGuestData, setNewGuestData] = useState<Partial<Guest>>({
        name: '', lastName: '', dni: '', email: '', phone: '',
        country: '', province: '', city: '', contactSource: ''
    });

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
                } else if (sortConfig.key === 'dni') {
                    valA = a.dni;
                    valB = b.dni;
                } else {
                    valA = (a as any)[sortConfig.key] || '';
                    valB = (b as any)[sortConfig.key] || '';
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [guests, search, sortConfig]);

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
            onAddGuest(newGuestData as Guest);
            setShowAddModal(false);
            setNewGuestData({ name: '', lastName: '', dni: '', email: '', phone: '', country: '', province: '', city: '', contactSource: '' });
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-black overflow-hidden relative">
            <div className="p-6 border-b border-black flex justify-between items-center bg-slate-50">
                <div>
                    <h3 className="font-black text-black text-lg">Base de Datos Pasajeros</h3>
                    <span className="text-xs font-bold text-slate-500">{guests.length} Registros Totales</span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={async () => {
                            if (confirm('¿Desea normalizar (Primera Mayúscula) todos los nombres y apellidos de los pasajeros existentes?')) {
                                try {
                                    const count = await api.normalizeGuests();
                                    alert(`Se normalizaron ${count} pasajeros.`);
                                    window.location.reload();
                                } catch (e) {
                                    alert('Error al normalizar');
                                }
                            }
                        }}
                        className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-black py-2 px-4 rounded-lg shadow-sm transition-all uppercase text-[10px] tracking-wider flex items-center gap-2"
                    >
                        <span>✨</span> Normalizar Nombres
                    </button>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-black py-2 px-4 rounded-lg shadow-md transition-all uppercase text-xs tracking-wider flex items-center gap-2"
                    >
                        <span>+</span> Nuevo Pasajero
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
                            <th className="px-6 py-4">Residencia</th>
                            <th className="px-6 py-4">Origen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {currentData.map(guest => (
                            <tr key={guest.id} className="hover:bg-blue-50/50 transition-colors group">
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
                                <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                    {guest.city || '-'}, {guest.province || '-'}, {guest.country || '-'}
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                    {guest.contactSource || '-'}
                                </td>
                            </tr>
                        ))}
                        {currentData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No se encontraron resultados</td>
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        pattern="[0-9]*"
                                        title="Solo números"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newGuestData.phone}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setNewGuestData({ ...newGuestData, phone: val });
                                        }}
                                        placeholder="Solo números"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                                <input
                                    type="email"
                                    pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
                                    title="Formato inválido: ejemplo@correo.com"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 invalid:border-red-500 invalid:text-red-600"
                                    value={newGuestData.email}
                                    onChange={e => setNewGuestData({ ...newGuestData, email: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">País</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newGuestData.country}
                                        onChange={e => setNewGuestData({ ...newGuestData, country: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Provincia</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newGuestData.province}
                                        onChange={e => setNewGuestData({ ...newGuestData, province: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Ciudad</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newGuestData.city}
                                        onChange={e => setNewGuestData({ ...newGuestData, city: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">¿Por dónde se contactó?</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newGuestData.contactSource}
                                    onChange={e => setNewGuestData({ ...newGuestData, contactSource: e.target.value })}
                                    placeholder="Ej: Booking, Instagram, Recomendación..."
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

export default PassengerDatabase;
