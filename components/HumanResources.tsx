
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Employee, EmployeePayment, SalaryHistory } from '../types';
import { format } from 'date-fns';

const HumanResources: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [positions, setPositions] = useState<any[]>([]);
    const [isPositionsModalOpen, setIsPositionsModalOpen] = useState(false);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const [empData, posData] = await Promise.all([
                api.getEmployees(),
                api.getPositions()
            ]);
            setEmployees(empData);
            setPositions(posData);
        } catch (error) {
            console.error('Error loading data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (emp: Employee) => {
        setSelectedEmployee(emp);
        setIsEditModalOpen(true);
    };

    const handleNewEmployee = () => {
        setSelectedEmployee(null);
        setIsEditModalOpen(true);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight mb-2">Recursos Humanos</h1>
                    <p className="text-slate-500 font-medium">Gestión de empleados, pagos y documentación.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsPositionsModalOpen(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-sm transition-all"
                    >
                        Gestionar Puestos
                    </button>
                    <button
                        onClick={handleNewEmployee}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                    >
                        <span>+</span> Nuevo Empleado
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Cargando personal...</div>
            ) : (
                <div className="space-y-8">
                    {positions.map(pos => {
                        const empInPos = employees.filter(e => e.position === pos.name);
                        // if (empInPos.length === 0) return null; // Optional: Hide empty positions

                        return (
                            <div key={pos.id} className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">{pos.name}</h3>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-md tracking-wider">
                                            Base: ${Number(pos.baseSalary).toLocaleString()}
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{empInPos.length} Empleados</span>
                                </div>

                                <table className="w-full text-sm">
                                    <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Empleado</th>
                                            <th className="px-6 py-3 text-left">Condición</th>
                                            <th className="px-6 py-3 text-left">Salario Real</th>
                                            <th className="px-6 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {empInPos.map(emp => (
                                            <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs uppercase">
                                                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-700">{emp.firstName} {emp.lastName}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${emp.status === 'Activo' || !emp.status ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                                                        }`}>
                                                        {emp.status || 'Activo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-bold text-slate-600">
                                                    {emp.salary ? `$${Number(emp.salary).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase">Ver Ficha</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {empInPos.length === 0 && (
                                            <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic text-xs">No hay empleados en este puesto</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}

                    {/* Unassigned Employees */}
                    {employees.filter(e => !positions.find(p => p.name === e.position)).length > 0 && (
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                            <div className="px-6 py-4 bg-orange-50 border-b border-orange-100">
                                <h3 className="font-black text-orange-800 uppercase tracking-tight">Sin Puesto Asignado (o Puesto Eliminado)</h3>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Empleado</th>
                                        <th className="px-6 py-3 text-left">Puesto Actual</th>
                                        <th className="px-6 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {employees.filter(e => !positions.find(p => p.name === e.position)).map(emp => (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-700">{emp.firstName} {emp.lastName}</td>
                                            <td className="px-6 py-4 text-xs font-mono">{emp.position || '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase">Asignar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
            )}

            {isPositionsModalOpen && (
                <PositionsModal
                    onClose={() => setIsPositionsModalOpen(false)}
                    onUpdate={() => loadEmployees()}
                    positions={positions}
                />
            )}

            {isEditModalOpen && (
                <HREmployeeModal
                    employee={selectedEmployee}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={() => { setIsEditModalOpen(false); loadEmployees(); }}
                    positions={positions}
                />
            )}
        </div>
    );
};

interface HREmployeeModalProps {
    employee: Employee | null;
    onClose: () => void;
    onSave: () => void;
    positions: any[];
}

const PositionsModal = ({ onClose, onUpdate, positions }: any) => {
    const [newPos, setNewPos] = useState({ name: '', baseSalary: 0 });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createPosition(newPos);
            setNewPos({ name: '', baseSalary: 0 });
            onUpdate();
        } catch (error) {
            alert('Error al crear puesto');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este puesto?')) return;
        try {
            await api.deletePosition(id);
            onUpdate();
        } catch (error) {
            alert('Error al eliminar puesto');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Gestionar Puestos</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleCreate} className="flex gap-2 items-end mb-8">
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Nombre Puesto</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                            value={newPos.name} onChange={e => setNewPos({ ...newPos, name: e.target.value })} required />
                    </div>
                    <div className="w-32">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Salario Base</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                            value={newPos.baseSalary || ''} onChange={e => setNewPos({ ...newPos, baseSalary: parseFloat(e.target.value) })} required />
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-black text-xs uppercase self-end h-[38px]">+</button>
                </form>

                <div className="space-y-2">
                    {positions.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div>
                                <p className="font-black text-slate-700">{p.name}</p>
                                <p className="text-xs text-emerald-600 font-mono font-bold">${Number(p.baseSalary).toLocaleString()}</p>
                            </div>
                            <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs font-black uppercase">Eliminar</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const HREmployeeModal: React.FC<HREmployeeModalProps> = ({ employee, onClose, onSave, positions }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'payments' | 'salary'>('info');
    const [loading, setLoading] = useState(false);

    // Form Data
    const [formData, setFormData] = useState<Partial<Employee>>({
        firstName: '',
        lastName: '',
        dni: '',
        email: '',
        phone: '',
        position: '',
        salary: 0,
        paymentDay: '',
        isRegistered: false,
        hiringDate: '',
        status: 'Activo',
        observations: ''
    });

    // Payments Data
    const [payments, setPayments] = useState<EmployeePayment[]>([]);
    const [newPayment, setNewPayment] = useState({ amount: 0, date: format(new Date(), 'yyyy-MM-dd'), concept: '' });

    // Salary History Data
    const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);

    useEffect(() => {
        if (employee) {
            setFormData(employee);
            loadPayments();
            loadSalaryHistory();
        }
    }, [employee]);

    const loadPayments = async () => {
        if (!employee) return;
        try {
            const data = await api.getEmployeePayments(employee.id);
            setPayments(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadSalaryHistory = async () => {
        if (!employee) return;
        try {
            const data = await api.getSalaryHistory(employee.id);
            setSalaryHistory(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (employee) {
                await api.updateEmployee(employee.id, formData);
            } else {
                await api.createEmployee(formData);
            }
            onSave();
        } catch (error) {
            alert('Error al guardar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;
        if (newPayment.amount <= 0) return alert('El monto debe ser mayor a 0');

        try {
            await api.addEmployeePayment(employee.id, newPayment);
            alert('Pago registrado correctamente');
            setNewPayment({ amount: 0, date: format(new Date(), 'yyyy-MM-dd'), concept: '' });
            loadPayments();
        } catch (error) {
            alert('Error al registrar pago');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
                            {employee ? `${employee.firstName} ${employee.lastName}` : 'Nuevo Empleado'}
                        </h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ficha de Personal</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors pointer-events-auto">✕</button>
                </div>

                {employee && (
                    <div className="flex bg-slate-100/50 p-1 mx-6 mt-6 rounded-xl self-start shrink-0">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Información
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'payments' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Historial de Pagos
                        </button>
                        <button
                            onClick={() => setActiveTab('salary')}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'salary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Evolución Salarial
                        </button>
                    </div>
                )}

                <div className="p-6 overflow-y-auto flex-1">
                    {/* INFO TAB */}
                    {activeTab === 'info' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Nombre</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.firstName || ''}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Apellido</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.lastName || ''}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">DNI</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.dni || ''}
                                        onChange={e => setFormData({ ...formData, dni: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Teléfono</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-4">Datos de Contratación</h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Puesto</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.position || ''}
                                            onChange={e => {
                                                const p = positions.find((pos: any) => pos.name === e.target.value);
                                                setFormData({ ...formData, position: e.target.value, salary: p ? p.baseSalary : formData.salary });
                                            }}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {positions.map((p: any) => (
                                                <option key={p.id} value={p.name}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Fecha Contratación</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.hiringDate ? String(formData.hiringDate).split('T')[0] : ''}
                                            onChange={e => setFormData({ ...formData, hiringDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Salario Mensual</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={formData.salary || ''}
                                                onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Día de Pago</label>
                                        <input
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.paymentDay || ''}
                                            onChange={e => setFormData({ ...formData, paymentDay: e.target.value })}
                                            placeholder="Ej: 5 del mes"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Estado Actual</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.status || 'Activo'}
                                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        >
                                            <option value="Activo">Activo (Contratado)</option>
                                            <option value="Renuncio">Renunció</option>
                                            <option value="Despedido">Despedido</option>
                                        </select>
                                    </div>

                                    {(formData.status === 'Renuncio' || formData.status === 'Despedido') ? (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Fecha de Baja</label>
                                            <input
                                                type="date"
                                                className="w-full bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                                                value={formData.terminationDate ? String(formData.terminationDate).split('T')[0] : ''}
                                                onChange={e => setFormData({ ...formData, terminationDate: e.target.value })}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-end pb-2">
                                            <label className="flex items-center gap-3 cursor-pointer group w-full p-2 border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    checked={formData.isRegistered || false}
                                                    onChange={e => setFormData({ ...formData, isRegistered: e.target.checked })}
                                                />
                                                <div>
                                                    <span className="block text-sm font-black text-slate-700">En Blanco</span>
                                                </div>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* If status is Activo, we show "En Blanco" checkbox above. 
                                    If status is NOT Activo, we still might want to preserve the "En Blanco" state or show it differently.
                                    For simplicity, let's keep "En Blanco" visible always if we want, or just hide it when fired.
                                    The user request specifically asked for the date field to appear. 
                                    Let's render the En Blanco checkbox separately if status is inactive, just in case they need to edit it, 
                                    or maybe it doesn't matter for historical records. 
                                    Let's stick to the conditional replacement of the slot for now, 
                                    but to be safe, I'll move the "En Blanco" checkbox to its own row if it's displaced, 
                                    OR just make the grid 3 columns if needed.
                                    
                                    Better approach: Make the "En Blanco" checkbox always visible, and the Date field appear as an extra field.
                                */}

                                <div className="mt-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Observaciones / Motivo de Baja / Evaluación</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Ej: Empleado muy responsable. / Fue despedido por ausencias reiteradas..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        value={formData.observations || ''}
                                        onChange={e => setFormData({ ...formData, observations: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl uppercase text-xs tracking-widest shadow-lg transition-all w-full md:w-auto">
                                    {loading ? 'Guardando...' : 'Guardar Ficha'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* PAYMENTS TAB */}
                    {activeTab === 'payments' && (
                        <div className="space-y-8">
                            {/* New Payment Form */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-4">Registrar Nuevo Pago</h4>
                                <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newPayment.date}
                                            onChange={e => setNewPayment({ ...newPayment, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Concepto</label>
                                        <input
                                            required
                                            placeholder="Ej: Sueldo Mayo, Adelanto..."
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newPayment.concept}
                                            onChange={e => setNewPayment({ ...newPayment, concept: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Monto</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    required
                                                    className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={newPayment.amount || ''}
                                                    onChange={e => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-lg font-black text-xs uppercase shadow-md">
                                                Registrar
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* History Table */}
                            <div>
                                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-4">Historial de Pagos</h4>
                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Fecha</th>
                                                <th className="px-4 py-3 text-left">Concepto</th>
                                                <th className="px-4 py-3 text-right">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {payments.map(pay => (
                                                <tr key={pay.id} className="hover:bg-slate-50 text-slate-700 font-bold">
                                                    <td className="px-4 py-3 min-w-[100px]">{format(new Date(pay.date), 'dd/MM/yyyy')}</td>
                                                    <td className="px-4 py-3 w-full">{pay.concept}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-emerald-600">
                                                        $ {Number(pay.amount).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {payments.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic font-medium">
                                                        No se han registrado pagos para este empleado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {payments.length > 0 && (
                                            <tfoot className="bg-slate-50 font-black text-slate-800">
                                                <tr>
                                                    <td colSpan={2} className="px-4 py-3 text-right uppercase text-xs tracking-wider">Total Pagado</td>
                                                    <td className="px-4 py-3 text-right font-mono text-emerald-600">
                                                        $ {payments.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SALARY HISTORY TAB */}
                    {activeTab === 'salary' && (
                        <div>
                            <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-4">Evolución Salarial</h4>
                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Fecha de Cambio</th>
                                            <th className="px-4 py-3 text-right">Anterior</th>
                                            <th className="px-4 py-3 text-right">Nuevo</th>
                                            <th className="px-4 py-3 text-left">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {salaryHistory.map(hist => (
                                            <tr key={hist.id} className="hover:bg-slate-50 text-slate-700 font-bold">
                                                <td className="px-4 py-3">{format(new Date(hist.changeDate), 'dd/MM/yyyy HH:mm')}</td>
                                                <td className="px-4 py-3 text-right text-slate-400">$ {Number(hist.previousSalary).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right text-emerald-600">$ {Number(hist.newSalary).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-xs text-slate-500">{hist.reason || '-'}</td>
                                            </tr>
                                        ))}
                                        {salaryHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic font-medium">
                                                    No hay cambios de salario registrados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HumanResources;
