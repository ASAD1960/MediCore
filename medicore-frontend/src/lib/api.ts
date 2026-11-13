import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1',
  withCredentials: true, // httpOnly session cookie
});

export interface ApiError { message: string; errors?: { field?: string; message: string }[] }
export const errorMessage = (e: unknown): string => {
  const err = e as AxiosError<ApiError>;
  const first = err.response?.data?.errors?.[0]?.message;
  return [err.response?.data?.message, first].filter(Boolean).join(': ') || 'Something went wrong';
};

api.interceptors.response.use((r) => r, (error: AxiosError) => {
  if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
    window.dispatchEvent(new Event('medicore:unauthorized'));
  }
  return Promise.reject(error);
});
