'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash, 
  Shield,
  Phone,
  Mail,
  Percent,
  DollarSign,
  Users,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft
} from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { api } from "@/lib/api"

interface InsurancePlan {
  id: string
  name: string
  category: 'HEALTH' | 'DENTAL' | 'VISION' | 'MIXED'
  contractNumber?: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  coveragePercentage: number
  copaymentAmount?: number
  isActive: boolean
  requiresAuthorization: boolean
  authorizationWorkflow?: {
    requiresPriorAuth: boolean
    authValidityDays: number
    maxAttemptsPerAuth: number
  }
  paymentTerms?: string
  processingTime?: number
  notes?: string
  createdAt: string
  updatedAt: string
  _count?: {
    financialTransactions: number
    authorizations: number
  }
}

interface InsuranceFilters {
  category?: string
  isActive?: boolean
  requiresAuthorization?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export default function InsurancePage() {
  const { user } = useAuthStore()
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<InsuranceFilters>({
    page: 1,
    limit: 50,
    sortBy: 'name',
    sortOrder: 'asc',
    isActive: true
  })
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Check if user has financial access
  const hasFinancialAccess = user?.role === 'ADMIN' || user?.role === 'FINANCIAL_MANAGER'

  const fetchInsurancePlans = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const queryParams = new URLSearchParams()
      
      // Add filters to query
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      if (searchTerm) {
        queryParams.append('search', searchTerm)
      }

      const response = await api.get(`/api/v1/financial/insurance?${queryParams.toString()}`)
      
      if (response && response.success === true) {
        setInsurancePlans(response.data || [])
        setTotalPages(response.pagination?.totalPages || 1)
        setTotalRecords(response.pagination?.total || 0)
      } else {
        throw new Error(response.error || 'Failed to load insurance plans')
      }
    } catch (err: any) {
      console.error('Error loading insurance plans:', err)
      setError(err.response?.data?.error || 'Erro ao carregar planos de convênio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasFinancialAccess) {
      fetchInsurancePlans()
    }
  }, [filters, searchTerm, hasFinancialAccess])

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  const formatCurrency = (value?: number): string => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'HEALTH': 'Saúde',
      'DENTAL': 'Odontológico',
      'VISION': 'Oftalmológico',
      'MIXED': 'Misto'
    }
    return labels[category] || category
  }

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'HEALTH': 'bg-green-100 text-green-800',
      'DENTAL': 'bg-blue-100 text-blue-800',
      'VISION': 'bg-purple-100 text-purple-800',
      'MIXED': 'bg-indigo-100 text-indigo-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const toggleInsuranceStatus = async (insuranceId: string, currentStatus: boolean) => {
    try {
      await api.put(`/financial/insurance/${insuranceId}`, { 
        isActive: !currentStatus 
      })
      fetchInsurancePlans() // Refresh the list
    } catch (err) {
      console.error('Error updating insurance plan status:', err)
      setError('Erro ao atualizar status do plano de convênio')
    }
  }

  if (!hasFinancialAccess) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
            <p className="text-gray-600">Você não tem permissão para acessar os planos de convênio.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Calculate summary stats
  const activePlans = insurancePlans.filter(p => p.isActive).length
  const inactivePlans = insurancePlans.filter(p => !p.isActive).length
  const totalTransactions = insurancePlans.reduce((sum, p) => sum + (p._count?.financialTransactions || 0), 0)
  const avgCoverage = insurancePlans.length > 0 
    ? insurancePlans.reduce((sum, p) => sum + p.coveragePercentage, 0) / insurancePlans.length 
    : 0

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/financial'}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Financeiro
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Planos de Convênio</h1>
            <p className="text-gray-600">Gerencie planos de saúde e convênios médicos</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Relatório
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Planos Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{activePlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Shield className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Planos Inativos</p>
                <p className="text-2xl font-bold text-gray-900">{inactivePlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transações</p>
                <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Percent className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cobertura Média</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(avgCoverage)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, contrato ou contato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select 
              className="px-3 py-2 border rounded-md"
              value={filters.category || ''}
              onChange={(e) => setFilters({...filters, category: e.target.value || undefined})}
            >
              <option value="">Todas as categorias</option>
              <option value="HEALTH">Saúde</option>
              <option value="DENTAL">Odontológico</option>
              <option value="VISION">Oftalmológico</option>
              <option value="MIXED">Misto</option>
            </select>

            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={showInactive}
                onChange={(e) => {
                  setShowInactive(e.target.checked)
                  setFilters({...filters, isActive: e.target.checked ? undefined : true})
                }}
              />
              <span className="text-sm">Incluir inativos</span>
            </label>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insurance Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="flex space-x-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : error ? (
          <div className="col-span-full text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchInsurancePlans} className="mt-4">
              Tentar Novamente
            </Button>
          </div>
        ) : insurancePlans.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum plano de convênio encontrado</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Plano
            </Button>
          </div>
        ) : (
          insurancePlans.map((plan) => (
            <Card 
              key={plan.id}
              className={`hover:shadow-md transition-shadow ${!plan.isActive ? 'opacity-70 bg-gray-50' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg truncate">{plan.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getCategoryColor(plan.category)}>
                        {getCategoryLabel(plan.category)}
                      </Badge>
                      <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                        {plan.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {plan.requiresAuthorization && (
                        <Badge variant="outline">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Autorização
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3">
                {/* Contract Info */}
                {plan.contractNumber && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    Contrato: {plan.contractNumber}
                  </div>
                )}

                {/* Coverage */}
                <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Cobertura</span>
                  <span className="font-bold text-green-800">
                    {formatPercentage(plan.coveragePercentage)}
                  </span>
                </div>

                {/* Copayment */}
                {plan.copaymentAmount && (
                  <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-700">Copagamento</span>
                    <span className="font-medium text-blue-800">
                      {formatCurrency(plan.copaymentAmount)}
                    </span>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2">
                  {plan.contactPerson && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      {plan.contactPerson}
                    </div>
                  )}
                  
                  {plan.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {plan.phone}
                    </div>
                  )}
                  
                  {plan.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="truncate">{plan.email}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="py-2 px-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Transações</p>
                    <p className="font-medium">{plan._count?.financialTransactions || 0}</p>
                  </div>
                  <div className="py-2 px-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Autorizações</p>
                    <p className="font-medium">{plan._count?.authorizations || 0}</p>
                  </div>
                </div>

                {/* Processing Time */}
                {plan.processingTime && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Processamento: {plan.processingTime} dias
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => toggleInsuranceStatus(plan.id, plan.isActive)}
                      className={plan.isActive ? 'text-red-600' : 'text-green-600'}
                    >
                      {plan.isActive ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {formatDate(plan.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <Button 
            variant="outline" 
            disabled={filters.page === 1}
            onClick={() => setFilters({...filters, page: (filters.page || 1) - 1})}
          >
            Anterior
          </Button>
          <span>
            Página {filters.page} de {totalPages} ({totalRecords} planos)
          </span>
          <Button 
            variant="outline"
            disabled={filters.page === totalPages}
            onClick={() => setFilters({...filters, page: (filters.page || 1) + 1})}
          >
            Próxima
          </Button>
        </div>
      )}
      </div>
    </AppLayout>
  )
}