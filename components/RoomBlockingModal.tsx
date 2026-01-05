import React, { useState } from 'react';
import { format } from 'date-fns';

interface RoomBlockingModalProps {
    isVisible: boolean;
    onClose: () => void;
    mode: 'block' | 'unblock';
    roomId: number;
    onConfirmBlock: (roomId: number, start: string, end: string, reason: string) => Promise<void>;
    onConfirmUnblock: (roomId: number, start?: string, end?: string) => Promise<void>;
}

const RoomBlockingModal: React.FC<RoomBlockingModalProps> = ({
    isVisible,
    onClose,
    mode,
    roomId,
    onConfirmBlock,
    onConfirmUnblock,
}) => {
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reason, setReason] = useState('');
    const [unblockAll, setUnblockAll] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isVisible) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'block') {
                await onConfirmBlock(roomId, startDate, endDate, reason);
            } else {
                if (unblockAll) {
                    await onConfirmUnblock(roomId);
                } else {
                    await onConfirmUnblock(roomId, startDate, endDate);
                }
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert('Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-black text-slate-800 mb-4 uppercase">
                    {mode === 'block' ? `Bloquear Habitación #${roomId}` : `Liberar Habitación #${roomId}`}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'unblock' && (
                        <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <input
                                type="checkbox"
                                id="unblockAll"
                                checked={unblockAll}
                                onChange={(e) => setUnblockAll(e.target.checked)}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            <label htmlFor="unblockAll" className="text-sm font-bold text-emerald-800 cursor-pointer select-none">
                                Liberar TODO (Bloqueos futuros y presentes)
                            </label>
                        </div>
                    )}

                    {(!unblockAll || mode === 'block') && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
                                <input
                                    type="date"
                                    required={!unblockAll}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
                                <input
                                    type="date"
                                    required={!unblockAll}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {mode === 'block' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo</label>
                            <textarea
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ej: Mantenimiento aire acondicionado"
                                className="w-full p-2 border border-slate-300 rounded font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded transition-colors disabled:opacity-50"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 py-2 px-4 text-white font-bold rounded shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'block'
                                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                                }`}
                        >
                            {loading ? 'PROCESANDO...' : (mode === 'block' ? 'CONFIRMAR BLOQUEO' : 'CONFIRMAR LIBERACIÓN')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoomBlockingModal;
