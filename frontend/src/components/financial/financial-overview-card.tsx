'use client'

import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from 'lucide-react'

interface FinancialOverviewCardProps {
  title: string
  value: string
  growth?: number
  icon: LucideIcon
  color: string
  loading?: boolean
}

export function FinancialOverviewCard({ 
  title, 
  value, 
  growth, 
  icon: Icon, 
  color,
  loading = false 
}: FinancialOverviewCardProps) {
  const formatGrowth = (growth: number): string => {
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`
  }

  if (loading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {growth !== undefined && growth !== 0 && (
              <p className={`text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatGrowth(growth)} vs mês anterior
              </p>
            )}
          </div>
          <div className="p-3 rounded-full bg-gray-100">
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}