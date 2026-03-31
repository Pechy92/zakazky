import api from './api';
import { User } from '../types';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async register(email: string, password: string, fullName: string) {
    const response = await api.post<{ token: string; user: User }>('/auth/register', {
      email,
      password,
      fullName,
    });
    return response.data;
  },
};
