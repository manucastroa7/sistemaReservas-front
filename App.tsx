
import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Room, Guest, Reservation, ViewType, RoomStatus } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GroupsPage from './components/GroupsPage';
import PaymentModal from './components/PaymentModal';
import CalendarGrid from './components/CalendarGrid';
import GuestList from './components/GuestList';
import RoomList from './components/RoomList';
import CommissionReport from './components/CommissionReport';
import RevenueDashboard from './components/RevenueDashboard';
import ReservationModal from './components/ReservationModal';
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import OrdersDashboard from './components/OrdersDashboard';
import HumanResources from './components/HumanResources';
import ExpensesManagement from './components/ExpensesManagement';
import RoleManagement from './components/RoleManagement';
import { AuthProvider, useAuth } from './context/AuthContext';
import PassengerDatabase from './components/PassengerDatabase';
import { format } from 'date-fns';

const MainApp: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('calendar');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [initialResData, setInitialResData] = useState<{ date: Date; roomId?: number; endDate?: Date; isGroup?: boolean; groupId?: string } | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadData(true);
    }
  }, [isAuthenticated]);

  const loadData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [r, gData, res] = await Promise.all([
        api.getRooms(),
        api.getGuests(), // Defaults to page 1, limit 1000
        api.getReservations()
      ]);
      setRooms(Array.isArray(r) ? r : []);
      setGuests(gData.data || []);
      setReservations(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error("Error cargando datos del servidor", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRoomStatus = async (roomId: number, status: RoomStatus) => {
    await api.updateRoomStatus(roomId, status);
    await loadData();
  };

  const handleSaveReservation = async (res: Reservation, guest: Guest) => {
    try {
      await api.saveReservation(res, guest);
      await loadData(); // Esperar a que se recarguen los datos antes de cerrar
      setIsResModalOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error al guardar la reserva. Verifica que no haya conflictos.');
    }
  };

  const handleAddGuest = async (guest: Guest) => {
    try {
      await api.createGuest(guest);
      await loadData();
    } catch (e: any) {
      console.error(e);
      alert('Error al crear el pasajero: ' + e.message);
    }
  };

  const handleAddRoom = async (room: { id: number; type: string; capacity: number }) => {
    await api.createRoom(room as any);
    await loadData();
  };

  const handleAddMaintenance = async (roomId: number, desc: string, date?: string) => {
    if (date && date.includes(',')) {
      const [start, end] = date.split(',');
      await api.blockRoom(roomId, start, end, desc);
    } else {
      await api.addMaintenanceTask(roomId, desc, date);
    }
    await loadData();
  };

  const handleUpdateMaintenance = async (taskId: string, updates: any) => {
    await api.updateMaintenanceTask(taskId, updates);
    await loadData();
  };
  const handleDeleteMaintenance = async (taskId: string) => {
    await api.deleteMaintenanceTask(taskId);
    await loadData();
  };

  const handleUpdateRoom = async (id: number, updates: any) => {
    await api.updateRoom(id, updates);
    await loadData();
  };
  if (!isAuthenticated) {
    return <Login />;
  }

  if (user?.role === 'superadmin') {
    return <SuperAdminDashboard />;
  }



  // ... (previous useEffect)

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black text-xl animate-pulse">
      CONECTANDO AL SERVIDOR...
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        currentView={currentView}
        setView={setCurrentView}
        onNewRes={() => { setSelectedResId(null); setInitialResData(null); setIsResModalOpen(true); }}
        onConfigRoles={() => setShowRoleModal(true)}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main className={`flex-1 overflow-auto relative ${currentView === 'calendar' ? 'p-0' : 'p-6'}`}>
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
              {currentView === 'dashboard' && 'Panel de Gestión'}
              {currentView === 'calendar' && 'Calendario'}
              {currentView === 'guests' && 'Reservas Pasajeros'}
              {currentView === 'passenger-db' && 'Base de Datos Pasajeros'}
              {currentView === 'rooms' && 'Habitaciones'}
              {currentView === 'commissions' && 'Comisiones'}
              {currentView === 'orders' && 'Pedidos Panadería'}
              {currentView === 'groups' && 'Gestión de Grupos'}
            </h1>
          </div>

          <div className="flex flex-col items-center">
            <h2 className="text-lg font-black text-slate-700 tracking-tight uppercase">{user?.hotelName || 'Gran Hotel Avenida'}</h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {format(new Date(), "eeee, d 'de' MMMM yyyy")}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md">ONLINE</span>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-700">{user?.firstName} {user?.lastName || ''}</p>
                {(user?.role === 'admin') && (
                  <button onClick={() => setShowRoleModal(true)} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase">Configurar</button>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                {user?.firstName?.[0] || 'A'}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {currentView === 'dashboard' && (
            <Dashboard
              reservations={reservations}
              rooms={rooms}
              guests={guests}
              onEditRes={(id) => { setSelectedResId(id); setIsResModalOpen(true); }}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarGrid
              rooms={rooms}
              reservations={reservations}
              onResClick={(id) => { setSelectedResId(id); setInitialResData(null); setIsResModalOpen(true); }}
              guests={guests}
              onCellClick={(date, roomId, endDate) => {
                setInitialResData({ date, roomId, endDate });
                setSelectedResId(null);
                setIsResModalOpen(true);
              }}
            />
          )}
          {currentView === 'guests' && (
            <GuestList
              guests={guests}
              onAddGuest={handleAddGuest}
              onEditRes={(id) => { setSelectedResId(id); setIsResModalOpen(true); }}
              onNewRes={() => { setSelectedResId(null); setInitialResData(null); setIsResModalOpen(true); }}
            />
          )}
          {currentView === 'passenger-db' && (
            <PassengerDatabase
              guests={guests}
              onAddGuest={handleAddGuest}
            />
          )}
          {currentView === 'rooms' && (
            <RoomList
              rooms={rooms}
              onUpdateStatus={handleUpdateRoomStatus}
              onAddRoom={handleAddRoom}
              onUpdateRoom={handleUpdateRoom}
              onDeleteRoom={async (id) => { await api.deleteRoom(id); await loadData(); }}
              onAddMaintenance={handleAddMaintenance}
              onUpdateMaintenance={handleUpdateMaintenance}
              onDeleteMaintenance={handleDeleteMaintenance}
              reservations={reservations} // Pass reservations to find active blocks
              onBlockRoom={async (roomId, start, end, reason) => {
                await api.blockRoom(roomId, start, end, reason);
                await loadData();
              }}
              onUnblockRoom={async (roomId, start, end) => {
                const affected = reservations.filter(r =>
                  r.status === 'maintenance' &&
                  (r.roomIds?.map(String).includes(String(roomId)) || String(r.roomId) === String(roomId))
                );

                if (!start && !end) {
                  // Unblock ALL
                  await Promise.all(affected.map(r => api.updateReservation(r.id, { status: 'cancelled' })));
                } else if (start && end) {
                  // Unblock Range (simple overlap cancellation)
                  const toCancel = affected.filter(r => {
                    const rStart = r.checkIn;
                    const rEnd = r.lastNight; // or checkOut? Usually lastNight for calendar logic.
                    // Overlap: (StartA <= EndB) and (EndA >= StartB)
                    return (start <= rEnd && end >= rStart);
                  });
                  await Promise.all(toCancel.map(r => api.updateReservation(r.id, { status: 'cancelled' })));
                }
                await loadData();
              }}
            />
          )}

          {currentView === 'groups' && (
            <GroupsPage
              reservations={reservations}
              guests={guests}
              rooms={rooms}
              onNewGroup={() => { setSelectedResId(null); setInitialResData({ date: new Date(), isGroup: true }); setIsResModalOpen(true); }}
              onReload={loadData}
              onAddToGroup={(groupId) => {
                setSelectedResId(null);
                setInitialResData({ date: new Date(), isGroup: true, groupId });
                setIsResModalOpen(true);
              }}
              onEditGroup={(resId) => {
                setSelectedResId(resId);
                setInitialResData(null);
                setIsResModalOpen(true);
              }}
            />
          )}


          {currentView === 'commissions' && (
            <CommissionReport
              reservations={reservations}
              guests={guests}
              onUpdateReservation={async (res) => { await api.saveReservation(res, guests.find(g => g.id === res.guestId)!); await loadData(); }}
            />
          )}
          {currentView === 'statistics' && (
            <RevenueDashboard reservations={reservations} rooms={rooms} />
          )}
          {currentView === 'orders' && <OrdersDashboard />}
          {currentView === 'hr' && <HumanResources />}
          {currentView === 'expenses' && <ExpensesManagement />}
        </div>
      </main>

      {isResModalOpen && (
        <ReservationModal
          onClose={() => setIsResModalOpen(false)}
          onSave={handleSaveReservation}
          reservation={reservations.find(r => r.id === selectedResId)}
          rooms={rooms}
          guests={guests}
          allReservations={reservations}
          initialDate={initialResData?.date}
          initialRoomId={initialResData?.roomId}
          initialEndDate={initialResData?.endDate}
          initialIsGroup={initialResData?.isGroup}
          initialGroupId={initialResData?.groupId}
        />
      )}

      {showRoleModal && <RoleManagement onClose={() => setShowRoleModal(false)} user={user} />}
    </div>
  );

};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
