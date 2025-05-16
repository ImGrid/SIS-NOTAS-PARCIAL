import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // Added JWT decoding for token validation

// Configuration constants
const API_CONFIG = {
  BASE_URL: determinaBaseUrl(),
  TIMEOUT: 10000, // 10 seconds timeout
  CONTENT_TYPE: 'application/json',
};

function determinaBaseUrl() {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  const currentHost = window.location.hostname;
  //cambiar en produccion por la ip publica localhost=ip_publica o dominio
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://localhost:4000';
  } 
  else {
    return `http://${currentHost}:4000`;
  }
}

// Custom error handler
class ApiError extends Error {
  constructor(message, status, originalError = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.originalError = originalError;
  }
}

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': API_CONFIG.CONTENT_TYPE,
  },
});

// Log the base URL for debugging purposes
console.log('API Base URL:', API_CONFIG.BASE_URL);

// Request interceptor with advanced token management
api.interceptors.request.use(
  (config) => {
    // Retrieve and validate token
    const token = sessionStorage.getItem('token');
    
    if (token) {
      try {
        // Decode token to check expiration
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        // Check if token is expired
        if (decodedToken.exp < currentTime) {
          // Token expired, clear session and redirect to login
          sessionStorage.removeItem('token');
          window.location.href = '/login'; // Adjust redirect path as needed
          return Promise.reject(new ApiError('Token expired', 401));
        }
        
        // Add token to Authorization header
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        // Invalid token format
        sessionStorage.removeItem('token');
        return Promise.reject(new ApiError('Invalid token', 401, error));
      }
    }
    
    return config;
  },
  (error) => Promise.reject(new ApiError('Request setup failed', 500, error))
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response, // Simply return successful responses
  (error) => {
    // Check if we should silently handle this error
    const config = error.config || {};
    const silentErrors = config.silentErrors || false;
    const silentErrorCodes = config.silentErrorCodes || [];
    
    // If this is a silent error or a specifically silenced error code, don't log it
    const shouldSilence = silentErrors || 
                         (error.response && silentErrorCodes.includes(error.response.status));
    
    // Centralized error handling
    if (error.response) {
      // The request was made and the server responded with a status code
      if (!shouldSilence) {
        switch (error.response.status) {
          case 400:
            console.error('Bad Request:', error.response.data);
            break;
          case 401:
            // Unauthorized - potentially redirect to login
            window.location.href = '/login';
            break;
          case 403:
            console.error('Forbidden:', error.response.data);
            break;
          case 404:
            console.error('Not Found:', error.response.data);
            break;
          case 500:
            console.error('Server Error:', error.response.data);
            break;
          default:
            console.error('Unexpected Error:', error.response.data);
        }
      }
      
      return Promise.reject(
        new ApiError(
          error.response.data.message || 'An error occurred', 
          error.response.status, 
          error.response
        )
      );
    } else if (error.request) {
      // The request was made but no response was received
      if (!shouldSilence) {
        console.error('No response received:', error.request);
      }
      return Promise.reject(new ApiError('No server response', 0, error));
    } else {
      // Something happened in setting up the request
      if (!shouldSilence) {
        console.error('Error setting up request:', error.message);
      }
      return Promise.reject(new ApiError('Request setup failed', 500, error));
    }
  }
);
// Utility methods for different HTTP methods with error handling
api.fetchData = async (url, params = {}) => {
  try {
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    console.error(`Fetch failed for ${url}:`, error);
    throw error;
  }
};

api.createResource = async (url, data) => {
  try {
    const response = await api.post(url, data);
    return response.data;
  } catch (error) {
    console.error(`Create failed for ${url}:`, error);
    throw error;
  }
};

api.updateResource = async (url, data) => {
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error) {
    console.error(`Update failed for ${url}:`, error);
    throw error;
  }
};

// Método DELETE con opción silenciosa
api.deleteSilent = async (url, options = {}) => {
  try {
    return await api.delete(url, { 
      ...options, 
      silentErrors: true,
      silentErrorCodes: [404, ...((options.silentErrorCodes || []))]
    });
  } catch (error) {
    // Procesar como un éxito en lugar de error para 404
    if (error.status === 404) {
      return { data: { success: true, message: "Recurso no encontrado o ya eliminado" } };
    }
    throw error;
  }
};
export default {
  ...api,
  getSilent: api.getSilent,
  deleteSilent: api.deleteSilent
};