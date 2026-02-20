import api from './api';
import { Service, ServiceType } from '../types';

export const servicesService = {
  listServices: async (params?: {
    service_type?: ServiceType;
    min_price?: number;
    max_price?: number;
    city?: string;
    university?: string;
    min_rating?: number;
    skip?: number;
    limit?: number;
  }): Promise<Service[]> => {
    const response = await api.get('/services', { params });
    return response.data;
  },

  getService: async (id: string): Promise<Service> => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },

  createService: async (data: any): Promise<Service> => {
    const response = await api.post('/services', data);
    return response.data;
  },

  updateService: async (id: string, data: any): Promise<Service> => {
    const response = await api.put(`/services/${id}`, data);
    return response.data;
  },

  deleteService: async (id: string): Promise<void> => {
    await api.delete(`/services/${id}`);
  },

  getMyListings: async (params?: { skip?: number; limit?: number }): Promise<Service[]> => {
    const response = await api.get('/services/provider/my-listings', { params });
    return response.data;
  },

  searchServices: async (filters: any): Promise<Service[]> => {
    const response = await api.post('/services/search', filters);
    return response.data;
  },
};