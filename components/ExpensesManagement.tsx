
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Expense } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

const ExpensesManagement: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

    // Form
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<Partial<Expense>>({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: 'Otros',
        description: '',
        amount: 0,
        supplier: ''
    });

    useEffect(() => {
        loadExpenses();
    }, [selectedMonth]); // Reload when month changes if we filter by month, currently strict API returns all, can filter in frontend for now

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const data = await api.getExpenses();
            setExpenses(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createExpense(formData);
            setShowForm(false);
            setFormData({
                date: format(new Date(), 'yyyy-MM-dd'),
                category: 'Otros',
                description: '',
                amount: 0,
                supplier: ''
            });
            loadExpenses();
        } catch (error) {
            alert('Error al guardar gasto');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este gasto?')) {
            try {
                await api.deleteExpense(id);
                loadExpenses();
            } catch (error) {
                alert('Error al eliminar');
            }
        }
    };

    // Derived Stats
    const filteredExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const byCategory = filteredExpenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight mb-2">Gastos e Insumos</h1>
                    <p className="text-slate-500 font-medium">Control de costos operativos y compras.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div>
                        <input
                            type="month"
                            className="bg-white border border-slate-300 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-200 transition-all flex items-center gap-2"
                    >
                        <span>+</span> Nuevo Gasto
                    </button>
                </div>
            </header>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between h-32 relative overflow-hidden col-span-1 md:col-span-2">
                    <div className="relative z-10">
                        <p className="text-xs font-black uppercase tracking-widest opacity-60">Total Gastos ({format(new Date(selectedMonth + '-01'), 'MMMM', { locale: es })})</p>
                        <h3 className="text-4xl font-black mt-2">$ {totalAmount.toLocaleString()}</h3>
                    </div>
                    <div className="absolute right-[-20px] top-[-20px] text-[120px] opacity-10 pointer-events-none">💸</div>
                </div>

                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                    {Object.entries(byCategory).map(([cat, amount]) => (
                        <div key={cat} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{cat}</span>
                            <span className="font-black text-slate-700">$ {amount.toLocaleString()}</span>
                        </div>
                    ))}
                    {Object.keys(byCategory).length === 0 && <p className="text-xs text-slate-400 italic col-span-2 text-center py-4">Sin gastos registrados este mes.</p>}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4 text-left">Fecha</th>
                            <th className="px-6 py-4 text-left">Categoría</th>
                            <th className="px-6 py-4 text-left">Descripción / Proveedor</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map(exp => (
                            <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-600 max-w-[120px]">
                                    {format(new Date(exp.date), 'dd/MM/yyyy')}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`font-black text-[10px] px-2 py-1 rounded-full uppercase tracking-wider 
                                        ${exp.category === 'Insumos' ? 'bg-cyan-100 text-cyan-700' :
                                            exp.category === 'Servicios' ? 'bg-purple-100 text-purple-700' :
                                                exp.category === 'Mantenimiento' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-slate-100 text-slate-600'}`}>
                                        {exp.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-800">{exp.description}</p>
                                    {exp.supplier && <p className="text-xs text-slate-400 font-medium bg-slate-50 inline-block px-1 rounded mt-1">Prov: {exp.supplier}</p>}
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                                    $ {Number(exp.amount).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right text-slate-400">
                                    <button onClick={() => handleDelete(exp.id)} className="hover:text-rose-600 transition-colors">🗑️</button>
                                </td>
                            </tr>
                        ))}
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                    No hay gastos para este mes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 uppercase tracking-tight">Registrar Nuevo Gasto</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Categoría</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                    >
                                        <option value="Otros">Otros</option>
                                        <option value="Insumos">Insumos (Limpieza/Cocina)</option>
                                        <option value="Servicios">Servicios (Luz/Gas/Internet)</option>
                                        <option value="Mantenimiento">Mantenimiento y Reparaciones</option>
                                        <option value="Proveedores">Proveedores Mercadería</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Descripción</label>
                                <input
                                    required
                                    placeholder="Ej: Compra Lavandina y Detergente"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Monto Total</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.amount || ''}
                                            onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Proveedor (Opcional)</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.supplier || ''}
                                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white font-black py-3 px-8 rounded-xl uppercase text-xs tracking-widest shadow-lg transition-all w-full md:w-auto">
                                    Guardar Gasto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpensesManagement;
