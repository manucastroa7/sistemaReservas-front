import React, { useState, useEffect } from 'react';
import { api } from '../api';
import EmployeeModal from './EmployeeModal';
import RoleModal from './RoleModal';

interface RoleManagementProps {
    onClose: () => void;
}

const RoleManagement: React.FC<RoleManagementProps & { user: any }> = ({ onClose, user }) => {

    // Roles state
    const [roles, setRoles] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [showRoleModal, setShowRoleModal] = useState(false);

    // Employees state
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);

    // Hotel State
    const [hotelData, setHotelData] = useState<any>(null);

    // UI state
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'employees' | 'roles' | 'hotel'>('employees');

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'roles') {
                const fetchedRoles = await api.getRoles();
                setRoles(fetchedRoles);
            } else if (activeTab === 'employees') {
                const users = await api.getUsers();
                setEmployees(users.filter((u: any) => u.role !== 'superadmin'));
                // Also fetch roles to map IDs to Names if needed for employee list
                const fetchedRoles = await api.getRoles();
                setRoles(fetchedRoles);
            } else if (activeTab === 'hotel') {
                // Fetch Hotel Details
                // Assuming we can get specific hotel by ID or just filtered from list
                const hotels = await api.getHotels();
                // Filter by user's hotelId
                const myHotel = hotels.find((h: any) => h.id === user?.hotelId);
                setHotelData(myHotel || null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditRole = (role: any) => {
        setSelectedRole(role);
        setShowRoleModal(true);
    };

    const handleDeleteRole = async (id: string) => {
        if (window.confirm('¿Eliminar este rol? Los empleados asignados podrían perder acceso.')) {
            await api.deleteRole(id);
            loadData();
        }
    };

    const getRoleLabel = (emp: any) => {
        if (emp.role === 'superadmin') return 'Super Admin';
        if (emp.role === 'admin') return 'Administrador';

        // Check custom role
        if (emp.roleId || emp.customRole) {
            const r = roles.find(r => r.id === emp.roleId || r.id === emp.customRole?.id);
            return r ? r.name : 'Rol Eliminado';
        }

        return 'Sin Rol';
    };

    const handleEditEmployee = (emp: any) => {
        setSelectedEmployee(emp);
        setShowEmployeeModal(true);
    };

    const handleNewEmployee = () => {
        setSelectedEmployee(null);
        setShowEmployeeModal(true);
    };

    const handleUpdateHotel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (hotelData && hotelData.id) {
                await api.updateHotel(hotelData.id, hotelData);
                alert('Datos del hotel actualizados correctamente.');
            }
        } catch (error) {
            alert('Error al actualizar hotel.');
            console.error(error);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            {showEmployeeModal && (
                <EmployeeModal
                    onClose={() => setShowEmployeeModal(false)}
                    onSave={() => loadData()}
                    initialData={selectedEmployee}
                />
            )}

            {showRoleModal && (
                <RoleModal
                    onClose={() => setShowRoleModal(false)}
                    onSuccess={() => loadData()}
                    roleToEdit={selectedRole}
                />
            )}

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configuración del Sistema</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Administra tu equipo, roles y hotel</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                </div>

                <div className="flex bg-slate-100/50 p-1 mx-6 mt-6 rounded-xl self-start">
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'employees' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Empleados
                    </button>
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'roles' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Perfiles de Rol
                    </button>
                    <button
                        onClick={() => setActiveTab('hotel')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'hotel' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Detalles del Hotel
                    </button>
                </div>

                <div className="p-6 overflow-y-auto min-h-0 flex-1">
                    {activeTab === 'employees' && (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <button
                                    onClick={handleNewEmployee}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md shadow-emerald-200 transition-all uppercase tracking-wide flex items-center gap-2"
                                >
                                    <span>+</span> Nuevo Empleado
                                </button>
                            </div>

                            {loading ? (
                                <div className="text-center py-8 font-bold text-slate-400 animate-pulse">Cargando personal...</div>
                            ) : (
                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Nombre</th>
                                                <th className="px-4 py-3 text-left">Email</th>
                                                <th className="px-4 py-3 text-left">Rol / Perfil</th>
                                                <th className="px-4 py-3 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {employees.map(emp => (
                                                <tr key={emp.id} className="hover:bg-slate-50 text-slate-700 font-bold">
                                                    <td className="px-4 py-3">{emp.firstName} {emp.lastName}</td>
                                                    <td className="px-4 py-3 text-slate-500 font-medium">{emp.email}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] uppercase">
                                                            {getRoleLabel(emp)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {emp.role !== 'superadmin' && (
                                                            <button
                                                                onClick={() => handleEditEmployee(emp)}
                                                                className="text-blue-600 hover:text-blue-800 font-black text-xs uppercase"
                                                            >
                                                                Editar
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'roles' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="text-xs text-blue-800 font-medium">
                                    <span className="font-black">NOTA:</span> Crea perfiles personalizados (ej: Recepcionista, Limpieza) y asigna permisos específicos.
                                </p>
                                <button
                                    onClick={() => { setSelectedRole(null); setShowRoleModal(true); }}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition"
                                >
                                    + Crear Rol
                                </button>
                            </div>

                            {loading ? (
                                <div className="text-center py-8 font-bold text-slate-400">Cargando roles...</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {roles.map(role => (
                                        <div key={role.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-black text-slate-700 text-lg uppercase">{role.name}</h4>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditRole(role)} className="text-blue-600 text-xs font-bold uppercase hover:underline">Editar</button>
                                                    <button onClick={() => handleDeleteRole(role.id)} className="text-rose-600 text-xs font-bold uppercase hover:underline">Eliminar</button>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {role.permissions && role.permissions.map((p: string) => (
                                                    <span key={p} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                                                        {p === 'dashboard' ? '📊' :
                                                            p === 'calendar' ? '📅' :
                                                                p === 'guests' ? '👥' :
                                                                    p === 'rooms' ? '🛏️' :
                                                                        p === 'reservations' ? '📑' :
                                                                            p === 'treasury' ? '💰' :
                                                                                p === 'reports' ? '📈' : '🔹'} {p}
                                                    </span>
                                                ))}
                                                {(!role.permissions || role.permissions.length === 0) && <span className="text-slate-400 text-xs italic">Sin permisos asignados</span>}
                                            </div>
                                        </div>
                                    ))}
                                    {roles.length === 0 && (
                                        <div className="col-span-2 text-center py-10 text-slate-400 italic">No hay roles creados. Comenza creando uno nuevo.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'hotel' && hotelData && (
                        <div className="space-y-6">
                            <form onSubmit={handleUpdateHotel} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider border-b border-slate-200 pb-2">Información Principal</h4>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Nombre del Hotel</label>
                                            <input
                                                required
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={hotelData.name}
                                                onChange={e => setHotelData({ ...hotelData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">CUIT / ID Fiscal</label>
                                            <input
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={hotelData.cuit || ''}
                                                onChange={e => setHotelData({ ...hotelData, cuit: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Sitio Web</label>
                                            <input
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={hotelData.web || ''}
                                                onChange={e => setHotelData({ ...hotelData, web: e.target.value })}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>

                                    {/* Contact & Location */}
                                    <div className="space-y-4">
                                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider border-b border-slate-200 pb-2">Ubicación y Contacto</h4>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Dirección</label>
                                            <input
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={hotelData.address || ''}
                                                onChange={e => setHotelData({ ...hotelData, address: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Ciudad</label>
                                                <input
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={hotelData.city || ''}
                                                    onChange={e => setHotelData({ ...hotelData, city: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Provincia</label>
                                                <input
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={hotelData.province || ''}
                                                    onChange={e => setHotelData({ ...hotelData, province: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Teléfono</label>
                                            <input
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={hotelData.phone || ''}
                                                onChange={e => setHotelData({ ...hotelData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl uppercase text-xs tracking-widest shadow-lg">
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'hotel' && !hotelData && !loading && (
                        <div className="text-center py-12 text-slate-400 italic">No se pudo cargar la información del hotel.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoleManagement;



