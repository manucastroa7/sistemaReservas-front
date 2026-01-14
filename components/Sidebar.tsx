
import React from 'react';
import { ViewType } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: ViewType;
  setView: (v: ViewType) => void;
  onNewRes: () => void;
  onConfigRoles: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onNewRes, onConfigRoles }) => {
  const { user, logout } = useAuth();

  const hasAccess = (module: string) => {
    if (!user?.permissions) return true; // Fallback
    if (user.permissions.includes('all')) return true;
    return user.permissions.includes(module);
  };

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
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-2xl overflow-hidden">
      {/* Header: User Info - Fixed */}
      <div className="p-6 shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl font-black text-white">{user?.firstName?.[0] || 'U'}</div>
          <div className="overflow-hidden">
            <h2 className="font-black text-sm tracking-tighter leading-none uppercase truncate">{user?.firstName} {user?.lastName}</h2>
            <p className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase truncate">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content: Reserve Btn + Nav */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <button
          onClick={onNewRes}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 uppercase text-xs tracking-widest shrink-0"
        >
          RESERVAR
        </button>

        <nav className="space-y-2">
          {hasAccess('dashboard') && <NavItem view="dashboard" label="Inicio" icon="📊" />}
          {hasAccess('calendar') && <NavItem view="calendar" label="Calendario" icon="📅" />}
          {hasAccess('guests') && <NavItem view="guests" label="Reservas" icon="👥" />}
          {hasAccess('guests') && <NavItem view="passenger-db" label="Base Datos" icon="🗃️" />}
          {hasAccess('rooms') && <NavItem view="rooms" label="Habitaciones" icon="🧹" />}
          {hasAccess('commissions') && <NavItem view="commissions" label="Comisiones" icon="💰" />}
          {hasAccess('statistics') && <NavItem view="statistics" label="Estadísticas" icon="📈" />}
          {hasAccess('orders') && <NavItem view="orders" label="Pedidos" icon="🥐" />}

          {(user?.role === 'admin' || user?.role === 'superadmin') && <NavItem view="hr" label="Recursos Humanos" icon="👔" />}
          {(user?.role === 'admin' || user?.role === 'superadmin') && <NavItem view="expenses" label="Gastos / Insumos" icon="💸" />}

          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <button
              onClick={onConfigRoles}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
            >
              <span className="text-xl">⚙️</span>
              <span className="font-bold text-xs uppercase tracking-widest">Configuración</span>
            </button>
          )}
        </nav>
      </div>

      {/* Footer: Logout - Fixed */}
      <div className="p-6 mt-auto shrink-0 border-t border-slate-800">
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
