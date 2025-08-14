import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ApiResponse } from '@/types'

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken()
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  getToken(): string | null {
    if (this.token) return this.token
    
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      if (token) {
        this.token = token
        return token
      }
    }
    
    return null
  }

  async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config)
      return response.data
    } catch (error: any) {
      console.error('API request failed:', error)
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        }
      }
      
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error.message || 'Request failed'
        }
      }
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ accessToken: string; user: any }>({
      method: 'POST',
      url: '/api/v1/auth/login',
      data: { email, password }
    })
  }

  async register(userData: {
    name: string
    email: string
    password: string
    role: string
    cpf?: string
    phone?: string
  }) {
    return this.request<{ accessToken: string; user: any }>({
      method: 'POST',
      url: '/api/v1/auth/register',
      data: userData
    })
  }

  async getProfile() {
    return this.request<any>({
      method: 'GET',
      url: '/api/v1/auth/me'
    })
  }

  async refreshToken() {
    return this.request<{ token: string }>({
      method: 'POST',
      url: '/api/v1/auth/refresh'
    })
  }

  // Appointments
  async getAppointments(params?: any) {
    return this.request<any>({
      method: 'GET',
      url: '/api/v1/appointments',
      params
    })
  }

  async createAppointment(data: any) {
    return this.request<any>({
      method: 'POST',
      url: '/api/v1/appointments',
      data
    })
  }

  async getAppointment(id: string) {
    return this.request<any>({
      method: 'GET',
      url: `/api/v1/appointments/${id}`
    })
  }

  async rescheduleAppointment(id: string, data: any) {
    return this.request<any>({
      method: 'POST',
      url: `/api/v1/appointments/${id}/reschedule`,
      data
    })
  }

  async cancelAppointment(id: string, data: any) {
    return this.request<any>({
      method: 'POST',
      url: `/api/v1/appointments/${id}/cancel`,
      data
    })
  }

  async completeAppointment(id: string, data: any) {
    return this.request<any>({
      method: 'POST',
      url: `/api/v1/appointments/${id}/complete`,
      data
    })
  }

  // Specialties
  async getSpecialties() {
    return this.request<any[]>({
      method: 'GET',
      url: '/api/v1/specialties'
    })
  }

  // Users
  async getUsers(params?: any) {
    return this.request<any>({
      method: 'GET',
      url: '/api/v1/users',
      params
    })
  }

  async getPatients(params?: any) {
    return this.request<any[]>({
      method: 'GET',
      url: '/api/v1/users',
      params: { ...params, role: 'PATIENT' }
    })
  }

  async getDoctors(params?: any) {
    return this.request<any[]>({
      method: 'GET',
      url: '/api/v1/users',
      params: { ...params, role: 'DOCTOR' }
    })
  }

  async createDoctor(doctorData: {
    user: {
      name: string
      email: string
      password: string
      role: string
    }
    crm: string
    phone: string
    specialties: string[]
    experience?: string
    education?: string
    bio?: string
  }) {
    return this.request<any>({
      method: 'POST',
      url: '/api/v1/doctors',
      data: doctorData
    })
  }

  // Availability
  async getAvailability(doctorId?: string, date?: string) {
    return this.request<any>({
      method: 'GET',
      url: '/api/v1/availability',
      params: { doctorId, date }
    })
  }

  // AI Chat
  async sendChatMessage(message: string, conversationId?: string) {
    return this.request<any>({
      method: 'POST',
      url: '/api/v1/chat/message',
      data: { message, conversationId }
    })
  }

  async getChatHistory(conversationId: string) {
    return this.request<any>({
      method: 'GET',
      url: `/api/v1/chat/history/${conversationId}`
    })
  }

  // Analytics
  async getAnalytics(params?: {
    startDate?: string
    endDate?: string
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year'
  }) {
    return this.request<any>({
      method: 'GET',
      url: '/api/v1/analytics',
      params
    })
  }

  async getRevenueChart(params?: {
    period?: 'week' | 'month' | 'quarter' | 'year'
    granularity?: 'day' | 'week' | 'month'
  }) {
    return this.request<any>({
      method: 'GET',
      url: '/api/v1/analytics/revenue-chart',
      params
    })
  }

  // Generic HTTP methods
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      params
    })
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data
    })
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data
    })
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data
    })
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url
    })
  }
}

// Singleton instance
export const apiClient = new ApiClient()

// Initialize token from localStorage on client side
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('auth_token')
  if (token) {
    apiClient.setToken(token)
  }
}