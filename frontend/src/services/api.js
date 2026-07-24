import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach token and tenant slug from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const tenantSlug = localStorage.getItem('tenantSlug');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
