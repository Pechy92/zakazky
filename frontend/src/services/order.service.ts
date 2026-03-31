import api from './api';
import { Order, DashboardStat } from '../types';

export const orderService = {
  async getAll() {
    const response = await api.get<Order[]>('/orders');
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<Order>(`/orders/${id}`);
    return response.data;
  },

  async create(order: Omit<Order, 'id' | 'createdAt'>) {
    const response = await api.post<Order>('/orders', order);
    return response.data;
  },

  async update(id: number, order: Partial<Order>) {
    const response = await api.put<Order>(`/orders/${id}`, order);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/orders/${id}`);
  },

  async getDashboardStats(year?: number) {
    const response = await api.get<DashboardStat[]>('/orders/stats/dashboard', {
      params: year ? { year } : {},
    });
    return response.data;
  },
};
