import React, { useState } from 'react';
import { PaymentMethod, Payment } from '../types';

interface PaymentModalProps {
    onClose: () => void;
    onSave: (payment: Payment) => void;
    initialPayment?: Payment;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSave, initialPayment }) => {
    const [data, setData] = useState({
        amount: initialPayment?.amount.toString() || '',
        method: initialPayment?.method || 'Efectivo' as PaymentMethod,
        receipt: initialPayment?.receipt || '',
        date: initialPayment?.date || new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: initialPayment?.id || Math.random().toString(36).substr(2, 9),
            amount: Number(data.amount),
            method: data.method,
            date: data.date,
            receipt: data.receipt || 'S/N'
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm m-4 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-black text-slate-800 mb-4 uppercase">Nuevo Pago</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto ($)</label>
                        <input
                            type="number"
                            required
                            autoFocus
                            className="w-full border-2 border-slate-200 rounded-lg p-2 font-bold text-lg text-slate-700 outline-none focus:border-blue-500"
                            value={data.amount}
                            onChange={e => setData({ ...data, amount: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                        <input
                            type="date"
                            required
                            className="w-full border-2 border-slate-200 rounded-lg p-2 font-medium text-slate-700 outline-none focus:border-blue-500"
                            value={data.date}
                            onChange={e => setData({ ...data, date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Forma de Pago</label>
                        <select
                            className="w-full border-2 border-slate-200 rounded-lg p-2 font-medium text-slate-700 outline-none focus:border-blue-500"
                            value={data.method}
                            onChange={e => setData({ ...data, method: e.target.value as PaymentMethod })}
                        >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Tarjeta">Tarjeta</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nro. Comprobante / Ref.</label>
                        <input
                            type="text"
                            className="w-full border-2 border-slate-200 rounded-lg p-2 font-medium text-slate-700 outline-none focus:border-blue-500"
                            placeholder="Opcional..."
                            value={data.receipt}
                            onChange={e => setData({ ...data, receipt: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200">Guardar Pago</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentModal;
