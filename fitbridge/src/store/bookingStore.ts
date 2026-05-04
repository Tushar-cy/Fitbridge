import { create } from 'zustand';
import { TimeSlot, Session } from '../types/session.types';
import { Trainer } from '../types/user.types';

interface BookingState {
  selectedTrainer: Trainer | null;
  selectedSlot: TimeSlot | null;
  selectedDate: string | null;
  sessionType: 'virtual' | 'in-person';
  currentBooking: Session | null;
  setTrainer: (trainer: Trainer) => void;
  setSlot: (slot: TimeSlot) => void;
  setDate: (date: string) => void;
  setSessionType: (type: 'virtual' | 'in-person') => void;
  setCurrentBooking: (session: Session) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedTrainer: null,
  selectedSlot: null,
  selectedDate: null,
  sessionType: 'virtual',
  currentBooking: null,

  setTrainer: (trainer) => set({ selectedTrainer: trainer }),
  setSlot: (slot) => set({ selectedSlot: slot }),
  setDate: (date) => set({ selectedDate: date }),
  setSessionType: (type) => set({ sessionType: type }),
  setCurrentBooking: (session) => set({ currentBooking: session }),
  reset: () =>
    set({
      selectedTrainer: null,
      selectedSlot: null,
      selectedDate: null,
      sessionType: 'virtual',
      currentBooking: null,
    }),
}));
