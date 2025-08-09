'use client'

import { RegisterForm } from '@/components/forms/register-form'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RegisterPage() {
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
            Criar Conta
          </h1>
          <p className="text-muted-foreground">
            Crie sua conta no EO Clínica
          </p>
        </div>

        {/* Register Form */}
        <RegisterForm onSuccess={() => router.push('/dashboard')} />

        {/* Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Já possui uma conta?{' '}
            <Link 
              href="/auth/login" 
              className="font-medium text-primary hover:underline"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}