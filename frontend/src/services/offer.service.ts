import api from './api';
import { Offer, OfferItem, OfferPdf } from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;

const resolveBackendBaseUrl = () => {
  if (rawApiUrl && rawApiUrl.trim()) {
    const normalized = rawApiUrl.trim().replace(/\/$/, '');
    return normalized.replace(/\/api$/i, '');
  }

  // Local fallback when VITE_API_URL is not provided.
  return `${window.location.protocol}//${window.location.hostname}:3001`;
};

export const offerService = {
  async getByOrderId(orderId: number) {
    const response = await api.get<Offer[]>(`/offers/order/${orderId}`);
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<Offer>(`/offers/${id}`);
    return response.data;
  },

  async create(offer: Omit<Offer, 'id' | 'sequenceNumber'> & { items: Omit<OfferItem, 'id' | 'offerId'>[] }) {
    const response = await api.post<Offer>('/offers', offer);
    return response.data;
  },

  async update(id: number, offer: Partial<Offer> & { items?: Omit<OfferItem, 'id' | 'offerId'>[] }) {
    const response = await api.put<Offer>(`/offers/${id}`, offer);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/offers/${id}`);
  },

  async getItems(offerId: number) {
    const response = await api.get<OfferItem[]>(`/offers/${offerId}/items`);
    return response.data;
  },

  async getGeneratedPdfs(offerId: number) {
    const response = await api.get<OfferPdf[]>(`/pdfs/offer/${offerId}`);
    return response.data;
  },

  async getOrderPdfs(orderId: number) {
    const response = await api.get<OfferPdf[]>(`/pdfs/order/${orderId}`);
    return response.data;
  },

  async generatePdf(offerId: number) {
    const response = await api.post<{ message: string; fileUrl: string }>(`/pdfs/generate/${offerId}`);
    return response.data;
  },

  getPdfPublicUrl(fileUrl: string) {
    if (!fileUrl) return '';
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    const backendBase = resolveBackendBaseUrl();
    return `${backendBase}${fileUrl}`;
  },
};
