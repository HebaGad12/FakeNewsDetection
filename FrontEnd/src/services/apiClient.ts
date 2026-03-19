import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { API_BASE_URL, API_TIMEOUT } from "@/lib/constants";
import { clearAuthToken, getAuthToken } from "@/lib/authStorage";

/**
 * API Client - Base configuration for all API calls
 */
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor - Add auth token to requests
    this.client.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // If sending FormData, remove Content-Type header so axios sets it with boundary
        if (config.data instanceof FormData) {
          delete config.headers["Content-Type"];
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors globally
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Do NOT redirect if the request was to the login endpoint
          const isLoginRequest = error.config.url?.includes('/auth/login');
          if (!isLoginRequest) {
            clearAuthToken();
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  /**
   * GET request returning data + pagination headers
   */
  async getPaginated<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<{ data: T; totalCount: number; page: number; pageSize: number }> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return {
      data: response.data,
      totalCount: parseInt(response.headers["x-total-count"] || "0"),
      page: parseInt(response.headers["x-page"] || "1"),
      pageSize: parseInt(response.headers["x-page-size"] || "20"),
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;