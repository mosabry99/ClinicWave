import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios';
import { notifications } from '@mantine/notifications';
import { t } from 'i18next';
import { jwtDecode } from 'jwt-decode';

// Define API response type for better typing
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Define error response type
export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
  error?: string;
}

// Request cancellation registry to prevent memory leaks
const cancelTokens: Record<string, CancelTokenSource> = {};

// Environment-specific configuration
const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': __APP_VERSION__,
    'X-Client-Platform': 'web',
  },
  withCredentials: true,
};

// Create axios instance with configuration
export const api: AxiosInstance = axios.create(apiConfig);

// Request interceptor for authentication and request preparation
api.interceptors.request.use(
  async (config) => {
    // Generate request ID for tracking
    const requestId = Math.random().toString(36).substring(2, 15);
    config.headers['X-Request-ID'] = requestId;

    // Add language header for internationalization
    const currentLanguage = localStorage.getItem('i18nextLng') || 'en';
    config.headers['Accept-Language'] = currentLanguage;

    // Create cancel token for this request
    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    
    // Store the cancel token with a key based on the request
    const cancelKey = `${config.method}-${config.url}-${requestId}`;
    cancelTokens[cancelKey] = source;
    
    // Clean up the cancel token when the request is complete
    const originalOnSuccess = config.onSuccess;
    config.onSuccess = function(response) {
      delete cancelTokens[cancelKey];
      if (originalOnSuccess) {
        return originalOnSuccess(response);
      }
      return response;
    };

    // Add timestamp to GET requests to prevent caching
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    // Add offline detection
    if (!navigator.onLine) {
      // For GET requests, we might want to return cached data
      // For non-GET requests, we should queue them for later or fail
      if (config.method?.toLowerCase() !== 'get') {
        throw new Error('No internet connection. Your changes will be saved when you go back online.');
      }
    }

    // Add clinic context if available
    const clinicId = localStorage.getItem('clinicwave_current_clinic');
    if (clinicId) {
      config.headers['X-Clinic-ID'] = clinicId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and response transformation
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Transform response data if needed
    if (response.data && typeof response.data === 'object') {
      // If the API returns data in a specific format, transform it here
      if (response.data.hasOwnProperty('data')) {
        return response;
      }
      
      // Otherwise, wrap the response in our standard format
      return {
        ...response,
        data: {
          data: response.data,
          success: true,
          message: response.statusText,
        },
      };
    }
    
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    // Handle request cancellation
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Handle offline mode
    if (!navigator.onLine) {
      notifications.show({
        title: t('No Internet Connection'),
        message: t('Please check your internet connection and try again.'),
        color: 'yellow',
      });
      
      return Promise.reject(error);
    }

    // Handle API errors
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle specific status codes
      switch (status) {
        case 400: // Bad Request
          if (data?.errors) {
            // Handle validation errors
            const validationErrors = Object.entries(data.errors)
              .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
              .join('; ');
            
            notifications.show({
              title: t('Validation Error'),
              message: validationErrors,
              color: 'red',
            });
          } else {
            notifications.show({
              title: t('Error'),
              message: data?.message || t('Invalid request. Please check your data.'),
              color: 'red',
            });
          }
          break;
          
        case 401: // Unauthorized
          // Auth token related errors are handled by the auth context
          // We don't show notifications for these as they're handled by the auth flow
          break;
          
        case 403: // Forbidden
          notifications.show({
            title: t('Access Denied'),
            message: data?.message || t('You do not have permission to perform this action.'),
            color: 'red',
          });
          break;
          
        case 404: // Not Found
          notifications.show({
            title: t('Not Found'),
            message: data?.message || t('The requested resource was not found.'),
            color: 'yellow',
          });
          break;
          
        case 409: // Conflict
          notifications.show({
            title: t('Conflict'),
            message: data?.message || t('There was a conflict with the current state of the resource.'),
            color: 'orange',
          });
          break;
          
        case 422: // Unprocessable Entity
          if (data?.errors) {
            // Handle validation errors
            const validationErrors = Object.entries(data.errors)
              .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
              .join('; ');
            
            notifications.show({
              title: t('Validation Error'),
              message: validationErrors,
              color: 'red',
            });
          } else {
            notifications.show({
              title: t('Validation Error'),
              message: data?.message || t('The provided data is invalid.'),
              color: 'red',
            });
          }
          break;
          
        case 429: // Too Many Requests
          notifications.show({
            title: t('Rate Limited'),
            message: t('You have made too many requests. Please try again later.'),
            color: 'yellow',
          });
          break;
          
        case 500: // Internal Server Error
        case 502: // Bad Gateway
        case 503: // Service Unavailable
        case 504: // Gateway Timeout
          notifications.show({
            title: t('Server Error'),
            message: t('An unexpected error occurred. Please try again later.'),
            color: 'red',
          });
          break;
          
        default:
          if (status >= 500) {
            notifications.show({
              title: t('Server Error'),
              message: t('An unexpected error occurred. Please try again later.'),
              color: 'red',
            });
          } else {
            notifications.show({
              title: t('Error'),
              message: data?.message || t('An error occurred. Please try again.'),
              color: 'red',
            });
          }
      }
    } else if (error.request) {
      // Request was made but no response was received
      notifications.show({
        title: t('Network Error'),
        message: t('No response from server. Please check your connection.'),
        color: 'yellow',
      });
    } else {
      // Something happened in setting up the request
      notifications.show({
        title: t('Error'),
        message: error.message || t('An error occurred while setting up the request.'),
        color: 'red',
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Cancel all pending requests
 */
export const cancelAllRequests = (message = 'Operation canceled by the user') => {
  Object.values(cancelTokens).forEach((source) => {
    source.cancel(message);
  });
};

/**
 * Cancel a specific request by URL pattern
 */
export const cancelRequest = (urlPattern: RegExp | string, message = 'Operation canceled by the user') => {
  Object.entries(cancelTokens).forEach(([key, source]) => {
    if (typeof urlPattern === 'string' ? key.includes(urlPattern) : urlPattern.test(key)) {
      source.cancel(message);
      delete cancelTokens[key];
    }
  });
};

/**
 * Create a cancel token for a request
 */
export const createCancelToken = () => {
  return axios.CancelToken.source();
};

/**
 * Check if a token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Get remaining time in seconds before token expires
 */
export const getTokenRemainingTime = (token: string): number => {
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    return Math.max(0, decoded.exp - currentTime);
  } catch (error) {
    return 0;
  }
};

/**
 * API service for making HTTP requests
 */
export const apiService = {
  /**
   * Make a GET request
   */
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.get<ApiResponse<T>>(url, config);
    return response.data.data;
  },
  
  /**
   * Make a POST request
   */
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },
  
  /**
   * Make a PUT request
   */
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },
  
  /**
   * Make a PATCH request
   */
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.patch<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },
  
  /**
   * Make a DELETE request
   */
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  },
  
  /**
   * Upload a file
   */
  upload: async <T = any>(url: string, file: File, onProgress?: (percentage: number) => void, config?: AxiosRequestConfig): Promise<T> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentage);
        }
      },
    });
    
    return response.data.data;
  },
  
  /**
   * Upload multiple files
   */
  uploadMultiple: async <T = any>(
    url: string, 
    files: File[], 
    fieldName = 'files',
    onProgress?: (percentage: number) => void, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(fieldName, file);
    });
    
    const response = await api.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentage);
        }
      },
    });
    
    return response.data.data;
  },
  
  /**
   * Download a file
   */
  download: async (url: string, filename?: string, config?: AxiosRequestConfig): Promise<void> => {
    const response = await api.get(url, {
      ...config,
      responseType: 'blob',
    });
    
    // Create a download link and trigger the download
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || getFilenameFromResponse(response) || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

/**
 * Extract filename from Content-Disposition header
 */
const getFilenameFromResponse = (response: AxiosResponse): string | null => {
  const contentDisposition = response.headers['content-disposition'];
  if (!contentDisposition) return null;
  
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1].replace(/['"]/g, '');
  }
  
  return null;
};

export default api;
