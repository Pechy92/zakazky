import api from './api';

export const categoryService = {
  async getMainCategories() {
    const response = await api.get('/categories/main');
    return response.data;
  },

  async getSubcategories() {
    const response = await api.get('/categories/sub');
    return response.data;
  },

  async getCombinations() {
    const response = await api.get('/categories/combinations');
    return response.data;
  },

  async createCombination(payload: { mainCategoryCode: string; subcategoryCode: string; htmlContent: string }) {
    const response = await api.post('/categories/combinations', payload);
    return response.data;
  },

  async updateCombination(
    id: number,
    payload: { mainCategoryCode: string; subcategoryCode: string; htmlContent: string }
  ) {
    const response = await api.put(`/categories/combinations/${id}`, payload);
    return response.data;
  },

  async deleteCombination(id: number) {
    const response = await api.delete(`/categories/combinations/${id}`);
    return response.data;
  },

  async getTextTemplates() {
    const response = await api.get('/categories/texts');
    return response.data;
  },

  async getWeakCurrentItems() {
    const response = await api.get('/categories/weak-current');
    return response.data;
  },

  async createMainCategory(payload: { code: string; name: string; description?: string }) {
    const response = await api.post('/categories/main', payload);
    return response.data;
  },

  async updateMainCategory(code: string, payload: { name: string; description?: string }) {
    const response = await api.put(`/categories/main/${encodeURIComponent(code)}`, payload);
    return response.data;
  },

  async deleteMainCategory(code: string) {
    const response = await api.delete(`/categories/main/${encodeURIComponent(code)}`);
    return response.data;
  },

  async createSubcategory(payload: { code: string; name: string; description?: string }) {
    const response = await api.post('/categories/sub', payload);
    return response.data;
  },

  async updateSubcategory(code: string, payload: { name: string; description?: string }) {
    const response = await api.put(`/categories/sub/${encodeURIComponent(code)}`, payload);
    return response.data;
  },

  async deleteSubcategory(code: string) {
    const response = await api.delete(`/categories/sub/${encodeURIComponent(code)}`);
    return response.data;
  },

  async createWeakCurrentItem(payload: { code: string; name: string; description?: string }) {
    const response = await api.post('/categories/weak-current', payload);
    return response.data;
  },

  async updateWeakCurrentItem(code: string, payload: { name: string; description?: string }) {
    const response = await api.put(`/categories/weak-current/${encodeURIComponent(code)}`, payload);
    return response.data;
  },

  async deleteWeakCurrentItem(code: string) {
    const response = await api.delete(`/categories/weak-current/${encodeURIComponent(code)}`);
    return response.data;
  },

  async createTextTemplate(payload: { name: string; htmlContent: string }) {
    const response = await api.post('/categories/texts', payload);
    return response.data;
  },

  async updateTextTemplate(id: number, payload: { name: string; htmlContent: string }) {
    const response = await api.put(`/categories/texts/${id}`, payload);
    return response.data;
  },

  async deleteTextTemplate(id: number) {
    const response = await api.delete(`/categories/texts/${id}`);
    return response.data;
  },
};
