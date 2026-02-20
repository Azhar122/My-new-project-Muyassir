import api from './api';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthResponse, UserRole } from '../types';

// Safe localStorage access for web
const getWebStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

// Helper to store token based on platform
const storeToken = async (token: string) => {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    if (storage) {
      storage.setItem('auth_token', token);
    }
  } else {
    await SecureStore.setItemAsync('auth_token', token);
  }
};

// Helper to remove token based on platform
const removeToken = async () => {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    if (storage) {
      storage.removeItem('auth_token');
    }
  } else {
    await SecureStore.deleteItemAsync('auth_token');
  }
};

export const authService = {
  register: async (data: {
    email: string;
    password: string;
    role: UserRole;
    full_name: string;
    university?: string;
    student_id?: string;
    client_type?: string;
    verification_document?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data.access_token) {
      await storeToken(response.data.access_token);
    }
    return response.data;
  },

  

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
      '/auth/login',
      {
        email,
        password,
      });
  
    if (response.data.access_token) {
      await storeToken(response.data.access_token);
    }
  
    return response.data;
  },
  logout: async () => {
    await removeToken();
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

};