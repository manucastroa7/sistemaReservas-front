
export type RoomType = 'DOBLE' | 'TRIPLE' | 'CUADRUPLE' | 'QUINTUPLE';
export type RoomStatus = 'clean' | 'dirty' | 'maintenance';
export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta';

export interface Room {
  id: number;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  maintenanceTasks?: MaintenanceTask[];
}

export interface MaintenanceTask {
  id: string;
  description: string;
  status: 'pending' | 'done';
  createdAt: string;
  requestDate?: string;
}

export interface Guest {
  id: string;
  name: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  observations?: string;
  reservations?: Reservation[];
}

export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  receipt: string;
}

export interface ExtraCharge {
  id: string;
  concept: string;
  amount: number;
  date: string;
}

export const EXTRAS_TYPES = [
  'Desayuno',
  'Cochera',
  'Late Check-out',
  'Early Check-in',
  'Recargo por Cambio de Fecha',
  'Servicio de Lavandería',
  'Consumo Minibar',
  'Cuna Adicional',
  'Otro'
];

export interface Reservation {
  id: string;
  guestId: string;
  roomId?: number; // Legacy, optional
  roomIds?: number[]; // New, Multi-Room
  rooms?: Room[]; // Populated relation
  checkIn: string;
  lastNight: string;
  checkOut: string;
  pricePerNight: number;
  discount?: number;
  payments: Payment[];
  extras: ExtraCharge[];
  isGroup: boolean;
  groupName?: string;
  commissionRecipient?: string;
  commissionAmount: number;
  commissionPaid: boolean;
  notes: string;
  status: 'confirmed' | 'cancelled' | 'checked-in' | 'checked-out' | 'maintenance';
  groupId?: string;
  pax?: number;
}

export type ViewType = 'calendar' | 'guests' | 'rooms' | 'dashboard' | 'commissions' | 'statistics' | 'orders';
