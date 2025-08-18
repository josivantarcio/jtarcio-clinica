'use client'

import * as React from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAIBookingSimulation } from '@/lib/ai-notifications'
import { toast } from '@/hooks/use-toast'

/**
 * Componente temporário para demonstrar agendamentos da IA
 * Será removido quando a integração real for implementada
 */
export function AIDemoButton() {
  const { simulateBooking } = useAIBookingSimulation()
  const [isSimulating, setIsSimulating] = React.useState(false)

  const handleSimulateBooking = async () => {
    setIsSimulating(true)
    
    // Simular delay de processamento da IA
    setTimeout(() => {
      const bookingData = simulateBooking()
      
      toast({
        title: '🤖 IA Simulada',
        description: `Agendamento simulado para ${bookingData.patientName} com ${bookingData.doctorName}`
      })
      
      setIsSimulating(false)
    }, 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSimulateBooking}
      disabled={isSimulating}
      className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100 text-blue-700 hover:text-blue-800"
    >
      {isSimulating ? (
        <>
          <Sparkles className="h-3 w-3 animate-spin" />
          <span className="text-xs">IA Processando...</span>
        </>
      ) : (
        <>
          <Bot className="h-3 w-3" />
          <span className="text-xs">Simular IA</span>
        </>
      )}
    </Button>
  )
}