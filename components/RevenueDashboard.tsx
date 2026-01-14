import React, { useMemo, useState, useEffect } from 'react';
import { Reservation, Room, Payment } from '../types';
import { format, isSameDay, subDays, startOfMonth, isWithinInterval, parseISO, eachDayOfInterval, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../api';

interface RevenueDashboardProps {
    reservations: Reservation[];
    rooms: Room[];
}

const RevenueDashboard: React.FC<RevenueDashboardProps> = ({ reservations, rooms }) => {
    const today = new Date();
    const [employees, setEmployees] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);

    useEffect(() => {
        api.getEmployees().then(setEmployees).catch(console.error);
        api.getExpenses().then(setExpenses).catch(console.error);
    }, []);

    // --- HR Expenses ---
    const { totalSalaries, registeredCount } = useMemo(() => {
        let total = 0;
        let reg = 0;
        employees.forEach(emp => {
            if (emp.salary) {
                let s = Number(emp.salary);
                if (emp.isRegistered) {
                    s = s * 1.30; // +30% Social Charges approximation
                    reg++;
                }
                total += s;
            }
        });
        return { totalSalaries: total, registeredCount: reg };
    }, [employees]);

    // --- Operational Expenses ---
    const totalExpenses = useMemo(() => {
        const currentMonthPrefix = format(today, 'yyyy-MM');
        return expenses
            .filter(e => e.date.startsWith(currentMonthPrefix))
            .reduce((sum, e) => sum + Number(e.amount), 0);
    }, [expenses, today]);

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

    // Net Profit estimate (Collected - Salaries - Expenses)
    // Note: ideally should be Invoiced - Expenses, but cash flow is usually Collected - Expenses
    // Let's show "Resultado Operativo" as Collected - (Salaries + Expenses)
    const netResult = totalCollected - (totalSalaries + totalExpenses);


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
                    value={`$${totalCollected.toLocaleString()}`}
                    color="bg-emerald-500 text-white"
                    icon="✅"
                    subtitle="Pagos recibidos del mes"
                />
                <KPICard
                    title="Gastos Personal"
                    value={`$${totalSalaries.toLocaleString()}`}
                    color="bg-rose-500 text-white"
                    icon="👔"
                    subtitle={`Salarios + Cargas (${registeredCount} reg.)`}
                />
                <KPICard
                    title="Gastos Operativos"
                    value={`$${totalExpenses.toLocaleString()}`}
                    color="bg-orange-500 text-white"
                    icon="💸"
                    subtitle="Insumos, Servicios, etc."
                />
                <KPICard
                    title="Resultado Operativo"
                    value={`$${netResult.toLocaleString()}`}
                    color={netResult >= 0 ? "bg-blue-600 text-white" : "bg-red-600 text-white"}
                    icon="📊"
                    subtitle="Recaudado - (Personal + Gastos)"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black">
                    <h3 className="font-black text-black mb-6">💵 Ingresos del Mes - {format(today, 'MMMM yyyy', { locale: es })}</h3>
                    <div className="flex items-end gap-2 h-64 overflow-x-auto pt-10 pb-2 px-2">
                        {currentMonthDays.map((day, i) => (
                            <div key={i} className="flex flex-col justify-end items-center gap-2 group min-w-[40px] h-full">
                                <div
                                    className="w-full bg-emerald-500 rounded-t-lg transition-all group-hover:bg-emerald-600 relative"
                                    style={{ height: `${day.income > 0 ? Math.max((day.income / Math.max(...currentMonthDays.map(d => d.income), 10000)) * 100, 2) : 2}%` }}
                                >
                                    {day.income > 0 && (
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-slate-700 text-[10px] font-black z-20 whitespace-nowrap bg-white/80 px-1 rounded-sm">
                                            ${day.income.toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] font-black text-slate-600 text-center leading-none">{day.date}</span>
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
                                <span className="w-10 font-black text-black text-[10px]">{Math.round(day.occupancyPct)}%</span>
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
