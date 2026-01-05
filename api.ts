
import { Reservation, Guest, Room, RoomStatus } from './types';

const API_BASE_URL = 'http://localhost:3001/api'; // URL de tu NestJS

export const api = {
  getRooms: async (): Promise<Room[]> => {
    const res = await fetch(`${API_BASE_URL}/rooms`);
    return res.json();
  },

  createRoom: async (room: Partial<Room>): Promise<Room> => {
    const res = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room),
    });
    return res.json();
  },

  updateRoomStatus: async (roomId: number, status: RoomStatus): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/${roomId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  updateRoom: async (id: number, updates: Partial<Room>): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  deleteRoom: async (roomId: number): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
      method: 'DELETE',
    });
  },

  getReservations: async (): Promise<Reservation[]> => {
    const res = await fetch(`${API_BASE_URL}/reservations`);
    return res.json();
  },

  checkAvailability: async (roomId: number, start: string, end: string, excludeResId?: string): Promise<boolean> => {
    const params = new URLSearchParams({
      roomId: roomId.toString(),
      start,
      end,
      ...(excludeResId ? { exclude: excludeResId } : {})
    });
    const res = await fetch(`${API_BASE_URL}/reservations/check-availability?${params}`);
    const data = await res.json();
    return data.available;
  },

  saveReservation: async (reservation: any, guest: Guest): Promise<void> => {
    // If 'reservation' is actually the bulk payload wrapper { reservations: [...] }
    if (reservation.reservations) {
      // It's already the bulk payload structure we want, but we need to inject the guest
      // The modal passes: onSave({ reservations }, guest)
      // BE expects: { reservations: [...], guest: ... } OR { reservation: ..., guest: ... } (Wait, let's check Service)

      // Service check: 
      // if (payload.reservations) { item.guest = payload.guest }
      // So we should send { reservations: [...], guest }

      const payload = {
        reservations: reservation.reservations,
        guest
      };

      const res = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(err.message || 'Error al guardar reserva');
      }
    } else {
      // Single reservation
      // Service check: if (!payload.reservations) -> const guest = await this.guestsRepository.save(payload.guest);
      // AND const reservation = ... payload ... (Wait, service expects spreads directly?)

      // Let's look at Service lines 57+: 
      //   const guest = await this.guestsRepository.save(payload.guest);
      //   const { guest: _, ...resData } = payload;

      // So the Service expects the body to BE the reservation object MERGED with a 'guest' property?
      // OR does it expect { reservation: ..., guest: ... }?
      // Line 32 log: JSON.stringify(payload).
      // If api.ts sends `JSON.stringify({ reservation, guest })`, then payload has `.reservation` and `.guest`.
      // Service line 35 checks `payload.reservations`.

      // If Api sends `{ reservation: {...}, guest: {...} }`:
      // Service sees `payload.reservation` (object) and `payload.guest` (object).
      // Service line 35: `payload.reservations` is undefined.
      // Service line 57: `this.guestsRepository.save(payload.guest)` -> Works!
      // Service line 63: `const { guest: _, ...resData } = payload;`
      // `resData` will contain `reservation: {...}`.
      // Service line 70: `this.reservationsRepository.create(resData)`.
      // THIS CREATES A RESERVATION WITH A PROPERTY 'reservation' inside it?! 
      // THIS IS WRONG. The Service expects a FLAT structure + guest? Or a flattened body?

      // OLD Api sent: `body: JSON.stringify({ reservation, guest })`
      // OLD Service likely did: `create(@Body() payload)` -> `payload.guest` ... 
      // Wait, if old service worked, how did it extract fields?
      // Let's assume the previous service code (which I overwrote partially) handled this or I missed it.

      // Let's Fix Api.ts to send a FLAT merged object.
      // { ...reservation, guest }

      const payload = { ...reservation, guest };

      const res = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(err.message || 'Error al guardar reserva');
      }
    }
  },

  getGuests: async (): Promise<Guest[]> => {
    const res = await fetch(`${API_BASE_URL}/guests`);
    return res.json();
  },

  updateGuest: async (id: string, guest: Partial<Guest>): Promise<void> => {
    await fetch(`${API_BASE_URL}/guests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guest),
    });
  },

  deleteGuest: async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/guests/${id}`, {
      method: 'DELETE',
    });
  },

  updateReservation: async (id: string, update: Partial<Reservation>): Promise<void> => {
    await fetch(`${API_BASE_URL}/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
  },

  addMaintenanceTask: async (roomId: number, description: string, requestDate?: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/${roomId}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, requestDate }),
    });
  },

  updateMaintenanceTask: async (taskId: string, updates: { status?: 'pending' | 'done', description?: string, requestDate?: string }): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/maintenance/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  deleteMaintenanceTask: async (taskId: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/rooms/maintenance/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Auth & Hotels
  createHotel: async (data: any) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/hotels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getHotels: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/hotels`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  createHotelAdmin: async (hotelId: string, userData: any) => {
    // This endpoint needs to be implemented in backend UsersController
    // For now we'll assume a generic create user endpoint or update this later
    // Let's assume we use the users endpoint but passing hotelId
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...userData, hotelId, role: 'admin' }),
    });
    return res.json();
  },

  impersonate: async (hotelId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/auth/impersonate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ hotelId }),
    });
    return res.json();
  },

  getUsers: async (hotelId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users?hotelId=${hotelId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  blockRoom: async (roomId: number, start: string, end: string, reason: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/reservations/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, start, end, reason }),
    });
  }
};
