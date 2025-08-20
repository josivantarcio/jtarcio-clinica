'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, MessageCircle, Shield, Stethoscope } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, loadUser } = useAuthStore()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Hydrate the persisted store
    useAuthStore.persist.rehydrate()
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Verify user authentication when hydrated
    if (isHydrated && isAuthenticated) {
      loadUser().then(() => {
        // Only redirect if still authenticated after verification
        if (useAuthStore.getState().isAuthenticated) {
          router.push('/dashboard')
        }
      }).catch((error) => {
        // Handle loadUser errors gracefully in development
        console.warn('Failed to load user on homepage, but continuing...', error)
        if (process.env.NODE_ENV === 'development') {
          // In development, still redirect even if user loading failed
          router.push('/dashboard')
        }
      })
    }
  }, [isHydrated, isAuthenticated, loadUser, router])

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <span className="text-sm font-bold text-primary-foreground">EO</span>
            </div>
            <span className="font-bold text-lg">EO Clínica</span>
          </div>
          <div className="space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">Cadastrar</Link>
            </Button>
            {/* Debug buttons - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const { initDevelopmentMode } = useAuthStore.getState()
                    if (typeof initDevelopmentMode === 'function') {
                      initDevelopmentMode()
                      router.push('/dashboard')
                    } else {
                      // Fallback
                      useAuthStore.setState({
                        token: 'fake-jwt-token-for-testing',
                        user: {
                          id: 'dev-user-1',
                          firstName: 'Admin',
                          lastName: 'Developer',
                          email: 'admin@dev.local',
                          role: 'ADMIN',
                          isActive: true,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        },
                        isAuthenticated: true
                      })
                      router.push('/dashboard')
                    }
                  }}
                >
                  🧪 Dev Login
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.clear()
                      useAuthStore.persist.clearStorage()
                      window.location.reload()
                    }
                  }}
                >
                  🗑️ Limpar Cache
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Sistema de Agendamento
              <span className="text-primary block">Médico com IA</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Revolucione sua clínica com nosso sistema inteligente de agendamento. 
              IA integrada, automação completa e experiência superior para pacientes e médicos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/register">
                Começar Agora
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/login">
                Fazer Login
              </Link>
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pt-16">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Agendamento Inteligente</h3>
              <p className="text-sm text-muted-foreground">
                Sistema automatizado com IA para otimizar horários
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Chat com IA</h3>
              <p className="text-sm text-muted-foreground">
                Assistente virtual 24/7 para pacientes
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Portal Médico</h3>
              <p className="text-sm text-muted-foreground">
                Dashboard completo para gestão de pacientes
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Segurança LGPD</h3>
              <p className="text-sm text-muted-foreground">
                Conformidade total com proteção de dados
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>&copy; 2025 Jtarcio Desenvolvimento. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
