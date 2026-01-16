
import React from 'react';
import { ViewType } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: ViewType;
  setView: (v: ViewType) => void;
  onNewRes: () => void;
  onConfigRoles: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onNewRes, onConfigRoles, isCollapsed, toggleSidebar }) => {
  const { user, logout } = useAuth();

  const hasAccess = (module: string) => {
    if (!user?.permissions) return true; // Fallback
    if (user.permissions.includes('all')) return true;
    return user.permissions.includes(module);
  };

  const NavItem = ({ view, label, icon }: { view: ViewType; label: string; icon: string }) => (
    <button
      onClick={() => setView(view)}
      title={isCollapsed ? label : ''}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all ${currentView === view
        ? 'bg-blue-600 text-white shadow-lg'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <span className="text-xl">{icon}</span>
      {!isCollapsed && <span className="font-bold text-xs uppercase tracking-widest">{label}</span>}
    </button>
  );

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white flex flex-col h-full shadow-2xl overflow-hidden transition-all duration-300 relative`}>
      {/* Header: User Info - Fixed */}
      <div className="p-4 shrink-0 flex flex-col gap-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl font-black text-white shrink-0">
            {user?.firstName?.[0] || 'U'}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h2 className="font-black text-sm tracking-tighter leading-none uppercase truncate">{user?.firstName} {user?.lastName}</h2>
              <p className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase truncate">{user?.role}</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-1 rounded-md self-end transition-colors w-full flex justify-center"
          title={isCollapsed ? "Expandir" : "Contraer"}
        >
          {isCollapsed ? '»' : '«'}
        </button>
      </div>

      {/* Scrollable Content: Reserve Btn + Nav */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <button
          onClick={onNewRes}
          title={isCollapsed ? "Nueva Reserva" : ""}
          className={`w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 uppercase text-xs tracking-widest shrink-0 ${isCollapsed ? 'px-0' : 'px-4'}`}
        >
          {isCollapsed ? <span className="text-xl">+</span> : <><span>RESERVAR</span></>}
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
              title={isCollapsed ? "Configuración" : ""}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all`}
            >
              <span className="text-xl">⚙️</span>
              {!isCollapsed && <span className="font-bold text-xs uppercase tracking-widest">Configuración</span>}
            </button>
          )}
        </nav>
      </div>

      {/* Footer: Logout - Fixed */}
      <div className="p-4 mt-auto shrink-0 border-t border-slate-800">
        <button
          onClick={logout}
          title={isCollapsed ? "Cerrar Sesión" : ""}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-900/50 hover:text-rose-400 transition-colors`}
        >
          <span className="text-xl">🚪</span>
          {!isCollapsed && <span className="font-bold text-xs uppercase tracking-widest">Cerrar Sesión</span>}
        </button>
      </div>
    </aside >
  );
};

export default Sidebar;
