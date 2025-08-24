'use client'

import { useAuthStore } from '@/store/auth'
import { AuthGuard } from '@/components/auth/auth-guard'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentAppointments } from '@/components/dashboard/recent-appointments'
import { UpcomingAppointments } from '@/components/dashboard/upcoming-appointments'
import { QuickActions } from '@/components/dashboard/quick-actions'

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <AuthGuard>
      <AppLayout>
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Bem-vindo, {user?.firstName || user?.name}
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
    </AuthGuard>
  )
}