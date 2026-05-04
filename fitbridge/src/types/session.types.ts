import { Trainer } from './user.types';

export type SessionType = 'virtual' | 'in-person';
export type SessionStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

export interface TimeSlot {
  id: string;
  time: string; // "09:00"
  date: string; // "2024-03-20"
  available: boolean;
}

export interface Session {
  id: string;
  trainerId: string;
  traineeId: string;
  trainer?: Trainer;
  type: SessionType;
  status: SessionStatus;
  date: string;
  time: string;
  duration: number; // minutes
  price: number;
  notes?: string;
  meetLink?: string;
}

export interface Booking {
  id: string;
  sessionId: string;
  slot: TimeSlot;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
}
