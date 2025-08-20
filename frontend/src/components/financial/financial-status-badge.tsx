'use client'

import React from 'react'
import { Badge } from "@/components/ui/badge"

interface FinancialStatusBadgeProps {
  status: string
  type?: 'transaction' | 'payable'
}

export function FinancialStatusBadge({ status, type = 'transaction' }: FinancialStatusBadgeProps) {
  const getVariantAndText = () => {
    switch (status) {
      case 'PAID':
        return { variant: 'default', text: 'Pago' }
      case 'PENDING':
        return { variant: 'secondary', text: 'Pendente' }
      case 'CONFIRMED':
        return { variant: 'outline', text: 'Confirmado' }
      case 'PARTIAL':
        return { variant: 'secondary', text: 'Parcial' }
      case 'OVERDUE':
        return { variant: 'destructive', text: 'Em Atraso' }
      case 'CANCELLED':
        return { variant: 'outline', text: 'Cancelado' }
      case 'REFUNDED':
        return { variant: 'secondary', text: 'Reembolsado' }
      case 'APPROVED':
        return { variant: 'default', text: 'Aprovado' }
      case 'REJECTED':
        return { variant: 'destructive', text: 'Rejeitado' }
      default:
        return { variant: 'secondary', text: status }
    }
  }

  const { variant, text } = getVariantAndText()

  return (
    <Badge variant={variant as any}>
      {text}
    </Badge>
  )
}