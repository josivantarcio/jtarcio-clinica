'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash, 
  Download,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { api } from "@/lib/api"
import { FinancialStatusBadge } from "@/components/financial/financial-status-badge"

interface AccountsPayable {
  id: string
  supplierId: string
  supplier: {
    name: string
    cnpj?: string
  }
  category: {
    name: string
    type: string
  }
  description: string
  grossAmount: number
  discountAmount: number
  netAmount: number
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'
  dueDate: string
  paymentDate?: string
  invoiceNumber?: string
  createdAt: string
  updatedAt: string
}

interface PayablesFilters {
  supplierId?: string
  status?: string
  dueDateFrom?: string
  dueDateTo?: string
  categoryId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export default function PayablesPage() {
  const { user } = useAuthStore()
  const [payables, setPayables] = useState<AccountsPayable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PayablesFilters>({
    page: 1,
    limit: 50,
    sortBy: 'dueDate',
    sortOrder: 'asc'
  })
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  // Check if user has financial access
  const hasFinancialAccess = user?.role === 'ADMIN' || user?.role === 'FINANCIAL_MANAGER'

  const fetchPayables = async () => {
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

      const response = await api.get(`/financial/payables?${queryParams.toString()}`)
      
      if (response.data.success) {
        setPayables(response.data.data)
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalRecords(response.data.pagination?.total || 0)
      } else {
        throw new Error('Failed to load payables')
      }
    } catch (err: any) {
      console.error('Error loading payables:', err)
      setError(err.response?.data?.error || 'Erro ao carregar contas a pagar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasFinancialAccess) {
      fetchPayables()
    }
  }, [filters, hasFinancialAccess])

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const handleStatusChange = async (payableId: string, newStatus: string) => {
    try {
      await api.put(`/financial/payables/${payableId}`, { status: newStatus })
      fetchPayables() // Refresh the list
    } catch (err) {
      console.error('Error updating payable status:', err)
      setError('Erro ao atualizar status do pagamento')
    }
  }

  const handleApprove = (payableId: string) => {
    handleStatusChange(payableId, 'APPROVED')
  }

  const handlePay = (payableId: string) => {
    handleStatusChange(payableId, 'PAID')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PENDING':
        return <Calendar className="h-4 w-4 text-yellow-500" />
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
  }

  if (!hasFinancialAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600">Você não tem permissão para acessar as contas a pagar.</p>
        </div>
      </div>
    )
  }

  // Calculate summary stats
  const pendingAmount = payables
    .filter(p => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.netAmount, 0)
    
  const overduePayables = payables.filter(p => 
    p.status !== 'PAID' && getDaysUntilDue(p.dueDate) < 0
  )
  
  const approvedAmount = payables
    .filter(p => p.status === 'APPROVED')
    .reduce((sum, p) => sum + p.netAmount, 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas a Pagar</h1>
          <p className="text-gray-600">Gerencie pagamentos e fornecedores da clínica</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(pendingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aprovados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(approvedAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Em Atraso</p>
                <p className="text-2xl font-bold text-red-600">
                  {overduePayables.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
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
                  placeholder="Buscar por fornecedor, descrição ou número da nota..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select 
              className="px-3 py-2 border rounded-md"
              value={filters.status || ''}
              onChange={(e) => setFilters({...filters, status: e.target.value || undefined})}
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="APPROVED">Aprovado</option>
              <option value="PAID">Pago</option>
              <option value="REJECTED">Rejeitado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payables Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas a Pagar</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Carregando contas a pagar...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <Button onClick={fetchPayables} className="mt-4">
                Tentar Novamente
              </Button>
            </div>
          ) : payables.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma conta a pagar encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Fornecedor</th>
                    <th className="text-left py-3 px-4 font-medium">Descrição</th>
                    <th className="text-left py-3 px-4 font-medium">Valor</th>
                    <th className="text-left py-3 px-4 font-medium">Vencimento</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((payable) => {
                    const daysUntilDue = getDaysUntilDue(payable.dueDate)
                    const isOverdue = daysUntilDue < 0 && payable.status !== 'PAID'
                    
                    return (
                      <tr 
                        key={payable.id} 
                        className={`border-b hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{payable.supplier.name}</p>
                            {payable.supplier.cnpj && (
                              <p className="text-sm text-gray-500">{payable.supplier.cnpj}</p>
                            )}
                          </div>
                        </td>
                        
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{payable.description}</p>
                            {payable.invoiceNumber && (
                              <p className="text-sm text-gray-500">NF: {payable.invoiceNumber}</p>
                            )}
                          </div>
                        </td>
                        
                        <td className="py-3 px-4">
                          <p className="font-medium">{formatCurrency(payable.netAmount)}</p>
                          {payable.discountAmount > 0 && (
                            <p className="text-sm text-green-600">
                              Desc: {formatCurrency(payable.discountAmount)}
                            </p>
                          )}
                        </td>
                        
                        <td className="py-3 px-4">
                          <p className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {formatDate(payable.dueDate)}
                          </p>
                          {isOverdue && (
                            <p className="text-xs text-red-500">
                              {Math.abs(daysUntilDue)} dias em atraso
                            </p>
                          )}
                          {daysUntilDue >= 0 && daysUntilDue <= 7 && payable.status !== 'PAID' && (
                            <p className="text-xs text-yellow-600">
                              Vence em {daysUntilDue} dias
                            </p>
                          )}
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(payable.status)}
                            <FinancialStatusBadge status={payable.status} type="payable" />
                          </div>
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {payable.status === 'PENDING' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleApprove(payable.id)}
                                  title="Aprovar"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            {payable.status === 'APPROVED' && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handlePay(payable.id)}
                                title="Marcar como Pago"
                              >
                                <DollarSign className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            
                            {(payable.status === 'PENDING' || payable.status === 'APPROVED') && (
                              <Button size="sm" variant="ghost">
                                <Trash className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
            Página {filters.page} de {totalPages}
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