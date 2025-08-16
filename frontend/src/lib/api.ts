import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ApiResponse } from '@/types'

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    // Em produção ou quando estiver no navegador, usa o proxy do Next.js
    // Em desenvolvimento no servidor, usa o backend direto
    const baseURL = typeof window !== 'undefined' 
      ? '' // Usa o proxy do Next.js (rotas /api/*)
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    
    console.log('🌐 Inicializando API Client com baseURL:', baseURL || 'proxy local')
    
    this.client = axios.create({
      baseURL,
      timeout: 15000, // Increased timeout
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: false, // Simplified for basic setup
    })

    // Tenta carregar token do localStorage na inicialização
    this.initializeToken()
    this.setupInterceptors()
  }

  private initializeToken() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      if (token) {
        this.token = token
        console.log('🔑 Token carregado automaticamente do localStorage:', token.substring(0, 20) + '...')
      } else {
        console.log('⚠️ Nenhum token encontrado no localStorage')
      }
    } else {
      console.log('🔧 Executando no servidor - localStorage não disponível')
    }
  }

  private setupInterceptors() {
    // Request interceptor to add auth token (optional for simple backend)
    this.client.interceptors.request.use(
      (config) => {
        // Only add auth header if we have a token
        if (this.token && this.token !== 'fake-jwt-token-for-testing') {
          config.headers.Authorization = `Bearer ${this.token}`
          console.log('🔐 Adding Authorization header to request')
        } else if (this.token === 'fake-jwt-token-for-testing') {
          console.log('🧪 Using fake token - skipping Authorization header for simple backend')
        } else {
          console.log('🔓 No token - proceeding without authentication')
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
          // Token expired or invalid - but only redirect if using real auth
          if (this.token && this.token !== 'fake-jwt-token-for-testing') {
            this.clearToken()
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login'
            }
          } else {
            console.log('🧪 401 error with fake token - ignoring redirect')
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
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        baseURL: this.client.defaults.baseURL,
        hasToken: !!this.token,
        headers: config.headers
      })
      
      const response = await this.client.request<ApiResponse<T>>(config)
      console.log(`✅ API Success: ${config.method?.toUpperCase()} ${config.url} - Status: ${response.status}`)
      return response.data
    } catch (error: any) {
      console.error(`❌ API request failed: ${config.method?.toUpperCase()} ${config.url}`)
      
      // Log detalhado do erro
      if (error.response) {
        console.error('📄 Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
          method: error.config?.method,
          requestHeaders: error.config?.headers
        })
      } else if (error.request) {
        console.error('📡 Network Error:', {
          message: 'No response received from server - check if backend is running',
          baseURL: this.client.defaults.baseURL,
          timeout: this.client.defaults.timeout,
          url: config.url,
          method: config.method,
          error: error.code
        })
      } else {
        console.error('⚙️ Request Setup Error:', {
          message: error.message,
          stack: error.stack,
          config: {
            url: config.url,
            method: config.method,
            baseURL: this.client.defaults.baseURL
          }
        })
      }
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        }
      }
      
      return {
        success: false,
        error: {
          code: error.code || 'REQUEST_FAILED',
          message: error.message || 'Request failed',
          details: {
            url: config.url,
            method: config.method,
            status: error.response?.status
          }
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

  async cancelAppointment(id: string, reason?: string) {
    return this.request<any>({
      method: 'PATCH',
      url: `/api/v1/appointments/${id}/cancel`,
      data: { reason }
    })
  }

  async updateAppointment(id: string, updateData: any) {
    return this.request<any>({
      method: 'PATCH',
      url: `/api/v1/appointments/${id}`,
      data: updateData
    })
  }

  // Doctor Availability
  async getDoctorAvailability(doctorId: string, date?: string) {
    return this.request<any[]>({
      method: 'GET',
      url: '/api/v1/availability',
      params: { doctorId, date }
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
  async getSpecialties(params?: { withActiveDoctors?: boolean; isActive?: boolean; search?: string }) {
    return this.request<any[]>({
      method: 'GET',
      url: '/api/v1/specialties',
      params
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

  async updateUser(id: string, updateData: any) {
    return this.request<any>({
      method: 'PATCH',
      url: `/api/v1/users/${id}`,
      data: updateData
    })
  }

  async createDoctor(doctorData: {
    user: {
      firstName: string
      lastName: string
      email: string
      password: string
      role: string
    }
    crm: string
    phone?: string
    cpf?: string
    specialtyId: string
    experience?: string
    education?: string
    bio?: string
    consultationFee?: string
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

  // Health check
  async healthCheck() {
    return this.request<{ status: string }>({
      method: 'GET',
      url: '/api/v1/health'
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