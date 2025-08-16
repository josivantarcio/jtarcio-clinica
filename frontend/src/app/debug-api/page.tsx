'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

export default function DebugApiPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testSpecialtiesAPI = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🧪 Testando API de especialidades...')
      
      // Teste 1: Todas as especialidades
      const allSpecialties = await apiClient.getSpecialties({ isActive: true })
      console.log('📋 Todas especialidades:', allSpecialties)
      
      // Teste 2: Especialidades com médicos ativos
      const activeDoctorSpecialties = await apiClient.getSpecialties({ 
        isActive: true, 
        withActiveDoctors: true 
      })
      console.log('👨‍⚕️ Especialidades com médicos ativos:', activeDoctorSpecialties)
      
      setResult({
        allSpecialties,
        activeDoctorSpecialties
      })
    } catch (err: any) {
      console.error('❌ Erro no teste:', err)
      setError(err.message || 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testSpecialtiesAPI()
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Debug API - Especialidades</h1>
        
        <button 
          onClick={testSpecialtiesAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Testando...' : 'Testar API Novamente'}
        </button>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 rounded">
            <h2 className="text-red-800 font-bold">Erro:</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="p-4 bg-green-100 border border-green-400 rounded">
              <h2 className="text-green-800 font-bold">✅ Todas as Especialidades ({result.allSpecialties?.data?.length || 0})</h2>
              <pre className="text-sm overflow-auto bg-white p-2 rounded mt-2">
                {JSON.stringify(result.allSpecialties, null, 2)}
              </pre>
            </div>

            <div className="p-4 bg-blue-100 border border-blue-400 rounded">
              <h2 className="text-blue-800 font-bold">👨‍⚕️ Especialidades com Médicos Ativos ({result.activeDoctorSpecialties?.data?.length || 0})</h2>
              <pre className="text-sm overflow-auto bg-white p-2 rounded mt-2">
                {JSON.stringify(result.activeDoctorSpecialties, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}