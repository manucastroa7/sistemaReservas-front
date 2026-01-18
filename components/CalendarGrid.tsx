
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

  // Generate consistent color based on GROUP (empresa/agencia) or individual guest
  const getReservationColor = (groupId: string | undefined, guestId: string) => {
    const identifier = groupId || guestId;
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', ring: 'ring-blue-400' },
      { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', ring: 'ring-purple-400' },
      { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300', ring: 'ring-pink-400' },
      { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', ring: 'ring-indigo-400' },
      { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', ring: 'ring-cyan-400' },
      { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', ring: 'ring-teal-400' },
      { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-300', ring: 'ring-lime-400' },
      { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', ring: 'ring-yellow-400' },
      { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', ring: 'ring-orange-400' },
      { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', ring: 'ring-rose-400' },
      { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-300', ring: 'ring-fuchsia-400' },
      { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300', ring: 'ring-violet-400' },
    ];
    return colors[Math.abs(hash) % colors.length];
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

    <div className="bg-white shadow-sm border-t border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-65px)]" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="p-2 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
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
        <div className="flex items-center gap-4 text-xs font-bold overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0"><span className="w-4 h-4 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-sm border border-slate-300"></span> Colores únicos</div>
          <div className="flex items-center gap-1 shrink-0"><span className="w-4 h-4 bg-white rounded-sm border-2 border-emerald-500 ring-2 ring-emerald-400 ring-offset-1"></span> Saldado</div>
          <div className="flex items-center gap-1 shrink-0"><span className="w-4 h-4 bg-white rounded-sm border-2 border-amber-500 ring-2 ring-amber-400 ring-offset-1"></span> Parcial</div>
          <div className="flex items-center gap-1 shrink-0"><span className="w-4 h-4 bg-blue-600 rounded-sm"></span> Check-in</div>
          <div className="flex items-center gap-1 shrink-0"><span className="w-4 h-4 bg-red-600 rounded-sm"></span> Bloqueada</div>
        </div>
      </div>

      <div className="overflow-auto flex-1 custom-scrollbar relative">
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
                {days.map((day) => {
                  const res = getResForRoomAndDay(room.id, day);
                  const isMaintenance = room.status === 'maintenance';

                  // Check if this date is in the past (before today)
                  const today = new Date();
                  today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
                  const isPastDate = day < today;

                  // Selection Highlight Logic
                  let isSelected = false;
                  if (isDragging && selectionStart && selectionEnd && selectionStart.roomId === room.id) {
                    const start = selectionStart.date < selectionEnd.date ? selectionStart.date : selectionEnd.date;
                    const end = selectionStart.date < selectionEnd.date ? selectionEnd.date : selectionStart.date;
                    isSelected = isWithinInterval(day, { start, end });
                  }

                  // Determine cell background color
                  let cellBg = '';
                  if (isSelected) {
                    cellBg = 'bg-blue-300'; // Selection highlight
                  } else if (!res && isPastDate) {
                    cellBg = 'bg-slate-800'; // Empty past dates = dark/black
                  } else if ([0, 6].includes(day.getDay())) {
                    cellBg = 'bg-slate-50/50'; // Weekends
                  } else {
                    cellBg = 'hover:bg-slate-50'; // Default hover
                  }

                  return (
                    <td
                      key={day.toISOString()}
                      onMouseDown={() => {
                        if (!res) handleMouseDown(day, room.id);
                      }}
                      onMouseEnter={() => handleMouseEnter(day, room.id)}
                      onDoubleClick={() => onCellClick(day, room.id, day)} // Double click = Single Day
                      className={`border-r border-b border-black relative group cursor-pointer select-none ${cellBg}`}
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

                          // Get color based on GROUP (if exists) or individual GUEST
                          const colorScheme = getReservationColor(res.groupId, res.guestId);
                          let bgColor = `${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} ring-2 ${colorScheme.ring}`;

                          // Override with status-specific colors when needed
                          if (res.status === 'cancelled') {
                            bgColor = 'bg-slate-200 text-slate-500 border-slate-300 line-through ring-2 ring-slate-400';
                          } else if (res.status === 'checked-in') {
                            bgColor = 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-500';
                          } else if (res.status === 'checked-out') {
                            bgColor = 'bg-slate-600 text-white border-slate-700 ring-2 ring-slate-500';
                          } else if (res.status === 'maintenance') {
                            bgColor = 'bg-red-600 text-white border-red-700 font-black tracking-widest ring-2 ring-red-500';
                          } else if (res.status === 'quotation') {
                            bgColor = 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-400 border-dashed';
                          } else if (totalDiff <= 0) {
                            // Fully paid - add green ring for emphasis
                            bgColor = `${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} ring-2 ring-emerald-500 font-extrabold`;
                          } else if (totalPaid > 0) {
                            // Partially paid - add amber ring
                            bgColor = `${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} ring-2 ring-amber-500`;
                          }

                          const fullName = res.status === 'maintenance' ? `🔧 ${res.notes || 'BLOQUEADA'}` : getGuestName(res.guestId);
                          const displayName = res.status === 'maintenance' ? fullName : fullName.split(',')[0]; // Show only Last Name

                          return (
                            <div
                              title={fullName} // Show full name on hover
                              onMouseDown={(e) => e.stopPropagation()} // Prevent drag start on reservations
                              onClick={(e) => { e.stopPropagation(); onResClick(res.id); }}
                              className={`absolute inset-y-0.5 left-0 right-0 px-1 text-[11px] font-extrabold overflow-hidden whitespace-nowrap transition-all hover:brightness-95 flex items-center shadow-md border-2 ${bgColor}`}
                            >
                              <span className="truncate w-full">
                                {displayName}
                              </span>
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
