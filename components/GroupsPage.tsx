import React, { useState, useEffect, useMemo } from 'react';
import { Reservation, Guest, Room } from '../types';
import { api } from '../api';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface GroupsPageProps {
    reservations: Reservation[];
    guests: Guest[];
    rooms: Room[];
    onNewGroup: () => void;
    onReload?: () => Promise<void>;
    onAddToGroup?: (groupId: string) => void;
    onEditGroup: (reservationId: string) => void;
}

interface GroupSummary {
    groupId: string;
    groupName: string;
    contactGuestId: string;
    contactName: string;
    checkIn: string; // Earliest
    checkOut: string; // Latest
    totalRooms: number;
    totalPax: number;
    totalAmount: number;
    totalPaid: number;
    status: string; // 'confirmed', 'checked-in', etc. (mix?)
    reservations: Reservation[];
}

const GroupsPage: React.FC<GroupsPageProps> = ({ reservations, guests, rooms, onNewGroup, onReload, onAddToGroup, onEditGroup }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Helper to extract finance config from Guest observations
    const getGroupFinanceConfig = (group: GroupSummary) => {
        // Strategy: First check the identified contact, then check others in the group.
        // We want to find ANY existing config for this group.

        const contactGuest = guests.find(g => g.id === group.contactGuestId);

        // 1. Try Contact Guest
        if (contactGuest?.observations) {
            try {
                const obs = JSON.parse(contactGuest.observations);
                if (obs.financeConfig) return obs.financeConfig;
            } catch (e) { }
        }

        // 2. Try any other guest in the group
        // Get all unique guest IDs in this group
        const groupGuestIds = Array.from(new Set(group.reservations.map(r => r.guestId)));

        for (const gid of groupGuestIds) {
            if (gid === group.contactGuestId) continue; // Already checked
            const g = guests.find(gx => gx.id === gid);
            if (g?.observations) {
                try {
                    const obs = JSON.parse(g.observations);
                    if (obs.financeConfig) return obs.financeConfig;
                } catch (e) { }
            }
        }

        return { model: 'standard', value: 0 };
    };

    // Aggregate Groups
    const groups = useMemo(() => {
        const groupMap: Record<string, GroupSummary> = {};

        reservations.forEach(res => {
            // Must be a group reservation
            if (!res.isGroup || !res.groupId) return;
            // Skip cancelled? Or show them? Let's show active ones primarily. 
            // If all are cancelled, group is cancelled.

            if (!groupMap[res.groupId]) {
                const guest = guests.find(g => g.id === res.guestId);
                groupMap[res.groupId] = {
                    groupId: res.groupId,
                    groupName: res.groupName || 'Grupo Sin Nombre',
                    contactGuestId: res.guestId,
                    contactName: guest ? `${guest.lastName}, ${guest.name}` : 'Desconocido',
                    checkIn: res.checkIn,
                    checkOut: res.lastNight,
                    totalRooms: 0,
                    totalPax: 0,
                    totalAmount: 0,
                    totalPaid: 0,
                    status: res.status,
                    reservations: []
                };
            }

            const g = groupMap[res.groupId];
            g.reservations.push(res);
            g.totalRooms++;
            g.totalPax += (res.pax || 1);

            // Update Dates (Range)
            if (res.checkIn < g.checkIn) g.checkIn = res.checkIn;
            if (res.lastNight > g.checkOut) g.checkOut = res.lastNight;

            // Finances
            const days = differenceInDays(parseISO(res.lastNight), parseISO(res.checkIn)) + 1;
            const amount = (days * res.pricePerNight) - (res.discount || 0) + (res.extras || []).reduce((s, e) => s + e.amount, 0);
            const paid = (res.payments || []).reduce((s, p) => s + p.amount, 0);

            g.totalAmount += amount;
            g.totalPaid += paid;
        });

        return Object.values(groupMap).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    }, [reservations, guests]);

    const filteredGroups = groups.filter(g =>
        g.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.contactName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMassCheckIn = async (groupId: string) => {
        const group = groups.find(g => g.groupId === groupId);
        if (!group) return;

        if (window.confirm(`¿Confirmas realizar el Check-in masivo para ${group.totalRooms} habitaciones de ${group.groupName}?`)) {
            try {
                // Filter only confirmed reservations
                const toCheckIn = group.reservations.filter(r => r.status === 'confirmed');
                if (toCheckIn.length === 0) {
                    alert('No hay reservas confirmadas pendientes de check-in en este grupo.');
                    return;
                }

                await Promise.all(toCheckIn.map(res => api.updateReservation(res.id, { status: 'checked-in' })));
                alert('Check-in masivo realizado con éxito.');
                if (onReload) await onReload();
            } catch (e) {
                console.error(e);
                alert('Error al realizar check-in masivo');
            }
        }
    };

    const handlePrintRooming = (groupId: string) => {
        const group = groups.find(g => g.groupId === groupId);
        if (!group) return;

        // Simple print trick: Open new window with table
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
            <head>
                <title>Rooming List - ${group.groupName}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    h1 { margin-bottom: 5px; }
                    .header { margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f0f0f0; }
                    .print-btn { display: none; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${group.groupName}</h1>
                    <p><strong>Responsable:</strong> ${group.contactName}</p>
                    <p><strong>Fechas:</strong> ${format(parseISO(group.checkIn), 'dd/MM/yyyy')} - ${format(parseISO(group.checkOut), 'dd/MM/yyyy')}</p>
                    <p><strong>Total Pax:</strong> ${group.totalPax} | <strong>Habitaciones:</strong> ${group.totalRooms}</p>
                </div>
                
                <table>
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="width: 10%">Habitación</th>
                            <th style="width: 35%">Apellido y Nombre</th>
                            <th style="width: 15%">DNI / Pasaporte</th>
                            <th style="width: 10%">Pax</th>
                            <th style="width: 15%">Ingreso</th>
                            <th style="width: 15%">Egreso</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.reservations.sort((a, b) => (a.roomIds?.[0] || 0) - (b.roomIds?.[0] || 0)).flatMap(res => {
            const guest = guests.find(g => g.id === res.guestId);
            const guestName = guest ? `${guest.lastName}, ${guest.name}` : '(Sin asignar)';
            const guestDni = guest?.dni || '-';

            // Handle multi-room single reservation (legacy or bulk)
            const rooms = res.roomIds && res.roomIds.length > 0 ? res.roomIds : [res.roomId];

            return rooms.map(roomId => `
                                <tr>
                                    <td style="font-weight: bold; text-align: center;">${roomId}</td>
                                    <td>${guestName} ${rooms.length > 1 ? '<small style="color: grey">(Titular Global)</small>' : ''}</td>
                                    <td>${guestDni}</td>
                                    <td style="text-align: center;">${res.pax || 1}</td>
                                    <td>${format(parseISO(res.checkIn), 'dd/MM/yyyy')}</td>
                                    <td>${format(parseISO(res.lastNight), 'dd/MM/yyyy')}</td>
                                </tr>
                             `);
        }).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 30px; font-size: 12px; color: grey; text-align: center;">
                    Generado el ${new Date().toLocaleDateString()} - Sistema de Gestión Hotelera
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // --- Group Finance & Payment Logic ---
    const [financeModalOpen, setFinanceModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupSummary | null>(null);

    // Helper moved to top scope

    const handleSaveFinanceConfig = async (groupId: string, config: any) => {
        const group = groups.find(g => g.groupId === groupId);
        if (!group) return;

        // Find the best guest to save to:
        // 1. A guest who ALREADY has config (to update it)
        // 2. The contact guest (new config)

        let targetGuest: Guest | undefined;

        // Check for existing config owner
        const groupGuestIds = Array.from(new Set(group.reservations.map(r => r.guestId)));
        for (const gid of groupGuestIds) {
            const g = guests.find(gx => gx.id === gid);
            if (g?.observations) {
                try {
                    const obs = JSON.parse(g.observations);
                    if (obs.financeConfig) {
                        targetGuest = g;
                        break;
                    }
                } catch (e) { }
            }
        }

        // Default to contact guest if no existing config found
        if (!targetGuest) {
            targetGuest = guests.find(g => g.id === group.contactGuestId);
        }

        if (targetGuest) {
            let newObs: any = {};
            try {
                newObs = targetGuest.observations ? JSON.parse(targetGuest.observations) : {};
            } catch (e) { }

            newObs.financeConfig = config;

            try {
                await api.updateGuest(targetGuest.id, { ...targetGuest, observations: JSON.stringify(newObs) });
                alert('Configuración financiera guardada.');

                // Reload data without full page reload
                if (onReload) await onReload();
            } catch (error) {
                console.error('Error saving finance config:', error);
                alert('Hubo un error al guardar la configuración.');
            }
        } else {
            alert('Error: No se encontró un huésped titular asociado a este grupo para guardar la configuración.');
        }
    };

    // --- Modal Component (Inline for simplicity or extract) ---
    const GroupFinanceModal = ({ group, onClose }: { group: GroupSummary, onClose: () => void }) => {
        // ... hook calls must be consistent ...
        const [config, setConfig] = useState(getGroupFinanceConfig(group));
        const [showAddPayment, setShowAddPayment] = useState(false);

        // Flatten payments
        const allPayments = group.reservations.flatMap(r => r.payments || []);

        // Calculate Financials based on Config
        // Total Gross = group.totalAmount (sum of reservations)
        const grossTotal = group.totalAmount;
        let netToHotel = grossTotal;
        let commissionOrRetainer = 0;

        if (config.model === 'commission') {
            commissionOrRetainer = (grossTotal * config.value) / 100;
            netToHotel = grossTotal - commissionOrRetainer;
        } else if (config.model === 'fixed_retainer') {
            commissionOrRetainer = config.value; // The company keeps this amount
            netToHotel = grossTotal - commissionOrRetainer; // Hotel gets the rest? Or is it inverted?
            // "Sophia se queda con hasta 4 millones". 
            // Interpret: Company takes X, Hotel takes (Total - X). Correct.
        }

        // Logic updated to use Net to Hotel
        const balance = netToHotel - group.totalPaid;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200">
                    <div className="px-8 py-6 bg-purple-50 border-b border-purple-100 flex justify-between items-center sticky top-0 z-10">
                        <div>
                            <h2 className="text-2xl font-black text-purple-900 tracking-tight">FINANZAS: {group.groupName}</h2>
                            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Gestión de Cobros y Comisiones</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-purple-100 flex items-center justify-center transition-colors text-purple-400 hover:text-purple-700">
                            <span className="text-2xl">×</span>
                        </button>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* 1. Configuration Section */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-black text-slate-700 uppercase text-sm mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">1</span>
                                Modelo de Negocio
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${config.model === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
                                    <input type="radio" name="model" className="sr-only" checked={config.model === 'standard'} onChange={() => setConfig({ ...config, model: 'standard', value: 0 })} />
                                    <span className="block font-bold text-slate-700 mb-1">Estandard</span>
                                    <span className="text-xs text-slate-500">Sin comisiones ni retenciones. El hotel cobra el total.</span>
                                </label>
                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${config.model === 'commission' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
                                    <input type="radio" name="model" className="sr-only" checked={config.model === 'commission'} onChange={() => setConfig({ ...config, model: 'commission', value: 10 })} />
                                    <span className="block font-bold text-slate-700 mb-1">Comisión (%)</span>
                                    <span className="text-xs text-slate-500">La empresa retiene un porcentaje del total.</span>
                                </label>
                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${config.model === 'fixed_retainer' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
                                    <input type="radio" name="model" className="sr-only" checked={config.model === 'fixed_retainer'} onChange={() => setConfig({ ...config, model: 'fixed_retainer', value: 0 })} />
                                    <span className="block font-bold text-slate-700 mb-1">Monto Fijo / Retención</span>
                                    <span className="text-xs text-slate-500">La empresa se queda con un monto fijo (hasta cubrirlo).</span>
                                </label>
                            </div>

                            {config.model !== 'standard' && (
                                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="max-w-xs">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                            {config.model === 'commission' ? 'Porcentaje Comisión (%)' : 'Monto a Retener ($)'}
                                        </label>
                                        <input
                                            type="number"
                                            value={config.value}
                                            onChange={(e) => setConfig({ ...config, value: Number(e.target.value) })}
                                            className="w-full text-lg font-black text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                                <button
                                    onClick={() => handleSaveFinanceConfig(group.groupId, config)}
                                    className="px-6 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
                                >
                                    <span>💾 Guardar Configuración</span>
                                </button>
                            </div>
                        </section>

                        {/* 2. Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Total Bruto (Reservas)</span>
                                <div className="text-2xl font-black text-slate-800">$ {grossTotal.toLocaleString()}</div>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                <span className="text-[10px] font-black text-emerald-600 uppercase block mb-1">Neto Hotel (Estimado)</span>
                                <div className="text-2xl font-black text-emerald-700">$ {Math.round(netToHotel).toLocaleString()}</div>
                                {config.model !== 'standard' && (
                                    <div className="text-xs font-bold text-emerald-500 mt-1">
                                        (- $ {Math.round(commissionOrRetainer).toLocaleString()} para Empresa)
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Pagado hasta ahora</span>
                                <div className="text-2xl font-black text-blue-600">$ {group.totalPaid.toLocaleString()}</div>
                                <div className={`text-xs font-bold mt-1 ${balance <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {balance > 0 ? `Resta: $ ${Math.round(balance).toLocaleString()}` : '¡Pagado Totalmente!'}
                                </div>
                            </div>
                        </div>

                        {/* 3. Payments Section */}
                        <section>
                            <div className="flex justify-between items-end mb-4">
                                <h3 className="font-black text-slate-700 uppercase text-sm flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">2</span>
                                    Pagos Registrados
                                </h3>
                                <button
                                    onClick={() => alert('Para agregar un pago, por favor hágalo desde el modal de reserva (Nueva Reserva) seleccionando la habitación correspondiente, o implementaremos pago masivo pronto.')}
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                >
                                    + Agregar Pago (Ir a Reservas)
                                </button>
                            </div>

                            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Fecha</th>
                                            <th className="px-4 py-3 text-left">Método</th>
                                            <th className="px-4 py-3 text-left">Referencia</th>
                                            <th className="px-4 py-3 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {allPayments.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No hay pagos registrados aún.</td>
                                            </tr>
                                        ) : (
                                            allPayments.map((p, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 font-bold text-slate-700">{p.date}</td>
                                                    <td className="px-4 py-3">{p.method}</td>
                                                    <td className="px-4 py-3 font-mono text-slate-500">{p.receipt}</td>
                                                    <td className="px-4 py-3 text-right font-black text-emerald-600">$ {p.amount.toLocaleString()}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 h-full bg-slate-50 overflow-y-auto">
            {financeModalOpen && selectedGroup && (
                <GroupFinanceModal group={selectedGroup} onClose={() => { setFinanceModalOpen(false); setSelectedGroup(null); }} />
            )}

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Grupos</h1>
                    <p className="text-slate-500 font-medium">Administración de contingentes y empresas</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={onNewGroup}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                    >
                        <span className="text-xl">+</span> Nueva Reserva
                    </button>
                    <div className="relative w-80">
                        <input
                            type="text"
                            placeholder="Buscar grupo..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-white shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-3 top-3.5 text-slate-400 text-lg">🔍</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredGroups.map(group => (
                    <div key={group.groupId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
                                        🏢
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">{group.groupName}</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resp: {group.contactName}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 mt-4">
                                    <div className="px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                                        <span className="text-[10px] font-black text-slate-400 uppercase block">Fecha Ingreso</span>
                                        <span className="font-bold text-slate-700">{format(parseISO(group.checkIn), 'dd MMM yyyy', { locale: es })}</span>
                                    </div>
                                    <div className="px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                                        <span className="text-[10px] font-black text-slate-400 uppercase block">Habitaciones</span>
                                        <span className="font-bold text-slate-700">{group.totalRooms} <span className="text-slate-400 text-xs">({group.totalPax} Pax)</span></span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-3">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Saldo Total</span>
                                    {(() => {
                                        const config = getGroupFinanceConfig(group);
                                        let retention = 0;
                                        if (config.model === 'commission') {
                                            retention = (group.totalAmount * config.value) / 100;
                                        } else if (config.model === 'fixed_retainer') {
                                            retention = config.value;
                                        }
                                        const netTotal = group.totalAmount - retention;
                                        const balance = netTotal - group.totalPaid;

                                        return (
                                            <div className="flex flex-col items-end">
                                                <div className={`text-2xl font-black ${group.totalPaid >= netTotal ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    $ {Math.round(balance).toLocaleString()}
                                                </div>
                                                {retention > 0 && (
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        (- $ {Math.round(retention).toLocaleString()} ret.)
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="flex gap-2 flex-wrap justify-end mt-2 md:mt-0">
                                <button
                                    onClick={() => onEditGroup(group.reservations[0].id)}
                                    className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest border border-amber-200 transition-all flex items-center gap-2"
                                    title="Editar todas las habitaciones del grupo"
                                >
                                    ✏️ Editar Grupo
                                </button>
                                <button
                                    onClick={() => { setSelectedGroup(group); setFinanceModalOpen(true); }}
                                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest border border-purple-200 transition-all flex items-center gap-2"
                                    title="Configurar y Pagar"
                                >
                                    💰 Finanzas
                                </button>
                                <button
                                    onClick={() => handlePrintRooming(group.groupId)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest border border-slate-200 transition-all flex items-center gap-2"
                                    title="Imprimir Nómina"
                                >
                                    🖨️ Nómina
                                </button>
                                <button
                                    onClick={() => handleMassCheckIn(group.groupId)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                                    title="Check-in de todas las habitaciones"
                                >
                                    🛎️ Check-in Masivo
                                </button>
                            </div>
                        </div>
                        {/* Expandable Details (Rooming List Preview) - Optional for now or simple list */}
                        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex gap-2 overflow-x-auto">
                            {group.reservations.map(res => (
                                <span key={res.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-slate-200 text-slate-600">
                                    Hab {res.roomIds?.join(', ') || res.roomId}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredGroups.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <div className="text-6xl mb-4">🏢</div>
                        <h3 className="text-xl font-bold text-slate-400">No se encontraron grupos activos</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupsPage;
