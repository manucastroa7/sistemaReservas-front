
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
  const [loading, setLoading] = React.useState(false);
  const [blockingModal, setBlockingModal] = useState<{ roomId: number; mode: 'block' | 'unblock' } | null>(null);

  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);

  React.useEffect(() => {
    if (viewingRoom) {
      const updated = rooms.find(r => r.id === viewingRoom.id);
      if (updated) setViewingRoom(updated);
    }
  }, [rooms]);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.id || !newRoom.type || !newRoom.capacity) return;

    setLoading(true);
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
    setLoading(false);
  };


  return (
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

      {rooms.sort((a, b) => a.id - b.id).map(room => (
        <div
          key={room.id}
          onClick={() => setViewingRoom(room)}
          className="bg-white rounded-xl shadow-sm border border-black p-5 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-2xl font-black text-black">#{room.id}</h4>
              <p className="text-xs font-black text-black uppercase tracking-wider">{room.type}</p>
            </div>
            {/* Status Badge - Keeping it for visibility but removing direct actions if requested, or maybe User wants to remove this too? 
                User said "sacar limpiar ensuciar...". Usually status display is still good. */}
            {/* Status Badge - Click to Toggle Clean/Dirty */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                // Toggle: if clean -> dirty, otherwise -> clean (handles maintenance->clean too)
                onUpdateStatus(room.id, room.status === 'clean' ? 'dirty' : 'clean');
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-80 select-none ${room.status === 'dirty' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}
            >
              {room.status === 'dirty' ? 'SUCIA' : 'LIMPIA'}
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

          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBlockingModal({ roomId: room.id, mode: 'block' });
              }}
              className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300"
            >
              BLOQUEAR
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBlockingModal({ roomId: room.id, mode: 'unblock' });
              }}
              className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
            >
              DISPONIBLE
            </button>
          </div>
        </div>
      ))}

      {blockingModal && (
        <RoomBlockingModal
          isVisible={true}
          roomId={blockingModal.roomId}
          mode={blockingModal.mode}
          onClose={() => setBlockingModal(null)}
          onConfirmBlock={async (roomId, start, end, reason) => {
            if (onBlockRoom) await onBlockRoom(roomId, start, end, reason);
          }}
          onConfirmUnblock={async (roomId, start, end) => {
            if (onUnblockRoom) await onUnblockRoom(roomId, start, end);
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
