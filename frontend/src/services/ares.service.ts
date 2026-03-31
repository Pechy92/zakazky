import api from './api';

interface AresCompany {
  ic: string;
  name: string;
  dic?: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  postalCode?: string;
}

export const aresService = {
  async searchByIc(ic: string) {
    const normalizedIc = String(ic || '').replace(/\D/g, '');
    const response = await api.get<AresCompany>(`/ares/search/${normalizedIc}`);
    return response.data;
  },
};
