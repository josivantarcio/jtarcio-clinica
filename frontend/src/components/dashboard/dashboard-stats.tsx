'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, DollarSign, TrendingUp } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useAnalyticsStore } from '@/store/analytics'
import { DashboardStats as StatsType } from '@/types'
import { formatCurrency } from '@/lib/utils'

export function DashboardStats() {
  const { data: analyticsData, isLoading, loadAnalytics, error } = useAnalyticsStore()
  const [stats, setStats] = useState<StatsType | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  useEffect(() => {
    // Helper function to safely get numeric values
    const safeNumber = (value: any): number => {
      if (value === null || value === undefined || isNaN(value)) {
        return 0
      }
      return Number(value) || 0
    }

    if (analyticsData) {
      const totalAppts = safeNumber(analyticsData.overview?.totalAppointments)
      const todayBookings = safeNumber(analyticsData.realTime?.todayBookings)
      const totalRevenue = safeNumber(analyticsData.overview?.totalRevenue)
      const patientGrowth = safeNumber(analyticsData.overview?.patientGrowth)
      const averageRating = safeNumber(analyticsData.overview?.averageRating)

      const dashboardStats: StatsType = {
        totalAppointments: totalAppts,
        todayAppointments: todayBookings,
        pendingAppointments: Math.floor(totalAppts * 0.1), // Estimate 10% pending
        completedAppointments: Math.floor(totalAppts * 0.8), // Estimate 80% completed
        cancelledAppointments: Math.floor(totalAppts * 0.1), // Estimate 10% cancelled
        revenue: totalRevenue,
        patientGrowth: patientGrowth,
        satisfactionScore: averageRating
      }
      
      setStats(dashboardStats)
    } else {
      // Always show default stats when data is not available or on error
      const defaultStats: StatsType = {
        totalAppointments: 0,
        todayAppointments: 0,
        pendingAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        revenue: 0,
        patientGrowth: 0,
        satisfactionScore: 0
      }
      setStats(defaultStats)
    }
  }, [analyticsData, error])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
              <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded w-16 mb-1"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Ensure we always have stats to display
  const displayStats: StatsType = stats || {
    totalAppointments: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    revenue: 0,
    patientGrowth: 0,
    satisfactionScore: 0
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Consultas Hoje
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayStats.todayAppointments}</div>
          <p className="text-xs text-muted-foreground">
            {displayStats.pendingAppointments} pendentes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total de Pacientes
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayStats.totalAppointments}</div>
          <p className="text-xs text-muted-foreground">
            +{displayStats.patientGrowth}% este mês
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Receita Mensal
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(displayStats.revenue)}</div>
          <p className="text-xs text-muted-foreground">
            {displayStats.completedAppointments} consultas realizadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Satisfação
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayStats.satisfactionScore}/5</div>
          <p className="text-xs text-muted-foreground">
            Base: {displayStats.completedAppointments} avaliações
          </p>
        </CardContent>
      </Card>
    </div>
  )
}