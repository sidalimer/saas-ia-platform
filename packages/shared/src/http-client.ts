import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export function createInternalClient(baseURL: string, internalKey: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.headers.set('x-internal-key', internalKey);
    return config;
  });

  return client;
}
