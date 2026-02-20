import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getExpoHost = (): string | null => {
  const constants = Constants as any;
  const hostUri =
    constants?.expoConfig?.hostUri ||
    constants?.expoGoConfig?.debuggerHost ||
    constants?.manifest2?.extra?.expoClient?.hostUri ||
    constants?.manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') {
    return null;
  }
  return hostUri.split(':')[0] || null;
};

const getDefaultApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  const expoHost = getExpoHost();
  if (expoHost) {
    return `http://${expoHost}:8000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return 'http://localhost:8000';
};

//const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || getDefaultApiUrl();

const API_URL = "https://muyassir-backend.onrender.com";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Safe localStorage access for web
const getWebStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    let token = null;
    
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      if (storage) {
        token = storage.getItem('auth_token');
      }
    } else {
      token = await SecureStore.getItemAsync('auth_token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (Platform.OS === 'web') {
        const storage = getWebStorage();
        if (storage) {
          storage.removeItem('auth_token');
        }
      } else {
        await SecureStore.deleteItemAsync('auth_token');
      }
      // Handle token expiration - redirect to login
    }
    return Promise.reject(error);
  }
);

export default api;
