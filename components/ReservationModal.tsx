import React, { useState, useEffect } from 'react';
import { Reservation, Guest, Room, Payment, ExtraCharge, EXTRAS_TYPES } from '../types';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import PaymentModal from './PaymentModal';
import { api } from '../api';

interface ReservationModalProps {
  onClose: () => void;
  onSave: (res: Reservation, guest: Guest) => void;
  reservation?: Reservation;
  rooms: Room[];
  guests: Guest[];
  allReservations?: Reservation[]; // NEW: To calculate group totals
  initialDate?: Date;
  initialRoomId?: number;
  initialEndDate?: Date;
}

interface RoomSelection {
  id: number;
  price: number;
  checkIn: string;
  lastNight: string;
  pax: number;
}

const ReservationModal: React.FC<ReservationModalProps> = ({ onClose, onSave, reservation, rooms, guests, allReservations = [], initialDate, initialRoomId, initialEndDate }) => {
  const capitalize = (str: string) => {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  };

  const initialGuest = guests.find(g => g.id === reservation?.guestId);

  // Group Logic
  const linkedReservations = React.useMemo(() => {
    if (!reservation?.groupId || !allReservations) return [];
    return allReservations.filter(r => r.groupId === reservation.groupId);
  }, [reservation, allReservations]);

  const isLinkedGroup = linkedReservations.length > 1;

  // ... (State Definitions) ...
  const [formData, setFormData] = useState<any>({
    guestId: reservation?.guestId || '',
    name: initialGuest?.name || '',
    lastName: initialGuest?.lastName || '',
    dni: initialGuest?.dni || '',
    email: initialGuest?.email || '',
    phone: initialGuest?.phone || '',
    roomIds: reservation?.roomIds || (reservation?.roomId ? [reservation.roomId] : []),
    checkIn: reservation?.checkIn || (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
    lastNight: reservation?.lastNight || (initialEndDate ? format(initialEndDate, 'yyyy-MM-dd') : (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))),
    pricePerNight: reservation?.pricePerNight || 0,
    discount: reservation?.discount || 0,
    isGroup: reservation?.isGroup || false,
    groupName: reservation?.groupName || '',
    commissionRecipient: reservation?.commissionRecipient || '',
    commissionAmount: reservation?.commissionAmount || 0,
    commissionPaid: reservation?.commissionPaid || false,
    notes: reservation?.notes || '',
    status: reservation?.status || 'confirmed',
    pax: reservation?.pax || 1,
  });

  const [payments, setPayments] = useState<Payment[]>(reservation?.payments || []);
  const [extras, setExtras] = useState<ExtraCharge[]>(reservation?.extras || []);
  const [activeTab, setActiveTab] = useState<'info' | 'payments' | 'extras' | 'group'>('info');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>(undefined);
  const [commissionPct, setCommissionPct] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');

  // Availability State
  // Map index -> boolean (true if occupied)
  const [occupiedMap, setOccupiedMap] = useState<Record<number, boolean>>({});

  // Multi-Room State
  // Multi-Room State
  const [selectedRooms, setSelectedRooms] = useState<RoomSelection[]>(() => {
    if (reservation && reservation.roomIds && reservation.roomIds.length > 0) {
      const avgPrice = Math.round((reservation.pricePerNight || 0) / reservation.roomIds.length);
      const totalPax = reservation.pax || 1;
      const avgPax = Math.floor(totalPax / reservation.roomIds.length);
      const remainderPax = totalPax % reservation.roomIds.length;

      return reservation.roomIds.map((id, index) => ({
        id,
        price: avgPrice,
        checkIn: reservation.checkIn,
        lastNight: reservation.lastNight,
        pax: avgPax + (index === 0 ? remainderPax : 0)
      }));
    } else if (reservation && reservation.roomId) {
      return [{
        id: reservation.roomId,
        price: reservation.pricePerNight || 0,
        checkIn: reservation.checkIn,
        lastNight: reservation.lastNight,
        pax: reservation.pax || 1
      }];
    } else if (initialRoomId && initialDate) {
      // New Reservation from Grid Click
      return [{
        id: initialRoomId,
        price: 0,
        checkIn: format(initialDate, 'yyyy-MM-dd'),
        lastNight: initialEndDate ? format(initialEndDate, 'yyyy-MM-dd') : format(initialDate, 'yyyy-MM-dd'),
        pax: 2 // Default to 2? or 1? User can change.
      }];
    }
    return [];
  });

  const [availableRooms, setAvailableRooms] = useState<Room[]>(rooms);

  // 2. EFFECTS

  // Sync available rooms (exclude selected)
  useEffect(() => {
    setAvailableRooms(rooms);
  }, [rooms]);

  // Sync formData when selectedRooms changes (price sum & room IDs)
  useEffect(() => {
    // Calculate Total Price (Sum of each room's (nights * price))
    // Note: formData.pricePerNight usually meant "Total Nightly Rate", but with varying dates, 
    // it's better to think of it as "Total Reservation Value".
    // However, to keep existing logic working, let's normalize. 
    // If dates differ, "Price Per Night" is ambiguous. 
    // Let's store the TOTAL Cost in the sum logic, but formData expects a per-night val?
    // Actually, `totalStay` calculation below uses `nights * pricePerNight`. 
    // If we have mixed dates, we should probably update `totalStay` logic directly.

    // For now, let's update `formData.roomIds` for legacy compatibility.
    const ids = selectedRooms.map(r => r.id);

    // Check if dates are consistent to set global checkIn/Out
    const first = selectedRooms[0];
    // const consistentDates = selectedRooms.every(r => r.checkIn === first?.checkIn && r.lastNight === first?.lastNight);

    setFormData((prev: any) => ({
      ...prev,
      roomIds: ids,
      roomId: ids[0],
      // If inconsistent, these might be misleading, but we need them for defaults
      checkIn: first?.checkIn || prev.checkIn,
      lastNight: first?.lastNight || prev.lastNight,
      // Sum of prices (if consistent nights) implies rate/night. 
      // If incosistent, this value is less useful, but we sum it anyway.
      pricePerNight: selectedRooms.reduce((sum, r) => sum + r.price, 0),
      pax: selectedRooms.reduce((sum, r) => sum + (r.pax || 1), 0)
    }));
  }, [selectedRooms]);

  // Sync Commission Amount based on Pct
  useEffect(() => {
    // Calculate Total Stay Value manually for mixed dates
    let totalValue = 0;
    selectedRooms.forEach(r => {
      const n = differenceInDays(parseISO(r.lastNight), parseISO(r.checkIn)) + 1;
      totalValue += (n > 0 ? n : 0) * r.price;
    });

    if (commissionPct > 0) {
      const amount = (totalValue * commissionPct) / 100;
      setFormData((prev: any) => ({ ...prev, commissionAmount: amount }));
      setFormData((prev: any) => ({ ...prev, commissionAmount: Math.round(amount) }));
    }
  }, [commissionPct, selectedRooms]);

  // Real-time Availability Check
  useEffect(() => {
    const timer = setTimeout(async () => {
      const newMap: Record<number, boolean> = {};

      await Promise.all(selectedRooms.map(async (sr, index) => {
        if (sr.id && sr.checkIn && sr.lastNight) {
          // Check backend
          const available = await api.checkAvailability(sr.id, sr.checkIn, sr.lastNight, reservation?.id);
          if (!available) {
            newMap[index] = true;
          }
        }
      }));

      setOccupiedMap(newMap);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [selectedRooms, reservation]); // Listen to selectedRooms changes directly

  // Guest Lookup by DNI
  useEffect(() => {
    if (formData.dni.length >= 6) {
      const g = guests.find(guest => guest.dni === formData.dni);
      if (g) {
        setFormData((prev: any) => ({
          ...prev,
          guestId: g.id,
          name: g.name,
          lastName: g.lastName,
          email: g.email,
          phone: g.phone
        }));
      }
    }
  }, [formData.dni, guests]);

  // 3. HANDLERS
  const handleDeletePayment = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este pago?')) {
      setPayments(payments.filter(p => p.id !== id));
    }
  };

  const handleSavePayment = (payment: Payment) => {
    if (editingPayment) {
      setPayments(payments.map(p => p.id === payment.id ? payment : p));
      setEditingPayment(undefined);
    } else {
      setPayments([...payments, payment]);
    }
    setShowPaymentModal(false);
  };

  // 4. CALCULATIONS
  // Re-calculate Total Stay based on individual rooms
  const totalStay = selectedRooms.reduce((sum, r) => {
    const n = differenceInDays(parseISO(r.lastNight), parseISO(r.checkIn)) + 1;
    return sum + ((n > 0 ? n : 0) * r.price);
  }, 0);

  const calculatedDiscount = discountType === 'fixed'
    ? (formData.discount || 0)
    : (totalStay * (formData.discount || 0) / 100);

  const totalExtras = extras.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = (totalStay - calculatedDiscount) + totalExtras - totalPaid;

  // Group Stats
  const groupStats = React.useMemo(() => {
    if (!isLinkedGroup) return null;
    let stay = 0;
    let disc = 0;
    let ext = 0;
    let pd = 0;

    linkedReservations.forEach(r => {
      // Recalculate or trust stored? Stored might be safer if backend logic is complex.
      // But backend doesn't store 'total'. We must recalc.
      const n = differenceInDays(parseISO(r.lastNight), parseISO(r.checkIn)) + 1;
      // Check if multi-room legacy
      // const rc = r.roomIds?.length || (r.roomId ? 1 : 0);
      // Note: r.pricePerNight is usually "Total for reservation" in my new logic, 
      // but historically "Per Room" or "Total"? 
      // In my new logic: "pricePerNight" = sum of all selected rooms. So NO need to multiply by room count again.
      // Wait, check `handleSubmit` logic. 
      // Single Res: `pricePerNight: selectedRooms.reduce(...)`. Exact sum. Correct.
      // Bulk Res: `pricePerNight: room.price`. Correct.
      // So `r.pricePerNight` IS the nightly rate for THAT reservation entity.

      stay += (n * r.pricePerNight);
      disc += (r.discount || 0); // Assuming fixed discount stored
      ext += (r.extras || []).reduce((s, e) => s + e.amount, 0);
      ext += (r.extras || []).reduce((s, e) => s + e.amount, 0);

      // Use LOCAL payments state if this is the current reservation
      if (reservation && r.id === reservation.id) {
        pd += payments.reduce((s, p) => s + p.amount, 0);
      } else {
        pd += (r.payments || []).reduce((s, p) => s + p.amount, 0);
      }
    });

    return {
      stay,
      discount: disc,
      extras: ext,
      paid: pd,
      balance: (stay - disc) + ext - pd
    };
  }, [linkedReservations, isLinkedGroup]);

  // Display Payments Logic (Group Merge)
  const displayPayments = React.useMemo(() => {
    if (!isLinkedGroup) return payments;
    const all = [...payments]; // Current unsaved ones
    linkedReservations.forEach(r => {
      if (r.id !== reservation?.id) {
        all.push(...(r.payments || []));
      }
    });
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, linkedReservations, isLinkedGroup, reservation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRooms.length === 0) {
      if (reservation?.id) {
        if (window.confirm('No has seleccionado ninguna habitación. ¿Deseas CANCELAR esta reserva completa?')) {
          api.updateReservation(reservation.id, { status: 'cancelled' }).then(() => {
            window.location.reload();
          });
        }
      } else {
        alert('Por favor, selecciona al menos una habitación para crear una reserva.');
      }
      return;
    }

    // Validate internal overlaps
    for (let i = 0; i < selectedRooms.length; i++) {
      for (let j = i + 1; j < selectedRooms.length; j++) {
        const r1 = selectedRooms[i];
        const r2 = selectedRooms[j];
        if (r1.id === r2.id) {
          const range1Start = parseISO(r1.checkIn);
          const range1End = parseISO(r1.lastNight);
          const range2Start = parseISO(r2.checkIn);
          const range2End = parseISO(r2.lastNight);

          if (range1Start <= range2End && range2Start <= range1End) {
            alert(`Error: La habitación ${r1.id} tiene fechas superpuestas en tu selección.`);
            return;
          }
        }
      }
    }

    const guest: Guest = {
      id: formData.guestId || '',
      name: formData.name,
      lastName: formData.lastName,
      dni: formData.dni,
      email: formData.email,
      phone: formData.phone,
    };

    // Check if we need Bulk Creation (Mixed Dates)
    const first = selectedRooms[0];
    const sameDates = selectedRooms.every(r => r.checkIn === first.checkIn && r.lastNight === first.lastNight);

    if (sameDates || selectedRooms.length === 1) {
      // Single Reservation Logic (One Entity, Many Rooms)
      const res: Reservation = {
        id: reservation?.id || '',
        guestId: guest.id,
        roomId: formData.roomIds[0],
        roomIds: formData.roomIds,
        checkIn: first.checkIn,
        lastNight: first.lastNight,
        checkOut: format(addDays(parseISO(first.lastNight), 1), 'yyyy-MM-dd'),
        // Total price per night is sum of all rooms
        pricePerNight: selectedRooms.reduce((sum, r) => sum + r.price, 0),
        pax: formData.pax, // Add Pax
        discount: Number(calculatedDiscount),
        isGroup: formData.isGroup,
        groupName: formData.groupName,
        commissionRecipient: formData.commissionRecipient,
        commissionAmount: Number(formData.commissionAmount),
        commissionPaid: formData.commissionPaid,
        payments: payments,
        extras: extras,
        notes: formData.notes,
        status: formData.status,
      };
      onSave(res, guest);
    } else {
      // Bulk Reservation Logic (Array of Entities)
      const reservations = selectedRooms.map(room => ({
        // If editing existing, we might lose ID mapping if we split? 
        // For now assume new "Group" creation or simple split.
        // If strictly new:
        guestId: guest.id,
        roomId: room.id, // Legacy
        roomIds: [room.id], // Single room per entity
        checkIn: room.checkIn,
        lastNight: room.lastNight,
        checkOut: format(addDays(parseISO(room.lastNight), 1), 'yyyy-MM-dd'),
        pricePerNight: room.price,
        pax: room.pax || 1, // Add Pax per room
        discount: 0, // Split discount? Complex. Let's assume 0 or handle globally.
        isGroup: true, // Auto-mark as group
        groupName: formData.groupName || `Grupo ${guest.lastName}`,
        commissionRecipient: formData.commissionRecipient,
        commissionAmount: 0, // Split?
        commissionPaid: formData.commissionPaid,
        payments: [], // Payments hard to split.
        extras: [],
        notes: formData.notes,
        status: formData.status,
      }));

      // Wrap in special payload
      onSave({ reservations } as any, guest);
    }
  };

  // 5. MAINTENANCE / BLOCK VIEW
  if (reservation?.status === 'maintenance') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-red-200">
          <div className="bg-rose-50 px-8 py-6 border-b border-rose-100 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-rose-600 tracking-tight">HABITACIÓN BLOQUEADA</h2>
              <p className="text-xs font-bold text-rose-400 uppercase">Gestión de Bloqueos</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-rose-100 flex items-center justify-center transition-colors text-rose-400 hover:text-rose-700">
              <span className="text-2xl">×</span>
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Habitación</label>
                <div className="text-xl font-black text-slate-800">
                  {formData.roomIds.length > 0 ? formData.roomIds.join(', ') : formData.roomId}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fechas</label>
                <div className="text-sm font-bold text-slate-700">
                  {format(parseISO(formData.checkIn), 'dd/MM/yyyy')} <span className="text-slate-300 mx-1">→</span> {format(parseISO(formData.lastNight), 'dd/MM/yyyy')}
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-2">Motivo del Bloqueo</label>
              <div className="font-bold text-amber-900 text-lg">
                {formData.notes || 'Sin motivo especificado'}
              </div>
            </div>
          </div>

          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors uppercase tracking-widest text-slate-500"
            >
              Cerrar
            </button>
            <button
              onClick={async () => {
                if (window.confirm('¿Está seguro de desbloquear esta habitación?')) {
                  await api.updateReservation(reservation.id, { status: 'cancelled' });
                  window.location.reload();
                }
              }}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-emerald-200 uppercase tracking-widest flex items-center gap-2"
            >
              ✅ Desbloquear
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          onClose={() => { setShowPaymentModal(false); setEditingPayment(undefined); }}
          onSave={handleSavePayment}
          initialPayment={editingPayment}
        />
      )}

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {reservation ? `RESERVA #${reservation.id.substring(0, 8).toUpperCase()}` : 'NUEVA RESERVA'}
            </h2>
            <p className="text-xs font-bold text-slate-400">GESTIÓN DE ESTADÍA - GRAN HOTEL AVENIDA</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-800">
            <span className="text-2xl">×</span>
          </button>
        </div>

        <div className="flex bg-slate-50/50 px-8 border-b border-slate-200">
          <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Huésped y Habitación" />
          <TabButton active={activeTab === 'group'} onClick={() => setActiveTab('group')} label="Empresa / Comisión" />
          <TabButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} label={`Pagos (${displayPayments.length})`} />
          <TabButton active={activeTab === 'extras'} onClick={() => setActiveTab('extras')} label={`Extras (${extras.length})`} />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 min-h-0">
          {activeTab === 'info' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">01</span>
                  <h3 className="font-black text-slate-700 uppercase text-sm tracking-widest">Titular de Reserva</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input label="DNI" placeholder="Buscar por DNI..." value={formData.dni} onChange={(e: any) => setFormData({ ...formData, dni: e.target.value })} required />
                  <Input label="Nombre" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: capitalize(e.target.value) })} required />
                  <Input label="Apellido" value={formData.lastName} onChange={(e: any) => setFormData({ ...formData, lastName: capitalize(e.target.value) })} required />
                  <Input label="Email" value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} type="email" />
                  <Input label="Teléfono" value={formData.phone} onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">02</span>
                  <h3 className="font-black text-slate-700 uppercase text-sm tracking-widest">Estadía y Habitaciones</h3>
                </div>


                <div className="flex flex-col gap-6">

                  <div className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Habitaciones Seleccionadas {!selectedRooms.length && '(Seleccione una abajo)'}</label>
                    </div>

                    <div className="space-y-2">
                      {selectedRooms.map((sr, index) => {
                        // Check overlap (Internal)
                        const hasInternalOverlap = selectedRooms.some((other, i) =>
                          i !== index &&
                          other.id === sr.id &&
                          parseISO(sr.checkIn) <= parseISO(other.lastNight) &&
                          parseISO(other.checkIn) <= parseISO(sr.lastNight)
                        );

                        // Check Backend Occupancy
                        const isOccupied = occupiedMap[index];
                        const hasError = hasInternalOverlap || isOccupied;

                        return (
                          <div key={index} className={`flex flex-wrap gap-2 items-end p-3 rounded-xl border shadow-sm transition-all ${hasError ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500' : 'bg-white border-slate-200'}`}>
                            <div className="w-20">
                              <span className={`text-[10px] font-black block uppercase ${hasError ? 'text-rose-600' : 'text-slate-400'}`}>HABITACIÓN</span>
                              <span className={`font-bold text-lg ${hasError ? 'text-rose-700' : 'text-slate-700'}`}>#{sr.id}</span>
                              {hasInternalOverlap && <span className="text-[9px] font-black text-rose-600 uppercase block mt-1">Superpuesta</span>}
                              {isOccupied && <span className="text-[9px] font-black text-rose-600 uppercase block mt-1">Ocupada</span>}
                            </div>

                            <div className="flex-1 min-w-[120px]">
                              <Input
                                label="Desde"
                                type="date"
                                value={sr.checkIn}
                                onChange={(e: any) => {
                                  const newRooms = [...selectedRooms];
                                  newRooms[index].checkIn = e.target.value;
                                  setSelectedRooms(newRooms);
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                              <Input
                                label="Hasta"
                                type="date"
                                value={sr.lastNight}
                                onChange={(e: any) => {
                                  const newRooms = [...selectedRooms];
                                  newRooms[index].lastNight = e.target.value;
                                  setSelectedRooms(newRooms);
                                }}
                              />
                            </div>

                            <div className="flex flex-col justify-center items-center h-full pb-2 px-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">NOCHES</span>
                              <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                {differenceInDays(parseISO(sr.lastNight), parseISO(sr.checkIn)) + 1}
                              </span>
                            </div>

                            <div className="w-20">
                              <Input
                                label="Pax"
                                type="number"
                                value={sr.pax || 1}
                                onChange={(e: any) => {
                                  const newPax = Math.max(1, Number(e.target.value));
                                  const newRooms = [...selectedRooms];
                                  newRooms[index].pax = newPax;
                                  setSelectedRooms(newRooms);
                                }}
                              />
                            </div>

                            <div className="w-28">
                              <Input
                                label="Precio / Noche"
                                type="number"
                                value={sr.price}
                                onChange={(e: any) => {
                                  const newPrice = Number(e.target.value);
                                  const newRooms = [...selectedRooms];
                                  newRooms[index].price = newPrice;
                                  setSelectedRooms(newRooms);
                                }}
                              />
                            </div>
                            <div className="pb-1">
                              <button
                                type="button"
                                onClick={() => setSelectedRooms(selectedRooms.filter((_, i) => i !== index))}
                                className="w-8 h-8 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Quitar"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <select
                        className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold flex-1"
                        id="room-selector"
                      >
                        {availableRooms.map(r => <option key={r.id} value={r.id}>Hab. {r.id} ({r.type})</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const select = document.getElementById('room-selector') as HTMLSelectElement;
                          const roomId = Number(select.value);
                          if (roomId) {
                            // Use current form defaults or Today if empty
                            setSelectedRooms([...selectedRooms, {
                              id: roomId,
                              price: 0,
                              checkIn: formData.checkIn || format(new Date(), 'yyyy-MM-dd'),
                              lastNight: formData.lastNight || format(new Date(), 'yyyy-MM-dd'),
                              pax: 2
                            }]);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200"
                      >
                        + Agregar Hab.
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Descuento</label>
                    <div className="flex bg-rose-100 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${discountType === 'fixed' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-400 hover:text-rose-600'}`}
                      >
                        $
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percent')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${discountType === 'percent' ? 'bg-white text-rose-600 shadow-sm' : 'text-rose-400 hover:text-rose-600'}`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-rose-300 font-bold">
                      {discountType === 'fixed' ? '-$' : '%'}
                    </span>
                    <input
                      type="number"
                      value={formData.discount}
                      onChange={(e: any) => setFormData({ ...formData, discount: Number(e.target.value) })}
                      className="w-full bg-rose-50 border-2 border-rose-100 rounded-xl pl-8 pr-4 py-2.5 focus:border-rose-500 outline-none font-black text-rose-700"
                      placeholder="0"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'group' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-100">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-blue-600"
                    checked={formData.isGroup}
                    onChange={(e: any) => setFormData({ ...formData, isGroup: e.target.checked })}
                  />
                  <span className="font-black text-blue-900 uppercase text-sm">¿Es una reserva de Grupo o Empresa?</span>
                </label>

                {formData.isGroup && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-blue-200">
                    <Input label="Nombre del Grupo / Empresa" value={formData.groupName} onChange={(e: any) => setFormData({ ...formData, groupName: e.target.value })} />
                    <Input label="Referente / Comisionista" value={formData.commissionRecipient} onChange={(e: any) => setFormData({ ...formData, commissionRecipient: e.target.value })} />

                    <div className="flex gap-4">
                      <div className="w-1/3">
                        <Input
                          label="% Comisión"
                          type="number"
                          placeholder="Ej. 10"
                          value={commissionPct}
                          onChange={(e: any) => setCommissionPct(Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          label="Monto Comisión ($)"
                          type="number"
                          value={formData.commissionAmount}
                          onChange={(e: any) => setFormData({ ...formData, commissionAmount: e.target.value })}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          label="Monto Comisión ($)"
                          type="number"
                          value={formData.commissionAmount}
                          onChange={(e: any) => setFormData({ ...formData, commissionAmount: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Breakdown Section */}
                    <div className="mt-4 p-4 bg-white/50 rounded-xl border border-blue-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Desglose de Cálculo</p>
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex flex-col">
                          <span className="text-slate-500">Valor Total Estadía</span>
                          <span className="font-bold text-slate-700">
                            ${selectedRooms.reduce((sum, r) => {
                              const nights = differenceInDays(parseISO(r.lastNight), parseISO(r.checkIn)) + 1;
                              return sum + (nights * r.price);
                            }, 0).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-slate-400">x</span>
                        <div className="flex flex-col">
                          <span className="text-slate-500">Comisión</span>
                          <span className="font-bold text-slate-700">{commissionPct}%</span>
                        </div>
                        <span className="text-slate-400">=</span>
                        <div className="flex flex-col">
                          <span className="text-slate-500">A Pagar</span>
                          <span className="font-bold text-blue-600">${Number(formData.commissionAmount).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={formData.commissionPaid}
                          onChange={(e: any) => setFormData({ ...formData, commissionPaid: e.target.checked })}
                        />
                        <span className="text-xs font-bold text-slate-600 uppercase">¿Comisión ya pagada?</span>
                      </label>
                    </div>
                  </div>
                )}

                {isLinkedGroup && (
                  <div className="mt-6 pt-6 border-t border-blue-200">
                    <h4 className="font-black text-blue-900 uppercase text-sm mb-4">Reservas Vinculadas al Grupo</h4>
                    <div className="space-y-2">
                      {linkedReservations.map(lr => (
                        <div key={lr.id} className={`p-3 rounded-lg flex justify-between items-center text-xs ${lr.id === reservation?.id ? 'bg-blue-200 border border-blue-300 ring-2 ring-blue-400' : 'bg-white border border-blue-100'}`}>
                          <div className="flex gap-4">
                            <span className="font-bold text-slate-700">Hab. {lr.roomIds ? lr.roomIds.join(', ') : lr.roomId}</span>
                            <span className="text-slate-500">{format(parseISO(lr.checkIn || '2024-01-01'), 'dd/MM')} - {format(parseISO(lr.lastNight || '2024-01-01'), 'dd/MM')}</span>
                          </div>
                          <span className="font-black text-slate-700">${(lr.pricePerNight * (differenceInDays(parseISO(lr.lastNight || '2024-01-01'), parseISO(lr.checkIn || '2024-01-01')) + 1)).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-700 uppercase text-sm">Historial de Transacciones</h3>
                <button type="button" onClick={() => setShowPaymentModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all">+ NUEVO PAGO</button>
              </div>
              <div className="border-2 border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3 text-left">Fecha</th>
                      <th className="px-6 py-3 text-left">Método</th>
                      <th className="px-6 py-3 text-left">Referencia</th>
                      <th className="px-6 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayPayments.map(p => (
                      <tr key={p.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold">{p.date}</td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black uppercase">{p.method}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{p.receipt}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="font-black text-emerald-600 text-sm">${p.amount.toLocaleString()}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => { setEditingPayment(p); setShowPaymentModal(true); }}
                                className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                title="Editar"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(p.id)}
                                className="w-6 h-6 flex items-center justify-center bg-rose-100 text-rose-600 rounded hover:bg-rose-200"
                                title="Eliminar"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'extras' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Concepto</label>
                  <select
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm font-bold"
                    id="new-extra-concept"
                    defaultValue={EXTRAS_TYPES[0]}
                  >
                    {EXTRAS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Monto</label>
                  <input type="number" id="new-extra-amount" className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm font-bold" placeholder="0" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const conceptInput = document.getElementById('new-extra-concept') as HTMLSelectElement;
                    const amountInput = document.getElementById('new-extra-amount') as HTMLInputElement;
                    const concept = conceptInput.value;
                    const amount = Number(amountInput.value);

                    if (concept && amount > 0) {
                      setExtras([...extras, {
                        id: Math.random().toString(36).substr(2, 9),
                        concept,
                        amount,
                        date: new Date().toISOString().split('T')[0]
                      }]);
                      amountInput.value = '';
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all"
                >
                  Agregar
                </button>
              </div>

              <div className="border-2 border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3 text-left">Concepto</th>
                      <th className="px-6 py-3 text-left">Fecha</th>
                      <th className="px-6 py-3 text-right">Monto</th>
                      <th className="px-6 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extras.map(e => (
                      <tr key={e.id} className="group hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-700">{e.concept}</td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{e.date}</td>
                        <td className="px-6 py-4 text-right font-black text-rose-500">+ ${e.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('¿Eliminar este extra?')) {
                                setExtras(extras.filter(ex => ex.id !== e.id));
                              }
                            }}
                            className="text-slate-300 hover:text-rose-500 transition-colors font-bold text-lg opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    {extras.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic font-medium">No hay extras cargados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>

        <div className="px-8 py-6 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6 flex-shrink-0">
          <div className="flex gap-4 md:gap-8">
            {!isLinkedGroup ? (
              <>
                <SummaryItem
                  label={`Estadía (${formData.roomIds.length > 1 ? `${formData.roomIds.length} Habs.` : `Hab. ${formData.roomIds[0] || '-'}`})`}
                  value={`$${totalStay.toLocaleString()}`}
                />
                {calculatedDiscount > 0 && <SummaryItem label="Bonif." value={`-$${calculatedDiscount.toLocaleString()}`} color="text-rose-300" />}
                <SummaryItem label="Extras" value={`$${totalExtras.toLocaleString()}`} color="text-rose-400" />
                <SummaryItem label="Pagado" value={`$${totalPaid.toLocaleString()}`} color="text-emerald-400" />
                <SummaryItem label="Saldo" value={`$${balance.toLocaleString()}`} color={balance <= 0 ? "text-emerald-400" : "text-amber-400"} large />
              </>
            ) : (
              <>
                <div className="flex flex-col border-r border-slate-700 pr-4 mr-4 opacity-50 scale-90 origin-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 mb-1">Esta Reserva</span>
                  <div className="flex gap-4">
                    <SummaryItem label="Estadía" value={`$${totalStay.toLocaleString()}`} />
                    <SummaryItem label="Saldo" value={`$${balance.toLocaleString()}`} color={balance <= 0 ? "text-emerald-400" : "text-amber-400"} />
                  </div>
                </div>

                <div className="flex gap-8">
                  <SummaryItem
                    label={`Grupo (${linkedReservations.length} Res.)`}
                    value={`$${groupStats?.stay.toLocaleString()}`}
                  />
                  <SummaryItem label="Pagado Global" value={`$${groupStats?.paid.toLocaleString()}`} color="text-emerald-400" />
                  <SummaryItem label="Saldo Global" value={`$${groupStats?.balance.toLocaleString()}`} color={(groupStats?.balance || 0) <= 0 ? "text-emerald-400" : "text-amber-400"} large />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-4">
            {reservation?.id && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('¿Está seguro que desea cancelar esta reserva? Desaparecerá de la grilla principal pero quedará en el historial del huésped.')) {
                    await api.updateReservation(reservation.id, { status: 'cancelled' });
                    window.location.reload();
                  }
                }}
                className="px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-black text-xs transition-colors uppercase tracking-widest"
              >
                Cancelar Reserva
              </button>
            )}
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-black text-xs hover:bg-slate-800 transition-colors uppercase tracking-widest">Cerrar</button>
            <button
              onClick={handleSubmit}
              className="px-10 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-xs transition-all shadow-xl shadow-blue-900/20 uppercase tracking-widest"
            >
              Guardar Reserva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-6 py-4 font-black text-[10px] uppercase tracking-widest transition-all border-b-2 ${active ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
      }`}
  >
    {label}
  </button>
);

const Input = ({ label, ...props }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</label>
    <input
      className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-sm font-bold transition-all placeholder:text-slate-300"
      {...props}
    />
  </div>
);

const SummaryItem = ({ label, value, color = "text-white", large = false }: any) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
    <span className={`font-black ${large ? 'text-2xl' : 'text-lg'} ${color}`}>{value}</span>
  </div>
);

export default ReservationModal;
