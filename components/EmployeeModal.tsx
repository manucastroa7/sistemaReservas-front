import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface EmployeeModalProps {
    onClose: () => void;
    onSave: () => void;
    initialData?: any;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ onClose, onSave, initialData }) => {
    const [roles, setRoles] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        roleOrId: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadRoles();
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData({
                firstName: initialData.firstName || '',
                lastName: initialData.lastName || '',
                email: initialData.email || '',
                password: '', // Don't fill password
                roleOrId: initialData.roleId || initialData.role || 'admin'
            });
        }
    }, [initialData]);

    const loadRoles = async () => {
        try {
            const fetchedRoles = await api.getRoles();
            setRoles(fetchedRoles);
            // If no initial data and we have roles, default to first role or admin
            if (!initialData && !formData.roleOrId) {
                setFormData(prev => ({ ...prev, roleOrId: 'admin' }));
            }
        } catch (error) {
            console.error('Error fetching roles', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Determine if it is a standard role or a custom role ID
            const isStandardRole = ['admin', 'superadmin'].includes(formData.roleOrId);
            const payload: any = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            if (isStandardRole) {
                payload.role = formData.roleOrId;
                payload.roleId = null; // Clear roleId if switching to standard
            } else {
                payload.role = 'employee'; // Custom roles are technically employees
                payload.roleId = formData.roleOrId;
            }

            if (initialData) {
                // Update mode
                await api.updateUser(initialData.id, payload);
                alert('Empleado actualizado correctamente.');
            } else {
                // Create mode
                await api.createUser(payload);
                alert('Empleado creado correctamente.');
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert('Error: ' + (error.message || 'Intente nuevamente'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                            {initialData ? 'Editar Empleado' : 'Nuevo Empleado'}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {initialData ? 'Modificar datos de acceso' : 'Crear cuenta de acceso'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Nombre</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm font-bold"
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Apellido</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm font-bold"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Email (Usuario)</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm font-bold"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                            Contraseña {initialData && <span className="text-slate-400">(Dejar en blanco para mantener)</span>}
                        </label>
                        <input
                            type="password"
                            required={!initialData}
                            minLength={6}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm font-bold"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            placeholder={initialData ? "••••••" : ""}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Rol / Puesto</label>
                        <select
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm font-bold"
                            value={formData.roleOrId}
                            onChange={e => setFormData({ ...formData, roleOrId: e.target.value })}
                        >
                            <option value="admin">Administrador General</option>
                            <optgroup label="Roles Personalizados">
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 font-black rounded-xl uppercase text-xs hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-blue-600 text-white font-black rounded-xl uppercase text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Crear Empleado')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmployeeModal;


