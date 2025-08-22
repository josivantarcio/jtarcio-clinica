'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentAppointments } from '@/components/dashboard/recent-appointments'
import { UpcomingAppointments } from '@/components/dashboard/upcoming-appointments'
import { QuickActions } from '@/components/dashboard/quick-actions'

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // Hydrate the persisted store only once
    const unsubscribe = useAuthStore.persist.rehydrate()
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo, {user?.name}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'PATIENT' && 'Gerencie seus agendamentos e converse com nossa IA'}
            {user?.role === 'DOCTOR' && 'Sua agenda e pacientes do dia'}
            {user?.role === 'ADMIN' && 'Painel administrativo da clínica'}
            {user?.role === 'RECEPTIONIST' && 'Central de atendimento e agendamentos'}
          </p>
        </div>

        {/* Dashboard Content based on role */}
        {user?.role === 'PATIENT' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2">
              <UpcomingAppointments />
            </div>
            <QuickActions />
          </div>
        )}

        {(user?.role === 'DOCTOR' || user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST') && (
          <>
            <DashboardStats />
            <div className="grid gap-6 md:grid-cols-2">
              <UpcomingAppointments />
              <RecentAppointments />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}