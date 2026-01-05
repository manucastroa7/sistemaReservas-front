import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

interface Hotel {
    id: string;
    name: string;
    address: string;
    location: string;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

const SuperAdminDashboard: React.FC = () => {
    const { user, logout, login } = useAuth();
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newHotelName, setNewHotelName] = useState('');
    const [newHotelAddress, setNewHotelAddress] = useState('');

    // Admin View State
    const [showAdminsModal, setShowAdminsModal] = useState(false);
    const [selectedHotelAdmins, setSelectedHotelAdmins] = useState<User[]>([]);
    const [selectedHotelName, setSelectedHotelName] = useState('');

    useEffect(() => {
        loadHotels();
    }, []);

    const loadHotels = async () => {
        try {
            const data = await api.getHotels();
            if (Array.isArray(data)) {
                setHotels(data);
            } else {
                console.error('API did not return an array', data);
                setHotels([]);
            }
        } catch (error) {
            console.error('Error loading hotels', error);
            setHotels([]);
        }
    };

    const handleCreateHotel = async (e: React.FormEvent) => {
        e.preventDefault();
        // Access form elements directly since we added un-controlled inputs
        const target = e.target as typeof e.target & {
            location: { value: string };
            email: { value: string };
            password: { value: string };
        };

        try {
            await api.createHotel({
                name: newHotelName,
                address: newHotelAddress,
                location: target.location.value,
                email: target.email.value,
                password: target.password.value
            });
            setShowCreateModal(false);
            setNewHotelName('');
            setNewHotelAddress('');
            loadHotels();
        } catch (error) {
            alert('Error creating hotel');
        }
    };

    const handleViewAdmins = async (hotel: Hotel) => {
        try {
            const users = await api.getUsers(hotel.id);
            // Filter only admins if needed, though mostly relevant users will be admins/staff
            setSelectedHotelAdmins(users);
            setSelectedHotelName(hotel.name);
            setShowAdminsModal(true);
        } catch (error) {
            console.error('Error fetching admins', error);
            alert('Error al obtener administradores');
        }
    };

    const handleImpersonate = async (hotelId: string) => {
        try {
            const response = await api.impersonate(hotelId);
            if (response.access_token) {
                login(response.access_token, response.user);
                // Force reload to reset all states/context
                window.location.href = '/';
            } else {
                alert('No se pudo acceder. Verifique que el hotel tenga un administrador.');
            }
        } catch (error) {
            console.error('Impersonation error', error);
            alert('Error al acceder al hotel');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Panel SuperAdmin</h1>
                        <p className="text-slate-500 font-medium">Gestión Centralizada</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-700">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs font-black text-blue-600 uppercase">SUPERADMIN</p>
                        </div>
                        <button
                            onClick={logout}
                            className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm shadow-sm border border-slate-200 transition-colors uppercase"
                        >
                            Salir
                        </button>
                    </div>
                </header>

                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xl font-black text-slate-700 uppercase">Hoteles Registrados</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                    >
                        <span className="text-xl leading-none">+</span> Nuevo Hotel
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hotels.map((hotel) => (
                        <div key={hotel.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                                    🏨
                                </div>
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                                    ID: {hotel.id.substring(0, 8)}...
                                </span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-1">{hotel.name}</h3>
                            <p className="text-sm font-bold text-slate-400 flex items-center gap-1 mb-6">
                                📍 {hotel.address || 'Sin dirección'}
                            </p>

                            <div className="flex gap-2 pt-4 border-t border-slate-50">
                                <button
                                    onClick={() => handleViewAdmins(hotel)}
                                    className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-black text-slate-600 uppercase transition-colors"
                                >
                                    Ver Admins
                                </button>
                                <button
                                    onClick={() => handleImpersonate(hotel.id)}
                                    className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-black text-blue-600 uppercase transition-colors"
                                >
                                    Acceder
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Hotel Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                        <h3 className="text-xl font-black text-slate-800 mb-6 uppercase">Registrar Nuevo Hotel</h3>
                        <form onSubmit={handleCreateHotel} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Hotel</label>
                                <input
                                    type="text"
                                    value={newHotelName}
                                    onChange={(e) => setNewHotelName(e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold focus:border-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Localidad</label>
                                <input
                                    type="text"
                                    name="location"
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold focus:border-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
                                <input
                                    type="text"
                                    value={newHotelAddress}
                                    onChange={(e) => setNewHotelAddress(e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="pt-2 border-t border-slate-100 mt-2">
                                <p className="text-xs font-black text-blue-600 mb-3 uppercase">Credenciales Administrador</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Admin</label>
                                        <input
                                            type="email"
                                            name="email"
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold focus:border-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña</label>
                                        <input
                                            type="text"
                                            name="password"
                                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 font-bold focus:border-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3 rounded-xl uppercase text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl uppercase text-xs shadow-lg shadow-blue-200"
                                >
                                    Crear Hotel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Admins Modal */}
            {showAdminsModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 uppercase">Administradores</h3>
                            <button onClick={() => setShowAdminsModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <p className="text-sm text-slate-500 font-bold mb-4 uppercase tracking-wide">Hotel: {selectedHotelName}</p>

                        <div className="space-y-3">
                            {selectedHotelAdmins.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No hay administradores registrados.</p>
                            ) : (
                                selectedHotelAdmins.map(admin => (
                                    <div key={admin.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-xs">
                                            {admin.firstName?.[0]}{admin.lastName?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{admin.firstName} {admin.lastName}</p>
                                            <p className="text-xs text-slate-500">{admin.email}</p>
                                        </div>
                                        <span className="ml-auto text-[10px] font-black uppercase bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                            {admin.role}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-6 mt-6 border-t border-slate-100">
                            <button
                                onClick={() => setShowAdminsModal(false)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3 rounded-xl uppercase text-xs"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
