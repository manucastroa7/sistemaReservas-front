
import React, { useState } from 'react';
import { Room, Reservation, Guest } from '../types';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  isWithinInterval,
  addMonths,
  subMonths,
  differenceInDays
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarGridProps {
  rooms: Room[];
  reservations: Reservation[];
  onCellClick: (date: Date, roomId: number, endDate?: Date) => void;
  onResClick: (id: string) => void;
  guests: Guest[];
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ rooms, reservations, onResClick, guests, onCellClick }) => {
  console.log('📅 CalendarGrid state:', {
    reservationsCount: reservations.length,
    roomsCount: rooms.length,
    firstRes: reservations[0],
    sampleRoomId: rooms[0]?.id
  });
  const [currentDate, setCurrentDate] = useState(new Date());

  // Drag Selection State
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ date: Date, roomId: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ date: Date, roomId: number } | null>(null);

  const handleMouseDown = (date: Date, roomId: number) => {
    setIsDragging(true);
    setSelectionStart({ date, roomId });
    setSelectionEnd({ date, roomId });
  };

  const handleMouseEnter = (date: Date, roomId: number) => {
    if (isDragging && selectionStart && selectionStart.roomId === roomId) {
      setSelectionEnd({ date, roomId });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && selectionStart && selectionEnd) {
      const start = selectionStart.date < selectionEnd.date ? selectionStart.date : selectionEnd.date;
      const end = selectionStart.date < selectionEnd.date ? selectionEnd.date : selectionStart.date;

      // Pass range to parent ONLY if it's a range (start != end)
      // Single click is now handled by DoubleClick or ignored
      if (onCellClick && start.getTime() !== end.getTime()) {
        onCellClick(start, selectionStart.roomId, end);
      }
    }
    setIsDragging(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getGuestName = (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) console.warn('⚠️ Guest not found for ID:', guestId, 'Available Guests:', guests.map(g => g.id));
    return guest ? `${guest.lastName}, ${guest.name}` : 'Anónimo';
  };

  const getResForRoomAndDay = (roomId: number, day: Date) => {
    return reservations.find(res => {
      if (res.status === 'cancelled') return false;
      const start = parseISO(res.checkIn);
      const lastNight = parseISO(res.lastNight);

      // Robust matching: conversion to Number handles string/number mismatch
      const ids = (res.roomIds || []).map(id => Number(id));
      const legacyId = res.roomId ? Number(res.roomId) : null;

      const isRoomMatch = ids.includes(roomId) || legacyId === roomId;
      const isDateMatch = isWithinInterval(day, { start, end: lastNight });

      return isRoomMatch && isDateMatch;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-200 rounded-lg"
          >
            ←
          </button>
          <h3 className="text-lg font-bold text-slate-800 capitalize w-48 text-center">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h3>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-200 rounded-lg"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Reservado</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-sm"></span> Check-in</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-sm"></span> Mantenimiento</div>
        </div>
      </div>

      <div className="overflow-auto max-h-[75vh] custom-scrollbar">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 w-32 min-w-[128px] bg-slate-50 border-r border-b border-black p-2 text-xs font-black text-black">
                HABITACIÓN
              </th>
              {days.map(day => (
                <th
                  key={day.toISOString()}
                  className={`sticky top-0 z-20 w-10 min-w-[40px] border-b border-r border-black p-2 text-center text-black ${[0, 6].includes(day.getDay()) ? 'bg-slate-100' : 'bg-white'
                    }`}
                >
                  <div className="text-[10px] text-black font-black uppercase">{format(day, 'eee', { locale: es })}</div>
                  <div className={`text-sm font-black ${isSameDay(day, new Date()) ? 'text-blue-700 underline decoration-2 underline-offset-4' : 'text-black'}`}>
                    {format(day, 'd')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.sort((a, b) => a.id - b.id).map(room => (
              <tr key={room.id} className="h-10">
                <td className="sticky left-0 z-10 bg-slate-50 border-r border-b border-black px-3 py-1 flex flex-col justify-center">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-black">#{room.id}</span>
                    <span className={`w-2 h-2 rounded-full ${room.status === 'clean' ? 'bg-emerald-500' : room.status === 'maintenance' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                  </div>
                  <span className="text-[10px] text-black font-black truncate">{room.type}</span>
                </td>
                {days.map((day, index) => {
                  const res = getResForRoomAndDay(room.id, day);
                  const isCheckIn = res && isSameDay(parseISO(res.checkIn), day);
                  const isMaintenance = room.status === 'maintenance';
                  const isFirstVisibleDay = index === 0 && res; // Show name if it's the first visible day of the grid and reservation exists
                  const showName = isCheckIn || isFirstVisibleDay;

                  // Selection Highlight Logic
                  let isSelected = false;
                  if (isDragging && selectionStart && selectionEnd && selectionStart.roomId === room.id) {
                    const start = selectionStart.date < selectionEnd.date ? selectionStart.date : selectionEnd.date;
                    const end = selectionStart.date < selectionEnd.date ? selectionEnd.date : selectionStart.date;
                    isSelected = isWithinInterval(day, { start, end });
                  }

                  return (
                    <td
                      key={day.toISOString()}
                      onMouseDown={() => {
                        if (!res) handleMouseDown(day, room.id);
                      }}
                      onMouseEnter={() => handleMouseEnter(day, room.id)}
                      onDoubleClick={() => onCellClick(day, room.id, day)} // Double click = Single Day
                      className={`border-r border-b border-black relative group cursor-pointer select-none ${isSelected ? 'bg-blue-300' : // Darker paint color
                        [0, 6].includes(day.getDay()) ? 'bg-slate-50/50' : 'hover:bg-slate-50'
                        }`}
                    >
                      {res && (
                        (() => {
                          const nights = differenceInDays(parseISO(res.lastNight), parseISO(res.checkIn)) + 1;
                          const roomCount = res.roomIds ? res.roomIds.length : 1;
                          const totalStay = nights * res.pricePerNight * roomCount;
                          const discount = res.discount || 0;
                          const totalExtras = (res.extras || []).reduce((sum, e) => sum + e.amount, 0);
                          const totalPaid = (res.payments || []).reduce((sum, p) => sum + p.amount, 0);
                          const totalDiff = (totalStay - discount) + totalExtras - totalPaid;

                          let bgColor = 'bg-blue-100 text-blue-700 border-blue-200'; // Default

                          if (res.status === 'cancelled') {
                            bgColor = 'bg-rose-100 text-rose-700 border-rose-200 decoration-rose-700 line-through';
                          } else if (totalDiff <= 0) {
                            bgColor = 'bg-emerald-100 text-emerald-700 border-emerald-200 font-black'; // Saldado
                          } else if (totalPaid > 0) {
                            bgColor = 'bg-amber-100 text-amber-700 border-amber-200'; // Señado / Parcial
                          } else {
                            bgColor = 'bg-orange-100 text-orange-700 border-orange-200'; // Adeuda Total
                          }

                          if (res.status === 'checked-in') bgColor = 'bg-blue-600 text-white border-blue-700';
                          if (res.status === 'checked-out') bgColor = 'bg-slate-500 text-white border-slate-600';
                          if (res.status === 'maintenance') bgColor = 'bg-red-600 text-white border-red-700 font-black tracking-widest';

                          return (
                            <div
                              onMouseDown={(e) => e.stopPropagation()} // Prevent drag start on reservations
                              onClick={(e) => { e.stopPropagation(); onResClick(res.id); }}
                              className={`absolute inset-y-1 left-0 right-0 mx-0.5 rounded-md px-1 text-[9px] font-bold overflow-hidden transition-all hover:brightness-95 flex items-center shadow-sm border ${bgColor}`}
                            >
                              {showName && (
                                <span className="truncate">{res.status === 'maintenance' ? `BLOQUEADA - ${res.notes || ''}` : getGuestName(res.guestId)}</span>
                              )}
                            </div>
                          );
                        })()
                      )}
                      {!res && isMaintenance && (
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          ⚠️
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CalendarGrid;
