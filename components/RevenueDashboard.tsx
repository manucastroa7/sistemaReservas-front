import React, { useMemo } from 'react';
import { Reservation, Room, Payment } from '../types';
import { format, isSameDay, subDays, startOfMonth, isWithinInterval, parseISO, eachDayOfInterval, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface RevenueDashboardProps {
    reservations: Reservation[];
    rooms: Room[];
}

const RevenueDashboard: React.FC<RevenueDashboardProps> = ({ reservations, rooms }) => {
    const today = new Date();

    // --- Financial Metrics ---

    // Total Invoiced (whether paid or not)
    const totalInvoiced = useMemo(() => {
        return reservations.reduce((total, res) => {
            if (res.status === 'cancelled') return total;

            const nights = (new Date(res.lastNight).getTime() - new Date(res.checkIn).getTime()) / (1000 * 60 * 60 * 24) + 1;
            const stayTotal = nights * res.pricePerNight * (res.roomIds?.length || 1);
            const extrasTotal = res.extras.reduce((sum, e) => sum + e.amount, 0);
            const discount = res.discount || 0;

            return total + (stayTotal + extrasTotal - discount);
        }, 0);
    }, [reservations]);

    // Total Collected (all payments)
    const totalCollected = useMemo(() => {
        return reservations.reduce((total, res) => {
            const paidTotal = res.payments.reduce((sum, p) => sum + p.amount, 0);
            return total + paidTotal;
        }, 0);
    }, [reservations]);

    // Total Pending (Total - Collected)
    const totalPending = useMemo(() => {
        return totalInvoiced - totalCollected;
    }, [totalInvoiced, totalCollected]);

    const monthlyRevenue = useMemo(() => {
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        return reservations.reduce((total, res) => {
            const monthPayments = res.payments.filter(p => isWithinInterval(parseISO(p.date), { start, end }));
            return total + monthPayments.reduce((sum, p) => sum + p.amount, 0);
        }, 0);
    }, [reservations]);

    // Total Guests Today
    const totalGuestsToday = useMemo(() => {
        const todayStr = format(today, 'yyyy-MM-dd');
        return reservations.reduce((total, res) => {
            if (res.status === 'cancelled') return total;
            const start = parseISO(res.checkIn);
            const end = parseISO(res.lastNight);

            if (isWithinInterval(today, { start, end }) || (res.checkIn === todayStr) || (res.lastNight === todayStr)) {
                return total + (res.pax || 1);
            }
            return total;
        }, 0);
    }, [reservations, today]);

    // --- Charts Data (Current Month) ---
    const currentMonthDays = useMemo(() => {
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        const days = eachDayOfInterval({ start, end });

        return days.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');

            // Daily Revenue
            const dailyIncome = reservations.reduce((total, res) => {
                const dayPayments = res.payments.filter(p => p.date === dateStr);
                return total + dayPayments.reduce((sum, p) => sum + p.amount, 0);
            }, 0);

            // Occupancy
            const occupiedRooms = reservations.filter(res =>
                res.status !== 'cancelled' &&
                isWithinInterval(date, { start: parseISO(res.checkIn), end: parseISO(res.lastNight) })
            ).length;

            return {
                date: format(date, 'dd'),
                fullDate: format(date, 'dd/MM'),
                income: dailyIncome,
                occupancy: occupiedRooms,
                occupancyPct: (occupiedRooms / rooms.length) * 100
            };
        });
    }, [reservations, rooms, today]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex border-b border-black pb-4 justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-black tracking-tight">Reporte Financiero</h2>
                    <p className="text-sm font-black text-black">ESTADÍSTICAS Y RENDIMIENTO</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-black tracking-widest">HOY</p>
                    <p className="text-xl font-black text-black">{format(today, 'dd MMMM yyyy', { locale: es })}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Facturado"
                    value={`$${totalInvoiced.toLocaleString()}`}
                    color="bg-blue-600 text-white"
                    icon="💰"
                    subtitle="Total de todas las reservas activas"
                />
                <KPICard
                    title="Total Recaudado"
                    value={`$${totalCollected.toLocaleString()}`}
                    color="bg-emerald-500 text-white"
                    icon="✅"
                    subtitle="Pagos recibidos hasta hoy"
                />
                <KPICard
                    title="Total por Cobrar"
                    value={`$${totalPending >= 0 ? totalPending.toLocaleString() : '0'}`}
                    color="bg-amber-500 text-white"
                    icon="⏳"
                    subtitle="Total menos señas recibidas"
                />
                <KPICard
                    title="Pasajeros Hoy"
                    value={totalGuestsToday}
                    color="bg-pink-600 text-white"
                    icon="👥"
                    subtitle="Huéspedes alojados actualmente"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black">
                    <h3 className="font-black text-black mb-6">💵 Ingresos del Mes - {format(today, 'MMMM yyyy', { locale: es })}</h3>
                    <div className="flex items-end gap-1 h-48 overflow-x-auto">
                        {currentMonthDays.map((day, i) => (
                            <div key={i} className="flex flex-col justify-end items-center gap-2 group min-w-[20px]">
                                <div
                                    className="w-full bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-600 relative"
                                    style={{ height: `${day.income > 0 ? Math.max((day.income / Math.max(...currentMonthDays.map(d => d.income), 10000)) * 100, 2) : 2}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold z-10 whitespace-nowrap">
                                        {day.fullDate}: ${day.income.toLocaleString()}
                                    </div>
                                </div>
                                <span className="text-[9px] font-black text-black">{day.date}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Occupancy Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black">
                    <h3 className="font-black text-black mb-6">🏨 Ocupación Mensual</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {currentMonthDays.map((day, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs">
                                <span className="w-8 font-black text-black text-[10px]">{day.date}</span>
                                <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${day.occupancyPct > 80 ? 'bg-emerald-500' : day.occupancyPct > 40 ? 'bg-blue-500' : 'bg-slate-400'}`}
                                        style={{ width: `${day.occupancyPct}%` }}
                                    ></div>
                                </div>
                                <span className="w-10 font-black text-black text-[10px]">{day.occupancy}/{rooms.length}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, color, icon, subtitle }: any) => (
    <div className={`p-6 rounded-2xl shadow-sm ${color} flex flex-col justify-between h-32 relative overflow-hidden`}>
        <div className="absolute right-[-20px] top-[-20px] text-[100px] opacity-10 pointer-events-none">
            {icon}
        </div>
        <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-widest opacity-80">{title}</p>
            <h3 className="text-3xl font-black mt-2">{value}</h3>
            {subtitle && <p className="text-[10px] mt-2 font-medium opacity-80">{subtitle}</p>}
        </div>
    </div>
);

export default RevenueDashboard;
