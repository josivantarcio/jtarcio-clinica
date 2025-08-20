'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FinancialStatusBadge } from './financial-status-badge'
import { Eye, Edit, Trash } from 'lucide-react'

interface Transaction {
  id: string
  description?: string
  patient?: {
    firstName: string
    lastName: string
  }
  doctor?: {
    firstName: string
    lastName: string
  }
  transactionType: string
  netAmount: number
  status: string
  createdAt: string
  dueDate?: string
  paymentDate?: string
}

interface TransactionTableProps {
  transactions: Transaction[]
  loading?: boolean
  title?: string
  onView?: (transaction: Transaction) => void
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
  showActions?: boolean
}

export function TransactionTable({ 
  transactions, 
  loading = false, 
  title = "Transações",
  onView,
  onEdit,
  onDelete,
  showActions = true
}: TransactionTableProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between py-4 border-b">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 rounded ml-4"></div>
                  <div className="w-16 h-6 bg-gray-200 rounded ml-4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 py-2 px-4 bg-gray-50 rounded font-medium text-sm text-gray-600">
              <div className="col-span-3">Descrição</div>
              <div className="col-span-2">Cliente/Paciente</div>
              <div className="col-span-2">Valor</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Data</div>
              {showActions && <div className="col-span-1">Ações</div>}
            </div>

            {/* Rows */}
            {transactions.map((transaction) => (
              <div key={transaction.id} className="grid grid-cols-12 gap-4 py-3 px-4 border-b hover:bg-gray-50 transition-colors">
                <div className="col-span-3">
                  <p className="font-medium truncate">
                    {transaction.description || 'Transação Financeira'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {transaction.transactionType === 'RECEIPT' ? 'Recebimento' : 
                     transaction.transactionType === 'PAYMENT' ? 'Pagamento' : 
                     transaction.transactionType}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm">
                    {transaction.patient ? 
                      `${transaction.patient.firstName} ${transaction.patient.lastName}` : 
                      transaction.doctor ? 
                        `Dr. ${transaction.doctor.firstName} ${transaction.doctor.lastName}` :
                        'N/A'}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className={`font-medium ${
                    transaction.transactionType === 'RECEIPT' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(transaction.netAmount)}
                  </p>
                </div>

                <div className="col-span-2">
                  <FinancialStatusBadge status={transaction.status} />
                </div>

                <div className="col-span-2">
                  <p className="text-sm">
                    {transaction.paymentDate ? 
                      formatDate(transaction.paymentDate) : 
                      transaction.dueDate ? 
                        `Venc: ${formatDate(transaction.dueDate)}` : 
                        formatDate(transaction.createdAt)}
                  </p>
                </div>

                {showActions && (
                  <div className="col-span-1">
                    <div className="flex space-x-1">
                      {onView && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onView(transaction)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onEdit(transaction)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && transaction.status === 'PENDING' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onDelete(transaction)}
                          title="Excluir"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma transação encontrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}