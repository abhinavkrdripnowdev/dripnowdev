import { useAuthStore } from '@/store/auth.store';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { logger } from './logger';

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _startTime?: number;
  _retry?: boolean;
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Send cookies (refresh token)
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ─── Request Interceptor: Attach Access Token & Track Start Time ─────────────
api.interceptors.request.use((config: CustomAxiosRequestConfig) => {
  config._startTime = Date.now();

  if (config.url && !config.url.startsWith('/auth/') && !config.url.startsWith('/v1/')) {
    config.url = '/v1' + config.url;
  }
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Datadog Logging & Auto-Refresh on 401 ──────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => {
    const config = response.config as CustomAxiosRequestConfig;
    const durationMs = config._startTime ? Date.now() - config._startTime : 0;
    const method = config.method || 'GET';
    const url = config.url || '';

    // Log successful API call to Datadog
    logger.logApiRequest(method, url, response.status, durationMs, {
      statusText: response.statusText,
      dataSize: response.data ? JSON.stringify(response.data).length : 0,
    });

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    const durationMs = originalRequest?._startTime ? Date.now() - originalRequest._startTime : 0;
    const method = originalRequest?.method || 'UNKNOWN';
    const url = originalRequest?.url || '';
    const status = error.response?.status || 0;

    // Log API failure to Datadog
    logger.logApiRequest(method, url, status, durationMs, {
      errorMessage: error.message,
      responseData: error.response?.data,
    });

    if (status === 401 && originalRequest && !originalRequest.url?.startsWith('/auth/') && !originalRequest._retry && localStorage.getItem('accessToken')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = data.data?.accessToken;

        if (!newToken) throw new Error('Missing refreshed access token');
        if (newToken) {
          localStorage.setItem('accessToken', newToken);
          processQueue(null, newToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
