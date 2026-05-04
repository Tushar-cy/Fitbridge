import axiosInstance from './axiosInstance';
import { Session, Booking } from '../../types/session.types';

interface BookSessionPayload {
  trainerId: string;
  date: string;
  time: string;
  type: 'virtual' | 'in-person';
  duration: number;
}

export const sessionService = {
  book: async (payload: BookSessionPayload): Promise<Booking> => {
    const { data } = await axiosInstance.post('/sessions', payload);
    return data;
  },

  getMySessions: async (status?: string): Promise<Session[]> => {
    const { data } = await axiosInstance.get('/sessions/me', { params: { status } });
    return data;
  },

  getById: async (id: string): Promise<Session> => {
    const { data } = await axiosInstance.get(`/sessions/${id}`);
    return data;
  },

  cancel: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/sessions/${id}`);
  },

  getTrainerSessions: async (trainerId: string): Promise<Session[]> => {
    const { data } = await axiosInstance.get(`/trainers/${trainerId}/sessions`);
    return data;
  },
};
