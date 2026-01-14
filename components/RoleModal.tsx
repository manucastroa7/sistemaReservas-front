
import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface RoleModalProps {
    onClose: () => void;
    onSuccess: () => void;
    roleToEdit?: any;
}

const MODULES = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'calendar', label: '📅 Calendario' },
    { key: 'guests', label: '👥 Pasajeros' },
    { key: 'rooms', label: '🛏️ Habitaciones' },
    { key: 'reservations', label: '📑 Reservas' },
    { key: 'treasury', label: '💰 Caja / Tesorería' },
    { key: 'reports', label: '📈 Reportes' },
    { key: 'expenses', label: '💸 Gastos / Insumos' },
    { key: 'hr', label: '👥 Recursos Humanos' },
    { key: 'orders', label: '🍞 Pedidos Cocina' },
    { key: 'settings', label: '⚙️ Configuración' },
];

const RoleModal: React.FC<RoleModalProps> = ({ onClose, onSuccess, roleToEdit }) => {
    const [name, setName] = useState('');
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (roleToEdit) {
            setName(roleToEdit.name);
            setPermissions(roleToEdit.permissions || []);
        }
    }, [roleToEdit]);

    const togglePermission = (key: string) => {
        setPermissions(prev =>
            prev.includes(key)
                ? prev.filter(p => p !== key)
                : [...prev, key]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            if (roleToEdit) {
                await api.updateRole(roleToEdit.id, { name, permissions });
            } else {
                await api.createRole({ name, permissions });
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Error al guardar el rol');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 p-4 flex justify-between items-center">
                    <h2 className="text-white font-black text-lg">
                        {roleToEdit ? 'EDITAR ROL' : 'NUEVO ROL'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                            Nombre del Rol
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ej: Recepcionista Noche"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                            Permisos de Acceso
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto px-1">
                            {MODULES.map(module => (
                                <label key={module.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={permissions.includes(module.key)}
                                        onChange={() => togglePermission(module.key)}
                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-bold text-slate-700 text-sm">{module.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Guardando...' : 'Guardar Rol'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleModal;
