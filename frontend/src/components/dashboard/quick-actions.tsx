'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MessageCircle, User, Phone, Clock, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export function QuickActions() {
  const router = useRouter()
  const { user } = useAuthStore()
  
  const actions = {
    PATIENT: [
      {
        title: 'Agendar Consulta',
        description: 'Agende uma nova consulta',
        icon: Calendar,
        href: '/appointments/new',
        color: 'primary'
      },
      {
        title: 'Chat com IA',
        description: 'Fale com nossa assistente virtual',
        icon: MessageCircle,
        href: '/chat',
        color: 'secondary'
      },
      {
        title: 'Meu Perfil',
        description: 'Visualizar e editar perfil',
        icon: User,
        href: '/profile',
        color: 'outline'
      }
    ],
    DOCTOR: [
      {
        title: 'Próximo Paciente',
        description: 'Ver próxima consulta',
        icon: Clock,
        href: '/appointments/next',
        color: 'primary'
      },
      {
        title: 'Lista de Pacientes',
        description: 'Gerenciar pacientes',
        icon: User,
        href: '/patients',
        color: 'secondary'
      },
      {
        title: 'Relatórios',
        description: 'Visualizar relatórios',
        icon: FileText,
        href: '/reports',
        color: 'outline'
      }
    ],
    ADMIN: [
      {
        title: 'Gerenciar Usuários',
        description: 'Adicionar e gerenciar usuários',
        icon: User,
        href: '/admin/users',
        color: 'primary'
      },
      {
        title: 'Configurações',
        description: 'Configurações da clínica',
        icon: FileText,
        href: '/settings',
        color: 'secondary'
      }
    ],
    RECEPTIONIST: [
      {
        title: 'Novo Agendamento',
        description: 'Agendar para paciente',
        icon: Calendar,
        href: '/appointments/new',
        color: 'primary'
      },
      {
        title: 'Atendimento',
        description: 'Central de atendimento',
        icon: Phone,
        href: '/reception',
        color: 'secondary'
      },
      {
        title: 'Lista de Espera',
        description: 'Gerenciar lista de espera',
        icon: Clock,
        href: '/waitlist',
        color: 'outline'
      }
    ]
  }

  const userActions = actions[user?.role as keyof typeof actions] || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
        <CardDescription>
          Acesse as funcionalidades principais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {userActions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button
              key={index}
              variant={action.color as any}
              className="w-full justify-start h-auto p-4"
              onClick={() => router.push(action.href)}
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm opacity-70">{action.description}</p>
                </div>
              </div>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}