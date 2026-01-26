
import React, { useState } from 'react';
import { Room, RoomStatus, Reservation } from '../types';
import RoomDetailModal from './RoomDetailModal';
import RoomBlockingModal from './RoomBlockingModal';

interface RoomListProps {
  rooms: Room[];
  reservations: Reservation[];
  onUpdateStatus: (id: number, status: RoomStatus) => void;
  onAddRoom: (room: { id: number; type: string; capacity: number }) => Promise<void>;
  onUpdateRoom: (id: number, updates: any) => Promise<void>;
  onDeleteRoom: (id: number) => Promise<void>;
  onAddMaintenance: (roomId: number, desc: string, date?: string) => Promise<void>;
  onUpdateMaintenance: (taskId: string, updates: any) => Promise<void>;
  onDeleteMaintenance: (taskId: string) => Promise<void>;
  onBlockRoom?: (roomId: number, start: string, end: string, reason: string) => Promise<void>;
  onUnblockRoom?: (roomId: number, start?: string, end?: string) => Promise<void>;
}

const RoomList: React.FC<RoomListProps> = ({
  rooms,
  reservations,
  onUpdateStatus,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onAddMaintenance,
  onUpdateMaintenance,
  onDeleteMaintenance,
  onBlockRoom,
  onUnblockRoom
}) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [newRoom, setNewRoom] = React.useState<{ id: string, type: string, capacity: string }>({ id: '', type: 'DOBLE', capacity: '2' });

  const [blockingModal, setBlockingModal] = useState<{ roomId: number; mode: 'block' | 'unblock' } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  const [loadingOp, setLoadingOp] = useState<string | null>(null); // 'delete-ID', 'block-ID', 'status-ID'

  React.useEffect(() => {
    if (viewingRoom) {
      const updated = rooms.find(r => r.id === viewingRoom.id);
      if (updated) setViewingRoom(updated);
    }
  }, [rooms]);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.id || !newRoom.type || !newRoom.capacity) return;


    try {
      await onAddRoom({
        id: parseInt(newRoom.id),
        type: newRoom.type,
        capacity: parseInt(newRoom.capacity)
      });
      setIsAdding(false);
      setNewRoom({ id: '', type: 'DOBLE', capacity: '2' });
    } catch (error) {
      console.error(error);
    }
  };

  const getRoomStatus = (roomId: number) => {
    // Check if there is an active 'maintenance' reservation for today
    // We can rely on reservations prop, assuming it contains active reservations
    // Ideally we check date overlap.
    const today = new Date().toISOString().split('T')[0];
    const blocked = reservations.find(r =>
      r.status === 'maintenance' &&
      (r.roomIds?.includes(roomId) || r.roomId === roomId) &&
      r.checkIn <= today && r.lastNight >= today
    );

    if (blocked) return { label: 'BLOQUEADA', color: 'bg-red-100 text-red-600 border-red-200' };

    // Fallback to room.status (clean/dirty) if needed, but for availability "DISPONIBLE" is better
    // Or maybe show Clean/Dirty as secondary info.
    // User requested "Arriba si está disponible o bloqueada".
    return { label: 'DISPONIBLE', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
  };

  const totalRooms = rooms.length;
  const totalCapacity = rooms.reduce((acc, room) => acc + (room.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 flex-1 w-full md:w-auto">
          <div className="bg-white p-4 rounded-xl border border-black shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Habitaciones</p>
              <p className="text-3xl font-black text-black">{totalRooms}</p>
            </div>
            <span className="text-3xl">🛏️</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-black shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Capacidad Total</p>
              <p className="text-3xl font-black text-black">{totalCapacity} <span className="text-base text-slate-400 font-bold">Plazas</span></p>
            </div>
            <span className="text-3xl">👥</span>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600 font-black' : 'text-slate-400 hover:text-slate-600'}`}
            title="Vista Cuadrícula"
          >
            🔲 Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600 font-black' : 'text-slate-400 hover:text-slate-600'}`}
            title="Vista Lista"
          >
            📜 Lista
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Add Room Card */}
          <div className="bg-slate-50 border-2 border-dashed border-black rounded-xl p-5 flex flex-col justify-center items-center min-h-[200px] hover:border-blue-400 transition-colors group">
            {!isAdding ? (
              <button onClick={() => setIsAdding(true)} className="flex flex-col items-center gap-2 text-black group-hover:text-blue-600">
                <span className="text-4xl font-light">+</span>
                <span className="font-bold text-sm">AGREGAR HABITACIÓN</span>
              </button>
            ) : (
              <form
                onSubmit={handleAddRoom}
                className="w-full space-y-3"
              >
                <h4 className="font-bold text-slate-700 text-center mb-2">Nueva Habitación</h4>
                <input
                  type="number"
                  placeholder="Nro. Habitación"
                  className="w-full p-2 text-sm border rounded"
                  value={newRoom.id}
                  onChange={e => setNewRoom({ ...newRoom, id: e.target.value })}
                  autoFocus
                  required
                />
                <select
                  className="w-full p-2 text-sm border rounded"
                  value={newRoom.type}
                  onChange={e => setNewRoom({ ...newRoom, type: e.target.value })}
                >
                  <option value="DOBLE">DOBLE</option>
                  <option value="TRIPLE">TRIPLE</option>
                  <option value="CUADRUPLE">CUADRUPLE</option>
                  <option value="QUINTUPLE">QUINTUPLE</option>
                </select>
                <input
                  type="number"
                  placeholder="Capacidad"
                  className="w-full p-2 text-sm border rounded"
                  value={newRoom.capacity}
                  onChange={e => setNewRoom({ ...newRoom, capacity: e.target.value })}
                  required
                />
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded">Cancelar</button>
                  <button type="submit" className="flex-1 py-1 text-xs bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Guardar</button>
                </div>
              </form>
            )}
          </div>

          {rooms.sort((a, b) => a.id - b.id).map(room => {
            const status = getRoomStatus(room.id);
            return (
              <div
                key={room.id}
                onClick={() => setViewingRoom(room)}
                className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md cursor-pointer transition-all ${status.label === 'BLOQUEADA' ? 'border-red-500' : 'border-black'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-2xl font-black text-black">#{room.id}</h4>
                    <p className="text-xs font-black text-black uppercase tracking-wider">{room.type}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${status.color}`}>
                    {status.label}
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-black font-bold">Capacidad:</span>
                    <span className="font-black text-black">{room.capacity} Personas</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(room.capacity / 5) * 100}%` }}></div>
                  </div>
                </div>

                {/* Keep Clean/Dirty toggle but maybe smaller or less prominent if blocked? user asked for available/blocked. */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(room.id, room.status === 'clean' ? 'dirty' : 'clean');
                  }}
                  className={`mt-2 text-center text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-80 select-none ${room.status === 'dirty' ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                >
                  {room.status === 'dirty' ? 'Estado: SUCIA' : 'Estado: LIMPIA'}
                </div>


                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBlockingModal({ roomId: room.id, mode: 'block' });
                    }}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300"
                  >
                    {loadingOp === `block-${room.id}` ? '...' : 'BLOQUEAR'}
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setBlockingModal({ roomId: room.id, mode: 'unblock' });
                    }}
                    disabled={!!loadingOp}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-50"
                  >
                    {loadingOp === `unblock-${room.id}` ? '...' : 'DISPONIBLE'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsAdding(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
            >
              <span className="text-lg">+</span> Agregar Habitación
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-black overflow-hidden animate-in fade-in duration-300">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-black">
                <tr>
                  <th className="px-6 py-4">Habitación</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Capacidad</th>
                  <th className="px-6 py-4">Estado (Limpieza)</th>
                  <th className="px-6 py-4">Disponibilidad</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isAdding && (
                  <tr className="bg-blue-50">
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        placeholder="Nro."
                        className="w-20 p-2 text-sm border border-blue-300 rounded focus:border-blue-500 outline-none font-bold"
                        value={newRoom.id}
                        onChange={e => setNewRoom({ ...newRoom, id: e.target.value })}
                        autoFocus
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="w-full p-2 text-sm border border-blue-300 rounded focus:border-blue-500 outline-none"
                        value={newRoom.type}
                        onChange={e => setNewRoom({ ...newRoom, type: e.target.value })}
                      >
                        <option value="DOBLE">DOBLE</option>
                        <option value="TRIPLE">TRIPLE</option>
                        <option value="CUADRUPLE">CUADRUPLE</option>
                        <option value="QUINTUPLE">QUINTUPLE</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        placeholder="Pax"
                        className="w-20 p-2 text-sm border border-blue-300 rounded focus:border-blue-500 outline-none font-bold"
                        value={newRoom.capacity}
                        onChange={e => setNewRoom({ ...newRoom, capacity: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4" colSpan={2}>
                      <div className="flex gap-2">
                        <button onClick={handleAddRoom} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700">GUARDAR</button>
                        <button onClick={() => setIsAdding(false)} className="text-slate-500 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-200">CANCELAR</button>
                      </div>
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                )}
                {rooms.sort((a, b) => a.id - b.id).map(room => {
                  const status = getRoomStatus(room.id);
                  return (
                    <tr key={room.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setViewingRoom(room)}>
                      <td className="px-6 py-4 font-black text-lg text-black">#{room.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-600">{room.type}</td>
                      <td className="px-6 py-4 font-bold text-slate-600">{room.capacity} pax</td>
                      <td className="px-6 py-4">
                        <span
                          onClick={(e) => { e.stopPropagation(); onUpdateStatus(room.id, room.status === 'clean' ? 'dirty' : 'clean'); }}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase cursor-pointer hover:opacity-80 ${room.status === 'dirty' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}
                        >
                          {room.status === 'dirty' ? 'SUCIA' : 'LIMPIA'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockingModal({ roomId: room.id, mode: 'block' });
                          }}
                          className="text-rose-500 hover:text-rose-700 font-bold text-xs mr-3"
                          title="Bloquear"
                        >
                          ⛔
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockingModal({ roomId: room.id, mode: 'unblock' });
                          }}
                          className="text-emerald-500 hover:text-emerald-700 font-bold text-xs"
                          title="Desbloquear"
                        >
                          {loadingOp === `unblock-${room.id}` ? '...' : '✅'}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('¿Seguro que desea eliminar esta habitación?')) {
                              try {
                                setLoadingOp(`delete-${room.id}`);
                                await onDeleteRoom(room.id);
                              } catch (error) {
                                console.error(error);
                              } finally {
                                setLoadingOp(null);
                              }
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 font-bold text-xs"
                          title="Eliminar"
                          disabled={!!loadingOp}
                        >
                          {loadingOp === `delete-${room.id}` ? '...' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {blockingModal && (
        <RoomBlockingModal
          isVisible={true}
          roomId={blockingModal.roomId}
          mode={blockingModal.mode}
          onClose={() => setBlockingModal(null)}
          onConfirmBlock={async (roomId, start, end, reason) => {
            try {
              setLoadingOp(`block-${roomId}`);
              setBlockingModal(null);
              if (onBlockRoom) await onBlockRoom(roomId, start, end, reason);
            } finally {
              setLoadingOp(null);
            }
          }}
          onConfirmUnblock={async (roomId, start, end) => {
            try {
              setLoadingOp(`unblock-${roomId}`);
              setBlockingModal(null);
              if (onUnblockRoom) await onUnblockRoom(roomId, start, end);
            } finally {
              setLoadingOp(null);
            }
          }}
        />
      )}

      {viewingRoom && (
        <RoomDetailModal
          room={viewingRoom}
          onClose={() => setViewingRoom(null)}
          onUpdateStatus={onUpdateStatus}
          onAddMaintenance={onAddMaintenance}
          onUpdateMaintenance={onUpdateMaintenance}
          onDeleteMaintenance={onDeleteMaintenance}
          onDeleteRoom={onDeleteRoom}
          onUpdateRoom={onUpdateRoom}
        />
      )}
    </div>
  );
};

export default RoomList;
