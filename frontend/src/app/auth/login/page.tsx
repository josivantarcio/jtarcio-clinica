'use client'

import { LoginForm } from '@/components/forms/login-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <span className="text-xl font-bold text-primary-foreground">EO</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            EO Clínica
          </h1>
          <p className="text-muted-foreground">
            Sistema de Agendamento Médico com IA
          </p>
        </div>

        {/* Login Form */}
        <LoginForm onSuccess={() => router.push('/dashboard')} />

        {/* Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Não possui uma conta?{' '}
            <Link 
              href="/auth/register" 
              className="font-medium text-primary hover:underline"
            >
              Cadastre-se
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Esqueceu sua senha?{' '}
            <Link 
              href="/auth/forgot-password" 
              className="font-medium text-primary hover:underline"
            >
              Recuperar senha
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}