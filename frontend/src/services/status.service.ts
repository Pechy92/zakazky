import api from './api';
import { OrderStatus } from '../types';

export const statusService = {
  async getAll() {
    const response = await api.get<OrderStatus[]>('/statuses');
    return response.data;
  },

  async create(payload: { name: string; orderIndex: number }) {
    const response = await api.post<OrderStatus>('/statuses', payload);
    return response.data;
  },

  async update(id: number, payload: { name: string; orderIndex: number }) {
    const response = await api.put<OrderStatus>(`/statuses/${id}`, payload);
    return response.data;
  },

  async remove(id: number) {
    const response = await api.delete(`/statuses/${id}`);
    return response.data;
  },
};
