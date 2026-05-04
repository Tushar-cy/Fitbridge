import axiosInstance from './axiosInstance';
import { Trainer } from '../../types/user.types';

interface SearchParams {
  query?: string;
  specialisation?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  page?: number;
  limit?: number;
}

export const trainerService = {
  search: async (params: SearchParams): Promise<Trainer[]> => {
    const { data } = await axiosInstance.get('/trainers', { params });
    return data;
  },

  getById: async (id: string): Promise<Trainer> => {
    const { data } = await axiosInstance.get(`/trainers/${id}`);
    return data;
  },

  getAvailability: async (id: string, date: string): Promise<string[]> => {
    const { data } = await axiosInstance.get(`/trainers/${id}/availability`, { params: { date } });
    return data;
  },

  updateProfile: async (id: string, updates: Partial<Trainer>): Promise<Trainer> => {
    const { data } = await axiosInstance.patch(`/trainers/${id}`, updates);
    return data;
  },
};
