
import React from 'react';
import { ViewType } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: ViewType;
  setView: (v: ViewType) => void;
  onNewRes: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onNewRes }) => {
  const { user, logout } = useAuth();

  const NavItem = ({ view, label, icon }: { view: ViewType; label: string; icon: string }) => (
    <button
      onClick={() => setView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === view
        ? 'bg-blue-600 text-white shadow-lg'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-bold text-xs uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-2xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl font-black text-white">{user?.firstName?.[0] || 'U'}</div>
          <div>
            <h2 className="font-black text-sm tracking-tighter leading-none uppercase truncate w-40">{user?.firstName} {user?.lastName}</h2>
            <p className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={onNewRes}
          className="w-full mb-8 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 uppercase text-xs tracking-widest"
        >
          RESERVAR
        </button>

        <nav className="space-y-2">
          <NavItem view="dashboard" label="Inicio" icon="📊" />
          <NavItem view="calendar" label="Calendario" icon="📅" />
          <NavItem view="guests" label="Pasajeros" icon="👥" />
          <NavItem view="rooms" label="Habitaciones" icon="🧹" />
          <NavItem view="commissions" label="Comisiones" icon="💰" />
          <NavItem view="statistics" label="Estadísticas" icon="📈" />
          <NavItem view="orders" label="Pedidos" icon="🥐" />
        </nav>
      </div>

      <div className="p-6 mt-auto">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-900/50 hover:text-rose-400 transition-colors"
        >
          <span className="text-xl">🚪</span>
          <span className="font-bold text-xs uppercase tracking-widest">Cerrar Sesión</span>
        </button>
      </div>
    </aside >
  );
};

export default Sidebar;
