
import { Reservation, Guest, Room, RoomStatus, Employee, EmployeePayment, Expense } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'; // URL de tu NestJS

const decodeJwt = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return {};
  }
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`,
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(err.message || 'Error en la petición');
  }
  return res.json();
};

export const api = {
  getRooms: async (): Promise<Room[]> => {
    const res = await fetch(`${API_BASE_URL}/rooms`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  createRoom: async (room: Partial<Room>): Promise<Room> => {
    const res = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(room),
    });
    return res.json();
  },

  updateRoomStatus: async (roomId: number, status: RoomStatus): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/${roomId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
  },

  updateRoom: async (id: number, updates: Partial<Room>): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
  },

  deleteRoom: async (roomId: number): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  getReservations: async (): Promise<Reservation[]> => {
    const res = await fetch(`${API_BASE_URL}/reservations`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getOccupancy: async (date: string): Promise<number> => {
    const res = await fetch(`${API_BASE_URL}/reservations/occupancy?date=${date}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  checkAvailability: async (roomId: number, start: string, end: string, excludeResId?: string): Promise<boolean> => {
    const params = new URLSearchParams({
      roomId: roomId.toString(),
      start,
      end,
      ...(excludeResId ? { exclude: excludeResId } : {})
    });
    const res = await fetch(`${API_BASE_URL}/reservations/check-availability?${params}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    return data.available;
  },

  saveReservation: async (reservation: any, guest: Guest): Promise<void> => {
    if (reservation.reservations) {
      // Bulk payload
      const payload = {
        reservations: reservation.reservations,
        guest
      };

      const res = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(err.message || 'Error al guardar reserva');
      }
    } else {
      // Single reservation
      const payload = { ...reservation, guest };

      const res = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(err.message || 'Error al guardar reserva');
      }
    }
  },

  getGuests: async (page = 1, limit = 1000, search = ''): Promise<{ data: Guest[], total: number }> => {
    const res = await fetch(`${API_BASE_URL}/guests?page=${page}&limit=${limit}&search=${search}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  createGuest: async (guest: Partial<Guest>): Promise<Guest> => {
    const res = await fetch(`${API_BASE_URL}/guests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(guest),
    });
    return res.json();
  },

  updateGuest: async (id: string, guest: Partial<Guest>): Promise<void> => {
    await fetch(`${API_BASE_URL}/guests/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(guest),
    });
  },

  deleteGuest: async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/guests/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  updateReservation: async (id: string, update: Partial<Reservation>): Promise<void> => {
    await fetch(`${API_BASE_URL}/reservations/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(update),
    });
  },

  deleteReservation: async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/reservations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  addMaintenanceTask: async (roomId: number, description: string, requestDate?: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/${roomId}/maintenance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ description, requestDate }),
    });
  },

  updateMaintenanceTask: async (taskId: string, updates: { status?: 'pending' | 'done', description?: string, requestDate?: string }): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/maintenance/${taskId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
  },

  deleteMaintenanceTask: async (taskId: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/maintenance/${taskId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  // Auth & Hotels
  createHotel: async (data: any) => {
    const res = await fetch(`${API_BASE_URL}/hotels`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getHotels: async () => {
    const res = await fetch(`${API_BASE_URL}/hotels`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  createHotelAdmin: async (hotelId: string, userData: any) => {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...userData, hotelId, role: 'admin' }),
    });
    return res.json();
  },

  impersonate: async (hotelId: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/impersonate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ hotelId }),
    });
    return res.json();
  },

  getUsers: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE_URL}/users?hotelId=${decodeJwt(localStorage.getItem('token') || '').hotelId}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  createUser: async (user: any): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    return handleResponse(res);
  },

  updateUser: async (id: string, updates: any): Promise<void> => {
    await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
  },

  updateHotel: async (id: string, data: any): Promise<void> => {
    await fetch(`${API_BASE_URL}/hotels/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  },

  getStats: async (start?: string, end?: string) => {
    const hotelId = decodeJwt(localStorage.getItem('token') || '').hotelId;
    const res = await fetch(`${API_BASE_URL}/statistics?hotelId=${hotelId}&start=${start}&end=${end}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  blockRoom: async (roomId: number, start: string, end: string, reason: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/reservations/block`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ roomId, start, end, reason }),
    });
  },

  getRoles: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE_URL}/roles`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  createRole: async (role: any): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(role),
    });
    return handleResponse(res);
  },

  updateRole: async (id: string, updates: any): Promise<void> => {
    await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
  },

  deleteRole: async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  normalizeGuests: async (): Promise<number> => {
    const res = await fetch(`${API_BASE_URL}/guests/normalize`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Employees
  getEmployees: async (): Promise<Employee[]> => {
    const res = await fetch(`${API_BASE_URL}/employees`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createEmployee: async (data: Partial<Employee>): Promise<Employee> => {
    const res = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateEmployee: async (id: string, data: Partial<Employee>): Promise<void> => {
    await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  getEmployeePayments: async (id: string): Promise<EmployeePayment[]> => {
    const res = await fetch(`${API_BASE_URL}/employees/${id}/payments`, { headers: getHeaders() });
    return handleResponse(res);
  },

  addEmployeePayment: async (id: string, data: Partial<EmployeePayment>): Promise<EmployeePayment> => {
    const res = await fetch(`${API_BASE_URL}/employees/${id}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  getSalaryHistory: async (id: string): Promise<import('./types').SalaryHistory[]> => {
    const res = await fetch(`${API_BASE_URL}/employees/${id}/salary-history`, { headers: getHeaders() });
    return handleResponse(res);
  },


  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    const res = await fetch(`${API_BASE_URL}/expenses`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createExpense: async (data: Partial<Expense>): Promise<Expense> => {
    const res = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteExpense: async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  getExpensesStats: async (month: string): Promise<{ total: number, byCategory: Record<string, number> }> => {
    const res = await fetch(`${API_BASE_URL}/expenses/stats?month=${month}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Positions
  getPositions: async (): Promise<import('./types').JobPosition[]> => {
    const res = await fetch(`${API_BASE_URL}/positions`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createPosition: async (data: Partial<import('./types').JobPosition>): Promise<import('./types').JobPosition> => {
    const res = await fetch(`${API_BASE_URL}/positions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updatePosition: async (id: string, data: Partial<import('./types').JobPosition>): Promise<void> => {
    await fetch(`${API_BASE_URL}/positions/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
  },

  deletePosition: async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/positions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  }

};
