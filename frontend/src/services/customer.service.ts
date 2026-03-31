import api from './api';
import { Customer } from '../types';

export const customerService = {
  async getAll() {
    const response = await api.get<Customer[]>('/customers');
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  async create(customer: Omit<Customer, 'id'>) {
    const response = await api.post<Customer>('/customers', customer);
    return response.data;
  },

  async update(id: number, customer: Partial<Customer>) {
    const response = await api.put<Customer>(`/customers/${id}`, customer);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/customers/${id}`);
  },
};
