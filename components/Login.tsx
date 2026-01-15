import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'; // URL de tu NestJS

const decodeJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return {};
    }
};

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
    };
};

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(err.message || 'Error en la petición');
    }
    return res.json();
};


const Login: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            login(data.access_token, data.user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">
                        Sistema de Reservas
                    </h1>
                    <p className="text-slate-500 font-medium">Acceso Usuarios</p>
                </div>

                {error && (
                    <div className="bg-rose-100 text-rose-600 p-3 rounded-xl mb-6 text-sm font-bold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none transition-colors"
                            placeholder="admin@hotel.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
