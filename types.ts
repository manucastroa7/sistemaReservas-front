
export type RoomType = 'DOBLE' | 'TRIPLE' | 'CUADRUPLE' | 'QUINTUPLE';
export type RoomStatus = 'clean' | 'dirty' | 'maintenance';
export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta';

// Basic Interfaces to resolve missing types
export interface Hotel {
  id: string;
  name: string;
  address?: string;
  // add other fields as needed
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

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
  lastName?: string;
  dni?: string;
  email: string;
  phone: string;
  country?: string;
  province?: string;
  city?: string;
  contactSource?: string;
  observations?: string;
  reservations?: Reservation[];
  lastCheckIn?: string;
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
  expiresAt?: string;
  pax?: number;
  guest?: Guest; // Populated relation
}

export interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: string;
  hotel?: Hotel;
  customRole?: Role;
  // HR Fields
  position?: string;
  salary?: number;
  paymentDay?: string;
  isRegistered?: boolean;
  hiringDate?: string;
}


export interface Employee {
  id: string;
  firstName: string;
  lastName?: string;
  dni?: string;
  email?: string;
  phone?: string;
  position?: string;
  salary?: number;
  isRegistered?: boolean;
  paymentDay?: string;
  hiringDate?: string;
  status?: 'Activo' | 'Despedido' | 'Renuncio';
  terminationDate?: string;
  observations?: string;
  hotelId?: string;
}

export interface SalaryHistory {
  id: string;
  previousSalary: number;
  newSalary: number;
  changeDate: string;
  reason?: string;
  employeeId: string;
}

export interface JobPosition {
  id: string;
  name: string;
  baseSalary: number;
}

export interface EmployeePayment {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  concept?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: 'Insumos' | 'Servicios' | 'Mantenimiento' | 'Proveedores' | 'Otros';
  description: string;
  amount: number;
  supplier?: string;
}

export type ViewType = 'calendar' | 'guests' | 'rooms' | 'dashboard' | 'commissions' | 'statistics' | 'orders' | 'passenger-db' | 'hr' | 'expenses' | 'groups';
