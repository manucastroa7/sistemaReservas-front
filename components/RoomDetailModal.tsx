
import React, { useState } from 'react';
import { Room, MaintenanceTask, RoomStatus, Reservation } from '../types';
import { format, parseISO } from 'date-fns';

interface RoomDetailModalProps {
    room: Room;
    activeReservation?: Reservation; // NEW
    onClose: () => void;
    onUpdateStatus: (id: number, status: RoomStatus) => void;
    onAddMaintenance: (roomId: number, desc: string, date?: string) => Promise<void>;
    onUpdateMaintenance: (taskId: string, updates: any) => Promise<void>;
    onDeleteMaintenance: (taskId: string) => Promise<void>;
    onDeleteRoom: (id: number) => Promise<void>;
    onUpdateRoom: (id: number, updates: any) => Promise<void>;
    onBlockRoom?: (roomId: number, start: string, end: string, reason: string) => Promise<void>;
    onUnblockRoom?: (roomId: number) => Promise<void>;
}

const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ room, activeReservation, onClose, onUpdateStatus, onAddMaintenance, onUpdateMaintenance, onDeleteMaintenance, onDeleteRoom, onUpdateRoom, onBlockRoom, onUnblockRoom }) => {
    const [activeTab, setActiveTab] = useState<'cleaning' | 'maintenance' | 'settings'>('cleaning');
    const [newWaitDesc, setNewWaitDesc] = useState('');
    const [requestDate, setRequestDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ id: string, type: 'delete' | 'retry' } | null>(null);

    // Blocking State
    const [showBlockForm, setShowBlockForm] = useState(false);
    const [blockStart, setBlockStart] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [blockEnd, setBlockEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [blockReason, setBlockReason] = useState('');

    // Edit State
    const [editType, setEditType] = useState(room.type);
    const [editCapacity, setEditCapacity] = useState(room.capacity.toString());
    const [isEditing, setIsEditing] = useState(false);

    // Filter Tasks
    const pendingTasks = room.maintenanceTasks?.filter(t => t.status === 'pending') || [];
    const historyTasks = room.maintenanceTasks?.filter(t => t.status === 'done') || [];

    const handleAdd = async (sendWhatsApp: boolean = false) => {
        if (!newWaitDesc.trim()) return;
        setIsSubmitting(true);
        await onAddMaintenance(room.id, newWaitDesc, requestDate);

        if (sendWhatsApp) {
            const tasksToSend = [...pendingTasks, { description: newWaitDesc }];
            let text = `*MANTENIMIENTO HABITACIÓN #${room.id}* (Fecha: ${format(new Date(requestDate), 'dd/MM')})\n\n`;
            tasksToSend.forEach((t, i) => {
                text += `${i + 1}. ${t.description}\n`;
            });
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }

        setNewWaitDesc('');
        setIsSubmitting(false);
        setSuccessMessage('Tarea registrada exitosamente. Puedes seguir agregando.');
    };

    const handleWhatsApp = () => {
        if (pendingTasks.length === 0) return;

        let text = `*MANTENIMIENTO HABITACIÓN #${room.id}*\n\n`;
        pendingTasks.forEach((t, i) => {
            text += `${i + 1}. ${t.description}\n`;
        });

        // Encode and open
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">HABITACIÓN #{room.id}</h2>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{room.type} • Capacidad: {room.capacity}</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-2xl">×</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('cleaning')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${activeTab === 'cleaning' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        Limpieza
                    </button>
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${activeTab === 'maintenance' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        Mantenimiento {pendingTasks.length > 0 && <span className="bg-rose-500 text-white px-1.5 rounded-full ml-1">{pendingTasks.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-wider ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        Gestión
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">

                    {activeTab === 'cleaning' && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-3">Estado de Limpieza</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => onUpdateStatus(room.id, 'clean')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${room.status === 'clean' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                        <span className="text-3xl">✨</span>
                                        <span className="text-xs font-black uppercase text-emerald-700">LIMPIA</span>
                                    </button>
                                    <button onClick={() => onUpdateStatus(room.id, 'dirty')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${room.status === 'dirty' ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                        <span className="text-3xl">🧹</span>
                                        <span className="text-xs font-black uppercase text-rose-700">SUCIA</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'maintenance' && (
                        <div className="space-y-6">

                            {/* Maintenance Status Toggle */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-amber-800 text-sm">Estado de Mantenimiento</h4>
                                        <p className="text-xs text-amber-600 mt-1">
                                            {activeReservation
                                                ? `Bloqueo activo: ${format(parseISO(activeReservation.checkIn), 'dd/MM')} al ${format(parseISO(activeReservation.lastNight), 'dd/MM')}`
                                                : 'La habitación está operativa.'}
                                        </p>
                                    </div>
                                    {activeReservation && onUnblockRoom ? (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm('¿Desbloquear habitación y marcar como disponible?')) {
                                                    await onUnblockRoom(room.id);
                                                    setSuccessMessage('Habitación desbloqueada correctamente.');
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg font-bold text-xs bg-white text-slate-500 border border-slate-300 hover:bg-slate-50 transition-colors"
                                        >
                                            🔓 Desbloquear (Disponible)
                                        </button>
                                    ) : (
                                        !activeReservation && (
                                            <button
                                                onClick={() => setShowBlockForm(!showBlockForm)}
                                                className="px-4 py-2 rounded-lg font-bold text-xs bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                            >
                                                {showBlockForm ? 'Cancelar Bloqueo' : '🛡️ Bloquear Habitación'}
                                            </button>
                                        )
                                    )}
                                </div>

                                {showBlockForm && !activeReservation && (
                                    <div className="bg-white p-4 rounded-lg border border-amber-200 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Desde</label>
                                                <input type="date" value={blockStart} onChange={e => setBlockStart(e.target.value)} className="w-full text-xs p-2 border rounded" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hasta (Incluido)</label>
                                                <input type="date" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} className="w-full text-xs p-2 border rounded" />
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Motivo</label>
                                            <input type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Ej: Reparación eléctrica" className="w-full text-xs p-2 border rounded" />
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (onBlockRoom) {
                                                    await onBlockRoom(room.id, blockStart, blockEnd, blockReason);
                                                    setShowBlockForm(false);
                                                    setSuccessMessage('Habitación bloqueada exitosamente.');
                                                }
                                            }}
                                            disabled={!blockReason}
                                            className="w-full py-2 bg-amber-500 text-white font-bold text-xs rounded hover:bg-amber-600 disabled:opacity-50"
                                        >
                                            CONFIRMAR BLOQUEO
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Composer */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">



                                {successMessage && !confirmAction && (
                                    <div className="mb-4 bg-emerald-100 border border-emerald-300 text-emerald-800 p-3 rounded-lg text-xs font-bold flex justify-between items-center animate-in slide-in-from-top-2">
                                        <span>✅ {successMessage}</span>
                                        <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-black px-2">×</button>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase block mb-2">Nuevo Reporte</label>

                                    <div className="mb-3">
                                        <label className="text-[10px] uppercase font-bold text-slate-400">Fecha Solicitud</label>
                                        <input
                                            type="date"
                                            value={requestDate}
                                            onChange={e => setRequestDate(e.target.value)}
                                            className="w-full p-2 text-xs border rounded bg-white"
                                        />
                                    </div>

                                    <textarea
                                        className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        rows={2}
                                        placeholder="Describa el problema (ej: gotera en baño)..."
                                        value={newWaitDesc}
                                        onChange={e => setNewWaitDesc(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button
                                            onClick={() => handleAdd(false)}
                                            disabled={!newWaitDesc.trim() || isSubmitting}
                                            className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Registrar
                                        </button>
                                        <button
                                            onClick={() => handleAdd(true)}
                                            disabled={!newWaitDesc.trim() || isSubmitting}
                                            className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <span className="text-sm">📱</span> Registrar y Enviar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* WhatsApp Button */}
                            {pendingTasks.length > 0 && (
                                <button
                                    onClick={handleWhatsApp}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all"
                                >
                                    <span className="text-xl">📱</span>
                                    Enviar Lista por WhatsApp
                                </button>
                            )}

                            {/* Lists */}
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Pendientes ({pendingTasks.length})</h4>
                                {pendingTasks.length === 0 && <p className="text-sm text-slate-400 italic">No hay tareas pendientes.</p>}
                                <div className="space-y-2">
                                    {pendingTasks.map(t => (
                                        <div key={t.id} className={`group p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors ${confirmAction?.id === t.id && confirmAction.type === 'delete' ? 'bg-red-50 border-red-200' : ''}`}>
                                            {confirmAction?.id === t.id && confirmAction.type === 'delete' ? (
                                                <div className="flex justify-between items-center animate-in slide-in-from-left-2">
                                                    <span className="text-xs font-bold text-red-700">¿Borrar definitivamente?</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setConfirmAction(null)}
                                                            className="text-[10px] font-bold text-slate-500 px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100"
                                                        >
                                                            NO
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                await onDeleteMaintenance(t.id);
                                                                setConfirmAction(null);
                                                            }}
                                                            className="text-[10px] font-bold text-white px-2 py-1 bg-red-500 rounded hover:bg-red-600"
                                                        >
                                                            SI, BORRAR
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 w-4 h-4 cursor-pointer"
                                                        onChange={() => onUpdateMaintenance(t.id, { status: 'done' })}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-slate-700">{t.description}</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">
                                                            {t.requestDate ? `Solicitado: ${format(new Date(t.requestDate), 'dd/MM')}` : format(new Date(t.createdAt), "dd/MM HH:mm")}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setConfirmAction({ id: t.id, type: 'delete' })}
                                                        className="text-slate-300 hover:text-red-500 font-bold px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Eliminar Tarea"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {historyTasks.length > 0 && (
                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-3">Historial Reciente</h4>
                                    <div className="space-y-2 opacity-60">
                                        {historyTasks.slice(0, 5).map(t => (
                                            <div key={t.id} className={`flex flex-col text-xs text-slate-500 bg-slate-50 p-2 rounded ${confirmAction?.id === t.id ? (confirmAction.type === 'delete' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200') : ''}`}>
                                                {confirmAction?.id === t.id ? (
                                                    <div className="flex justify-between items-center w-full animate-in slide-in-from-left-2">
                                                        <span className={`font-bold ${confirmAction.type === 'delete' ? 'text-red-700' : 'text-blue-700'}`}>
                                                            {confirmAction.type === 'delete' ? '¿Eliminar?' : '¿Reactivar?'}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setConfirmAction(null)}
                                                                className="px-2 py-1 bg-white border text-slate-600 rounded"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirmAction.type === 'delete') {
                                                                        await onDeleteMaintenance(t.id);
                                                                    } else {
                                                                        await onUpdateMaintenance(t.id, { status: 'pending' });
                                                                    }
                                                                    setConfirmAction(null);
                                                                }}
                                                                className={`px-2 py-1 text-white rounded font-bold ${confirmAction.type === 'delete' ? 'bg-red-500 border-red-600' : 'bg-blue-500 border-blue-600'}`}
                                                            >
                                                                {confirmAction.type === 'delete' ? 'Eliminar' : 'Confirmar'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-emerald-500 font-bold">✓</span>
                                                            <span className="line-through">{t.description}</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => setConfirmAction({ id: t.id, type: 'retry' })}
                                                                className="text-blue-500 hover:text-blue-700 font-bold px-2 py-1 bg-white border rounded shadow-sm hover:shadow"
                                                                title="Volver a Enviar (Reactivar)"
                                                            >
                                                                ↺ Reenviar
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmAction({ id: t.id, type: 'delete' })}
                                                                className="text-slate-400 hover:text-red-600 font-bold px-2 py-1 bg-white border rounded shadow-sm hover:shadow"
                                                                title="Eliminar Definitivamente"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">

                            {/* Edit Room Details */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <h4 className="font-bold text-slate-700 text-sm mb-4">Editar Configuración</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tipo de Habitación</label>
                                        <select
                                            value={editType}
                                            onChange={e => setEditType(e.target.value)}
                                            className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="DOBLE">DOBLE</option>
                                            <option value="TRIPLE">TRIPLE</option>
                                            <option value="CUADRUPLE">CUADRUPLE</option>
                                            <option value="QUINTUPLE">QUINTUPLE</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Capacidad (Pax)</label>
                                        <input
                                            type="number"
                                            value={editCapacity}
                                            onChange={e => setEditCapacity(e.target.value)}
                                            className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            min="1"
                                            max="10"
                                        />
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setIsEditing(true);
                                            await onUpdateRoom(room.id, { type: editType, capacity: parseInt(editCapacity) });
                                            setIsEditing(false);
                                            setSuccessMessage("Configuración actualizada.");
                                            // Clear success message after 3 seconds
                                            setTimeout(() => setSuccessMessage(null), 3000);
                                        }}
                                        disabled={isEditing || (editType === room.type && parseInt(editCapacity) === room.capacity)}
                                        className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                                    >
                                        {isEditing ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <h4 className="font-black text-red-800 text-sm mb-2">Zona de Peligro</h4>
                                <p className="text-xs text-red-600 mb-4">Eliminar esta habitación borrará todos sus datos asociados, historial y configuración.</p>
                                <button
                                    onClick={async () => {
                                        if (window.confirm(`¿Seguro que deseas ELIMINAR la Habitación ${room.id} de forma permanente?`)) {
                                            await onDeleteRoom(room.id);
                                            onClose();
                                        }
                                    }}
                                    className="w-full py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 shadow-lg shadow-red-200"
                                >
                                    🗑️ Eliminar Habitación {room.id}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default RoomDetailModal;
