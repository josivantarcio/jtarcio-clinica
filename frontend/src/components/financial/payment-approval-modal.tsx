'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  FileText,
  User
} from "lucide-react"

interface PaymentApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  payable: {
    id: string
    description: string
    supplier: {
      name: string
      cnpj?: string
    }
    grossAmount: number
    discountAmount: number
    netAmount: number
    dueDate: string
    invoiceNumber?: string
    status: string
    category?: {
      name: string
    }
  } | null
  onApprove: (payableId: string, approvalData: ApprovalData) => Promise<void>
  onReject: (payableId: string, rejectionReason: string) => Promise<void>
  loading?: boolean
}

interface ApprovalData {
  approvedAmount?: number
  approvedDate: string
  paymentMethod?: string
  scheduledPaymentDate?: string
  approvalNotes?: string
}

export function PaymentApprovalModal({ 
  isOpen, 
  onClose, 
  payable, 
  onApprove, 
  onReject,
  loading = false 
}: PaymentApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [approvalData, setApprovalData] = useState<ApprovalData>({
    approvedDate: new Date().toISOString().split('T')[0],
    approvedAmount: payable?.netAmount || 0,
    paymentMethod: 'BANK_TRANSFER',
    scheduledPaymentDate: payable?.dueDate || new Date().toISOString().split('T')[0],
    approvalNotes: ''
  })
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const handleApprove = async () => {
    if (!payable || !action) return

    setSubmitting(true)
    try {
      await onApprove(payable.id, approvalData)
      handleClose()
    } catch (error) {
      console.error('Error approving payment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!payable || !rejectionReason.trim()) return

    setSubmitting(true)
    try {
      await onReject(payable.id, rejectionReason)
      handleClose()
    } catch (error) {
      console.error('Error rejecting payment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setAction(null)
    setRejectionReason('')
    setApprovalData({
      approvedDate: new Date().toISOString().split('T')[0],
      approvedAmount: payable?.netAmount || 0,
      paymentMethod: 'BANK_TRANSFER',
      scheduledPaymentDate: payable?.dueDate || new Date().toISOString().split('T')[0],
      approvalNotes: ''
    })
    onClose()
  }

  if (!payable) return null

  // Calculate days until due
  const daysUntilDue = Math.ceil(
    (new Date(payable.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Aprovação de Pagamento</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{payable.description}</h3>
              <Badge variant={payable.status === 'PENDING' ? 'secondary' : 'default'}>
                {payable.status === 'PENDING' ? 'Pendente' : payable.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">{payable.supplier.name}</p>
                  {payable.supplier.cnpj && (
                    <p className="text-sm text-gray-600">{payable.supplier.cnpj}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">{formatCurrency(payable.netAmount)}</p>
                  {payable.discountAmount > 0 && (
                    <p className="text-sm text-green-600">
                      Desconto: {formatCurrency(payable.discountAmount)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Vencimento: {formatDate(payable.dueDate)}</p>
                  <p className={`text-sm ${
                    daysUntilDue < 0 ? 'text-red-600' : 
                    daysUntilDue <= 3 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {daysUntilDue < 0 ? 
                      `${Math.abs(daysUntilDue)} dias em atraso` :
                      `${daysUntilDue} dias restantes`
                    }
                  </p>
                </div>
              </div>

              {payable.invoiceNumber && (
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">NF: {payable.invoiceNumber}</p>
                    {payable.category && (
                      <p className="text-sm text-gray-600">{payable.category.name}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Approval/Rejection Actions */}
          {!action && (
            <div className="flex space-x-4">
              <Button 
                onClick={() => setAction('approve')} 
                className="flex-1"
                size="lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Aprovar Pagamento
              </Button>
              <Button 
                onClick={() => setAction('reject')} 
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Rejeitar Pagamento
              </Button>
            </div>
          )}

          {/* Approval Form */}
          {action === 'approve' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <h3 className="font-semibold">Detalhes da Aprovação</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Valor Aprovado</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={approvalData.approvedAmount}
                    onChange={(e) => setApprovalData({
                      ...approvalData,
                      approvedAmount: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Data de Aprovação</label>
                  <Input
                    type="date"
                    value={approvalData.approvedDate}
                    onChange={(e) => setApprovalData({
                      ...approvalData,
                      approvedDate: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Método de Pagamento</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={approvalData.paymentMethod}
                    onChange={(e) => setApprovalData({
                      ...approvalData,
                      paymentMethod: e.target.value
                    })}
                  >
                    <option value="BANK_TRANSFER">Transferência Bancária</option>
                    <option value="CHECK">Cheque</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Data Programada do Pagamento</label>
                  <Input
                    type="date"
                    value={approvalData.scheduledPaymentDate}
                    onChange={(e) => setApprovalData({
                      ...approvalData,
                      scheduledPaymentDate: e.target.value
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Observações da Aprovação</label>
                <Textarea
                  placeholder="Observações sobre a aprovação (opcional)"
                  value={approvalData.approvalNotes}
                  onChange={(e) => setApprovalData({
                    ...approvalData,
                    approvalNotes: e.target.value
                  })}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {action === 'reject' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <h3 className="font-semibold">Motivo da Rejeição</h3>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <p className="text-red-700 font-medium">
                    Esta ação rejeitará permanentemente este pagamento
                  </p>
                </div>
                
                <Textarea
                  placeholder="Descreva o motivo da rejeição..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="border-red-200"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>

            {action === 'approve' && (
              <Button 
                onClick={handleApprove} 
                disabled={submitting || !approvalData.approvedAmount}
              >
                {submitting ? 'Aprovando...' : 'Confirmar Aprovação'}
              </Button>
            )}

            {action === 'reject' && (
              <Button 
                variant="destructive"
                onClick={handleReject} 
                disabled={submitting || !rejectionReason.trim()}
              >
                {submitting ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}