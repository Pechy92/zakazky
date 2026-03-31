import api from './api';
import { User } from '../types';

export const userService = {
  async getAll() {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  async create(payload: { email: string; fullName: string; password: string; role: 'admin' | 'manager' | 'user' }) {
    const response = await api.post<User>('/users', payload);
    return response.data;
  },

  async setActivation(id: number, isActive: boolean) {
    const response = await api.patch<User>(`/users/${id}/activation`, { isActive });
    return response.data;
  },
};
