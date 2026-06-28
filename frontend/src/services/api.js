import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' }
});

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

api.interceptors.request.use(config => {
  const token = localStorage.getItem('erp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Helper: safely extract array from API response data
export function safeArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (data.error) return [];
    const arrayKeys = Object.keys(data).filter(k => Array.isArray(data[k]));
    if (arrayKeys.length === 1) return data[arrayKeys[0]];
    for (const key of ['items', 'data', 'results', 'records', 'rows', 'list',
      'customers', 'orders', 'quotes', 'invoices', 'shipments', 'vendors',
      'transfers', 'locations', 'work_orders', 'notifications', 'promotions',
      'widgets', 'entries', 'transactions', 'adjustments', 'receipts']) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return data == null ? [] : data;
}

api.interceptors.response.use(
  response => {
    response.safeArray = () => safeArray(response.data);
    return response;
  },
  error => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      localStorage.removeItem('erp_token');
      setTimeout(() => { window.location.href = '/login'; }, 100);
    }
    // Return resolved promise with safe empty data on 401 to prevent .map() crashes
    if (error.response?.status === 401) {
      return Promise.resolve({ data: [], safeArray: () => [] });
    }
    return Promise.reject(error);
  }
);

export default api;
