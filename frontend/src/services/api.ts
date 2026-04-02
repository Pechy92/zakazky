import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;

const baseURL = (() => {
  if (!rawApiUrl || !rawApiUrl.trim()) {
    return '/api';
  }

  const normalized = rawApiUrl.trim().replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
})();

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
