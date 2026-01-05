import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { format, addDays } from 'date-fns';

const OrdersDashboard: React.FC = () => {
    // Default to Tomorrow
    const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    const [occupancy, setOccupancy] = useState(0);
    const [adjustment, setAdjustment] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchOccupancy();
    }, [selectedDate]);

    const fetchOccupancy = async () => {
        setLoading(true);
        try {
            const count = await api.getOccupancy(selectedDate);
            setOccupancy(Number(count));
        } catch (error) {
            console.error('Error fetching occupancy', error);
            setOccupancy(0);
        } finally {
            setLoading(false);
        }
    };

    const multiplier = 2; // Rules: 2 medialunas per person
    const totalOrder = Math.max(0, (occupancy * multiplier) + adjustment);

    const handleSendWhatsapp = () => {
        const dateStr = format(new Date(selectedDate), 'dd/MM/yyyy');
        const message = `👋 Hola! Para mañana ${dateStr} necesito *${totalOrder} medialunas*. Gracias!`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
            <header className="mb-10">
                <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight mb-2">Pedidos Panadería</h1>
                <p className="text-slate-500 font-medium">Gestión de insumos diarios basada en ocupación.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Configuration Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 h-fit">
                    <div className="mb-8">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Fecha del Pedido (Consumo)</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-blue-500 transition-colors text-lg"
                        />
                        <p className="mt-2 text-xs text-slate-400 font-bold">⚠️ Generalmente se pide para el día siguiente.</p>
                    </div>

                    <div className="mb-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Huéspedes en Casa</p>
                            <p className="text-3xl font-black text-blue-900">{loading ? '...' : occupancy}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Regla</p>
                            <p className="text-xl font-bold text-blue-800">x {multiplier}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ajuste Manual (+/-)</label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAdjustment(prev => prev - 12)}
                                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 font-black text-lg transition-colors"
                            >
                                -12
                            </button>
                            <button
                                onClick={() => setAdjustment(prev => prev - 1)}
                                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 font-black text-lg transition-colors"
                            >
                                -1
                            </button>
                            <input
                                type="number"
                                value={adjustment}
                                onChange={(e) => setAdjustment(Number(e.target.value))}
                                className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 text-center outline-none focus:border-blue-500 transition-colors text-lg"
                                placeholder="0"
                            />
                            <button
                                onClick={() => setAdjustment(prev => prev + 1)}
                                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 font-black text-lg transition-colors"
                            >
                                +1
                            </button>
                            <button
                                onClick={() => setAdjustment(prev => prev + 12)}
                                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 font-black text-lg transition-colors"
                            >
                                +12
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-400 font-bold">Usar para sobras (restar) o extras (sumar).</p>
                    </div>
                </div>

                {/* Result Card */}
                <div className="bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/20 p-8 text-white flex flex-col justify-between h-fit min-h-[400px]">
                    <div>
                        <h2 className="text-xl font-black uppercase text-slate-400 mb-8 tracking-widest">Resumen del Pedido</h2>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center text-slate-400 text-sm font-bold">
                                <span>Base ({occupancy} pax x {multiplier})</span>
                                <span>{occupancy * multiplier}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 text-sm font-bold">
                                <span>Ajuste Manual</span>
                                <span className={adjustment > 0 ? 'text-emerald-400' : adjustment < 0 ? 'text-rose-400' : ''}>
                                    {adjustment > 0 ? '+' : ''}{adjustment}
                                </span>
                            </div>
                            <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
                                <span className="text-2xl font-black uppercase">Total Medialunas</span>
                                <span className="text-5xl font-black text-amber-400">{totalOrder}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSendWhatsapp}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <span className="text-2xl">📱</span> Pedir por WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrdersDashboard;
