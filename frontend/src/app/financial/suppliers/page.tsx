'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash, 
  Phone, 
  Mail,
  MapPin,
  FileText,
  DollarSign,
  AlertCircle,
  Building,
  Calendar
} from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { api } from "@/lib/api"

interface Supplier {
  id: string
  name: string
  cnpj?: string
  cpf?: string
  email?: string
  phone?: string
  address?: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  category: 'MEDICAL_SUPPLIES' | 'EQUIPMENT' | 'SERVICES' | 'PHARMACEUTICALS' | 'TECHNOLOGY' | 'OTHERS'
  isActive: boolean
  contactPerson?: string
  paymentTerms?: string
  creditLimit?: number
  bankDetails?: {
    bank: string
    agency: string
    account: string
    accountType: string
  }
  notes?: string
  createdAt: string
  updatedAt: string
  _count?: {
    accountsPayable: number
  }
}

interface SupplierFilters {
  category?: string
  isActive?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export default function SuppliersPage() {
  const { user } = useAuthStore()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SupplierFilters>({
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

  const fetchSuppliers = async () => {
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

      const response = await api.get(`/financial/suppliers?${queryParams.toString()}`)
      
      if (response.data.success) {
        setSuppliers(response.data.data)
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalRecords(response.data.pagination?.total || 0)
      } else {
        throw new Error('Failed to load suppliers')
      }
    } catch (err: any) {
      console.error('Error loading suppliers:', err)
      setError(err.response?.data?.error || 'Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasFinancialAccess) {
      fetchSuppliers()
    }
  }, [filters, searchTerm, hasFinancialAccess])

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
      'MEDICAL_SUPPLIES': 'Materiais Médicos',
      'EQUIPMENT': 'Equipamentos',
      'SERVICES': 'Serviços',
      'PHARMACEUTICALS': 'Farmacêuticos',
      'TECHNOLOGY': 'Tecnologia',
      'OTHERS': 'Outros'
    }
    return labels[category] || category
  }

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'MEDICAL_SUPPLIES': 'bg-blue-100 text-blue-800',
      'EQUIPMENT': 'bg-green-100 text-green-800',
      'SERVICES': 'bg-purple-100 text-purple-800',
      'PHARMACEUTICALS': 'bg-red-100 text-red-800',
      'TECHNOLOGY': 'bg-indigo-100 text-indigo-800',
      'OTHERS': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const toggleSupplierStatus = async (supplierId: string, currentStatus: boolean) => {
    try {
      await api.put(`/financial/suppliers/${supplierId}`, { 
        isActive: !currentStatus 
      })
      fetchSuppliers() // Refresh the list
    } catch (err) {
      console.error('Error updating supplier status:', err)
      setError('Erro ao atualizar status do fornecedor')
    }
  }

  if (!hasFinancialAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600">Você não tem permissão para acessar os fornecedores.</p>
        </div>
      </div>
    )
  }

  // Calculate summary stats
  const activeSuppliers = suppliers.filter(s => s.isActive).length
  const inactiveSuppliers = suppliers.filter(s => !s.isActive).length
  const totalPayables = suppliers.reduce((sum, s) => sum + (s._count?.accountsPayable || 0), 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600">Gerencie fornecedores e prestadores de serviços</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Relatório
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{activeSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Building className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inativos</p>
                <p className="text-2xl font-bold text-gray-900">{inactiveSuppliers}</p>
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
                <p className="text-sm font-medium text-gray-600">Contas a Pagar</p>
                <p className="text-2xl font-bold text-gray-900">{totalPayables}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
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
                  placeholder="Buscar por nome, CNPJ ou email..."
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
              <option value="MEDICAL_SUPPLIES">Materiais Médicos</option>
              <option value="EQUIPMENT">Equipamentos</option>
              <option value="SERVICES">Serviços</option>
              <option value="PHARMACEUTICALS">Farmacêuticos</option>
              <option value="TECHNOLOGY">Tecnologia</option>
              <option value="OTHERS">Outros</option>
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

      {/* Suppliers Grid */}
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
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchSuppliers} className="mt-4">
              Tentar Novamente
            </Button>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum fornecedor encontrado</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Fornecedor
            </Button>
          </div>
        ) : (
          suppliers.map((supplier) => (
            <Card 
              key={supplier.id}
              className={`hover:shadow-md transition-shadow ${!supplier.isActive ? 'opacity-70 bg-gray-50' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg truncate">{supplier.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getCategoryColor(supplier.category)}>
                        {getCategoryLabel(supplier.category)}
                      </Badge>
                      <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                        {supplier.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3">
                {/* Contact Info */}
                <div className="space-y-2">
                  {(supplier.cnpj || supplier.cpf) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-2" />
                      {supplier.cnpj || supplier.cpf}
                    </div>
                  )}
                  
                  {supplier.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  
                  {supplier.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {supplier.phone}
                    </div>
                  )}
                  
                  {supplier.address && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="truncate">
                        {supplier.address.city}, {supplier.address.state}
                      </span>
                    </div>
                  )}
                </div>

                {/* Financial Info */}
                {supplier.creditLimit && (
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Limite de Crédito</span>
                    <span className="font-medium">{formatCurrency(supplier.creditLimit)}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">Contas a Pagar</span>
                  <span className="font-medium text-blue-800">
                    {supplier._count?.accountsPayable || 0}
                  </span>
                </div>

                {/* Contact Person */}
                {supplier.contactPerson && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Contato:</span> {supplier.contactPerson}
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
                      onClick={() => toggleSupplierStatus(supplier.id, supplier.isActive)}
                      className={supplier.isActive ? 'text-red-600' : 'text-green-600'}
                    >
                      {supplier.isActive ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Building className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {formatDate(supplier.createdAt)}
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
            Página {filters.page} de {totalPages} ({totalRecords} fornecedores)
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
  )
}