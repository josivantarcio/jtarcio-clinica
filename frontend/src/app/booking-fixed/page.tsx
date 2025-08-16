import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, User, Stethoscope } from 'lucide-react'
import { BookingFormWithData } from '@/components/appointments/booking-form-with-data'

// Função para buscar especialidades no servidor
async function getActiveSpecialties() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const timestamp = Date.now()
    const response = await fetch(`${baseUrl}/api/v1/specialties?withActiveDoctors=true&_t=${timestamp}`, {
      cache: 'no-store', // Sempre buscar dados atualizados
      next: { revalidate: 0 } // Forçar revalidação
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data.success ? data.data : []
  } catch (error) {
    console.error('Erro ao buscar especialidades:', error)
    return []
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BookingFixedPage() {
  const specialties = await getActiveSpecialties()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">✅ Agendar Consulta (Versão Corrigida)</h1>
          <p className="text-muted-foreground">
            Sistema funcionando: {specialties.length} especialidade(s) disponível(is)
          </p>
        </div>

        {/* Process Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Como funciona o agendamento
            </CardTitle>
            <CardDescription>
              Siga os passos abaixo para agendar sua consulta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">1. Especialidade</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha a especialidade médica
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">2. Médico</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione o profissional
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">3. Data e Hora</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha o melhor horário
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">4. Confirmação</h3>
                <p className="text-sm text-muted-foreground">
                  Revise e confirme
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Especialidades encontradas:</strong> {specialties.length}</p>
              {specialties.map((specialty: any) => (
                <div key={specialty.id} className="p-2 bg-white rounded border">
                  <strong>{specialty.name}</strong> - {specialty.description}
                  <br />
                  <span className="text-xs text-gray-600">
                    Duração: {specialty.duration}min | Preço: R$ {specialty.price}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Suspense fallback={<div>Carregando formulário...</div>}>
          <BookingFormWithData initialSpecialties={specialties} />
        </Suspense>
      </div>
    </div>
  )
}